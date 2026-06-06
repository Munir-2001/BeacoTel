import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ANCHORS } from "@/lib/positioning/trace";

/**
 * BLE ingestion endpoint. The Raspberry-Pi gateway POSTs a batch of RSSI
 * readings per beacon → we compute the latest position with a single-frame
 * RSSI-weighted centroid (linear-power space) and:
 *
 *  1. UPSERT `beacon_live_positions` (one row per beacon, drives the Live map)
 *  2. INSERT `beacon_position_history` if the beacon moved more than
 *     MIN_HISTORY_DISTANCE viewBox units since its last logged position
 *     (drives the heatmap; keeps history sparse instead of one row per packet)
 *
 * The route is allow-listed in `proxy-session.ts` so it stays reachable
 * without a Supabase auth cookie — the bearer-token check below is the gate.
 *
 * Writes go through the service-role client so we don't depend on the
 * permissive RLS policies seeded in 0009 (those can be tightened later
 * without changing this code).
 */

type Signal = {
  beacon_id: number;
  receiver_id: number;
  rssi: number;
};

type Batch = {
  device_id?: string;
  timestamp?: string;
  signals: Signal[];
};

const RSSI_FLOOR = -92;
/** A beacon must move at least this many viewBox units before we log it. */
const MIN_HISTORY_DISTANCE = 0.3;

export async function POST(request: Request) {
  // Optional device-token check. If BLE_INGEST_TOKEN is set in the env, the
  // request must carry a matching `Authorization: Bearer <token>` header.
  // In dev we leave it unset → open ingest, easier to curl-test.
  const requiredToken = process.env.BLE_INGEST_TOKEN;
  if (requiredToken) {
    const auth = request.headers.get("authorization") ?? "";
    const ok = auth.replace(/^Bearer\s+/i, "") === requiredToken;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Batch;
  try {
    body = (await request.json()) as Batch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.signals)) {
    return NextResponse.json(
      { error: "`signals` array required" },
      { status: 400 },
    );
  }

  // Group by beacon → strongest RSSI per receiver within this batch.
  const byBeacon = new Map<number, Map<number, number>>();
  for (const s of body.signals) {
    if (!Number.isFinite(s.beacon_id) || !Number.isFinite(s.rssi)) continue;
    if (s.rssi < RSSI_FLOOR) continue;
    let perReceiver = byBeacon.get(s.beacon_id);
    if (!perReceiver) {
      perReceiver = new Map();
      byBeacon.set(s.beacon_id, perReceiver);
    }
    const existing = perReceiver.get(s.receiver_id);
    if (existing === undefined || s.rssi > existing) {
      perReceiver.set(s.receiver_id, s.rssi);
    }
  }

  if (byBeacon.size === 0) {
    return NextResponse.json({ status: "ok", processed: 0, computed: [] });
  }

  // Single-frame centroid per beacon.
  const positions: {
    beacon_id: number;
    x: number;
    y: number;
    confidence: number;
  }[] = [];
  for (const [beaconId, rssiByNode] of byBeacon) {
    const est = estimateFrame(rssiByNode);
    if (est) positions.push({ beacon_id: beaconId, ...est });
  }
  if (positions.length === 0) {
    return NextResponse.json({ status: "ok", processed: 0, computed: [] });
  }

  const admin = createAdminClient();

  // Pull prior live rows so we know which beacons moved enough to log to history.
  const beaconIds = positions.map((p) => p.beacon_id);
  const { data: prior } = await admin
    .from("beacon_live_positions")
    .select("beacon_id, x, y")
    .in("beacon_id", beaconIds);
  const priorByBeacon = new Map(
    (prior ?? []).map((r) => [r.beacon_id as number, r as { x: number; y: number }]),
  );

  const now = new Date().toISOString();
  const liveRows = positions.map((p) => ({
    beacon_id: p.beacon_id,
    x: p.x,
    y: p.y,
    floor: 0,
    confidence: p.confidence,
    last_seen: now,
  }));

  const historyRows = positions
    .filter((p) => {
      const old = priorByBeacon.get(p.beacon_id);
      if (!old) return true;
      return Math.hypot(old.x - p.x, old.y - p.y) >= MIN_HISTORY_DISTANCE;
    })
    .map((p) => ({
      beacon_id: p.beacon_id,
      x: p.x,
      y: p.y,
      floor: 0,
      confidence: p.confidence,
      recorded_at: now,
    }));

  const { error: liveErr } = await admin
    .from("beacon_live_positions")
    .upsert(liveRows, { onConflict: "beacon_id" });
  if (liveErr) {
    return NextResponse.json(
      { error: "live upsert failed", details: liveErr.message },
      { status: 500 },
    );
  }

  if (historyRows.length > 0) {
    const { error: histErr } = await admin
      .from("beacon_position_history")
      .insert(historyRows);
    if (histErr) {
      // Live write already succeeded — surface the history error but don't
      // fail the whole request; the live UI keeps working without it.
      console.error("[/api/ble/signals/batch] history insert failed", histErr);
    }
  }

  return NextResponse.json({
    status: "ok",
    processed: body.signals.length,
    computed: positions,
    history_logged: historyRows.length,
    received_at: now,
  });
}

/**
 * RSSI-weighted centroid in linear-power space. Same algorithm shape as the
 * client trace, but stateless: one batch → one position. Confidence is a
 * cheap heuristic combining anchor count + best RSSI strength.
 */
function estimateFrame(
  rssiByNode: Map<number, number>,
): { x: number; y: number; confidence: number } | null {
  let wSum = 0;
  let xSum = 0;
  let ySum = 0;
  let used = 0;
  let bestRssi = -200;

  for (const a of ANCHORS) {
    const rssi = rssiByNode.get(a.nodeId);
    if (rssi === undefined) continue;
    const w = Math.pow(10, rssi / 10);
    wSum += w;
    xSum += a.x * w;
    ySum += a.y * w;
    used += 1;
    if (rssi > bestRssi) bestRssi = rssi;
  }
  if (wSum === 0) return null;

  // Confidence: 0 with one weak anchor, ~1 with all three anchors strong.
  const confidence = Math.max(
    0,
    Math.min(1, (used / ANCHORS.length) * Math.max(0, (bestRssi + 90) / 30)),
  );
  return { x: xSum / wSum, y: ySum / wSum, confidence };
}
