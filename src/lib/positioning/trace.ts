/**
 * BLE trace → animated position estimates.
 *
 * Input: RSSI packets from a single mobile beacon (beaconID) heard by N fixed
 * receivers (nodeIDs). Output: a chronological sequence of position estimates
 * in viewBox coordinates so the live-tracking map can replay the trace.
 *
 * Algorithm: RSSI-weighted centroid in linear-power space with carry-forward
 * (each anchor keeps its last-known RSSI, decayed by half-life until refreshed).
 * Final positions are smoothed by an exponential moving average to kill jitter.
 *
 * Anchors live in the same viewBox coords as the SVG floorplan (1200 × 480).
 */

export type RawEntry = {
  nodeID: number;
  timestamp: number; // microseconds
  beaconID: number;
  seq: number;
  rssi: number; // dBm, negative
};

export type Anchor = { nodeId: number; x: number; y: number };

export type TracePosition = {
  /** ms since trace start */
  tMs: number;
  /** viewBox coords */
  x: number;
  y: number;
  /** RSSI seen in this frame (raw — pre-carry-forward) */
  rssi: Partial<Record<number, number>>;
  /** RSSI used for the centroid (with carry-forward) */
  rssiUsed: Partial<Record<number, number>>;
};

/** Anchor positions match the BeaconMarker render coords in the floorplan SVG. */
export const ANCHORS: Anchor[] = [
  { nodeId: 1, x: 1000, y: 130 }, // PROTOTIPAZIONE top
  { nodeId: 2, x: 760, y: 370 }, // ELETTRONICA south
  { nodeId: 3, x: 120, y: 130 }, // FABLAB NW
];

export type ComputeOptions = {
  /** EMA factor for position smoothing. 0 = no movement, 1 = no smoothing. */
  alpha: number;
  /** RSSI carry-forward half-life in ms. After this long without a fresh reading from an anchor, its weight is halved. */
  carryHalfLifeMs: number;
  /** Hard cutoff in ms — readings older than this are dropped entirely. */
  carryMaxAgeMs: number;
  /** Maximum per-frame movement in viewBox units. Bigger jumps get clipped to this. */
  maxStep: number;
  /** RSSI floor in dBm. Readings weaker than this are treated as noise and dropped. */
  rssiFloor: number;
  /** Wall-crossing hysteresis in viewBox units. The dot must overshoot the wall by this much to switch rooms. */
  wallHysteresis: number;
};

export const DEFAULT_OPTS: ComputeOptions = {
  alpha: 0.18,
  carryHalfLifeMs: 8000,
  carryMaxAgeMs: 20000,
  maxStep: 70,
  rssiFloor: -92,
  wallHysteresis: 25,
};

/** Building inner walls (viewBox coords) — clamp the dot inside these. */
const BUILDING_BOUNDS = { x0: 50, y0: 90, x1: 1150, y1: 390 };

/** Vertical room dividers (viewBox X). Match the red walls in the floorplan SVG. */
const WALL_X = [545, 945] as const;

/**
 * Wall-clock microseconds since epoch are ~1.78e15 today. Some nodes report
 * uptime-style timestamps (starting at ~0) instead — we want to ignore those
 * for the time axis since they break ordering.
 */
const WALL_CLOCK_FLOOR_US = 1e12;
const isWallClock = (t: number) => t > WALL_CLOCK_FLOOR_US;

/**
 * Group raw packets into per-seq frames, ordered by sequence number (the
 * authoritative transmit order). Each frame's `tUs` is the max valid wall-clock
 * timestamp from its readings; seqs missing any wall-clock timestamp are
 * linearly interpolated from their neighbours so the time axis stays smooth.
 */
function framesFromRaw(raw: RawEntry[]) {
  type WorkingFrame = {
    seq: number;
    tUs: number | null;
    rssi: Record<number, number>;
  };
  const bySeq = new Map<number, WorkingFrame>();
  for (const r of raw) {
    let f = bySeq.get(r.seq);
    if (!f) {
      f = { seq: r.seq, tUs: null, rssi: {} };
      bySeq.set(r.seq, f);
    }
    f.rssi[r.nodeID] = r.rssi;
    if (isWallClock(r.timestamp)) {
      f.tUs = f.tUs === null ? r.timestamp : Math.max(f.tUs, r.timestamp);
    }
  }

  const frames = [...bySeq.values()].sort((a, b) => a.seq - b.seq);

  // Forward-fill from the previous known wall-clock value using the seq delta
  // as a unit step (we'll rescale to real seconds below).
  let prevValid: { seq: number; tUs: number } | null = null;
  let nextValidIdx = 0;
  const findNextValid = (fromIdx: number) => {
    for (let i = fromIdx; i < frames.length; i++) {
      if (frames[i].tUs !== null) return { seq: frames[i].seq, tUs: frames[i].tUs as number, idx: i };
    }
    return null;
  };
  let lookahead = findNextValid(0);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.tUs !== null) {
      prevValid = { seq: f.seq, tUs: f.tUs };
      if (lookahead && lookahead.idx <= i) {
        nextValidIdx = i + 1;
        lookahead = findNextValid(nextValidIdx);
      }
      continue;
    }
    if (prevValid && lookahead) {
      // Linear interpolation by seq.
      const t = (f.seq - prevValid.seq) / (lookahead.seq - prevValid.seq);
      f.tUs = prevValid.tUs + (lookahead.tUs - prevValid.tUs) * t;
    } else if (prevValid) {
      // No future anchor — extrapolate at 1 s per seq.
      f.tUs = prevValid.tUs + (f.seq - prevValid.seq) * 1_000_000;
    } else if (lookahead) {
      // No prior anchor — extrapolate backwards at 1 s per seq.
      f.tUs = lookahead.tUs - (lookahead.seq - f.seq) * 1_000_000;
    }
  }

  // Enforce monotonic non-decreasing time. Clock skew between nodes (or other
  // anomalies in the raw log) can put neighboring seqs out of order by a few
  // seconds; without this, the playback would freeze on a regressed frame.
  const result = frames
    .filter((f) => f.tUs !== null)
    .map((f) => ({ tUs: f.tUs as number, rssi: f.rssi }));
  for (let i = 1; i < result.length; i++) {
    if (result[i].tUs < result[i - 1].tUs) {
      result[i].tUs = result[i - 1].tUs + 1000; // +1 ms
    }
  }
  return result;
}

export function computeTrace(raw: RawEntry[], opts: ComputeOptions = DEFAULT_OPTS): TracePosition[] {
  const frames = framesFromRaw(raw);
  if (frames.length === 0) return [];

  const t0 = frames[0].tUs;
  /** Most recent reading we've seen from each anchor: { rssi, tMs }. */
  const lastSeen: Record<number, { rssi: number; tMs: number }> = {};
  const out: TracePosition[] = [];
  let sx: number | null = null;
  let sy: number | null = null;

  for (const f of frames) {
    const tMs = (f.tUs - t0) / 1000;

    // Refresh last-seen with this frame's fresh readings. Drop noise-floor readings.
    for (const [nidStr, rssi] of Object.entries(f.rssi)) {
      if (rssi < opts.rssiFloor) continue;
      lastSeen[+nidStr] = { rssi, tMs };
    }

    // Build per-anchor weights using carry-forward + age decay.
    let wSum = 0;
    let wxSum = 0;
    let wySum = 0;
    const rssiUsed: Partial<Record<number, number>> = {};
    for (const a of ANCHORS) {
      const last = lastSeen[a.nodeId];
      if (!last) continue;
      const age = tMs - last.tMs;
      if (age > opts.carryMaxAgeMs) continue;
      const decay = Math.pow(0.5, age / opts.carryHalfLifeMs);
      // Linear-power weight. RSSI is in dBm; convert to linear scale.
      const w = Math.pow(10, last.rssi / 10) * decay;
      if (w <= 0 || !isFinite(w)) continue;
      wSum += w;
      wxSum += a.x * w;
      wySum += a.y * w;
      rssiUsed[a.nodeId] = last.rssi;
    }

    if (wSum === 0) continue;
    const xRaw = wxSum / wSum;
    const yRaw = wySum / wSum;

    let xNext: number = sx === null ? xRaw : opts.alpha * xRaw + (1 - opts.alpha) * sx;
    let yNext: number = sy === null ? yRaw : opts.alpha * yRaw + (1 - opts.alpha) * sy;

    // Cap per-frame movement so big RSSI jumps don't teleport the dot.
    if (sx !== null && sy !== null) {
      const dx = xNext - sx;
      const dy = yNext - sy;
      const dist = Math.hypot(dx, dy);
      if (dist > opts.maxStep) {
        const k = opts.maxStep / dist;
        xNext = sx + dx * k;
        yNext = sy + dy * k;
      }
    }

    // Clamp to building interior — insurance against any out-of-building drift.
    xNext = Math.max(BUILDING_BOUNDS.x0, Math.min(BUILDING_BOUNDS.x1, xNext));
    yNext = Math.max(BUILDING_BOUNDS.y0, Math.min(BUILDING_BOUNDS.y1, yNext));

    // Room hysteresis. If the dot is in a room and the new position would cross a wall
    // by less than `wallHysteresis`, keep it on this side. Stops border flicker when
    // the centroid lingers at x≈545 or x≈945.
    if (sx !== null) {
      for (const wx of WALL_X) {
        const crossingRightward = sx < wx && xNext >= wx;
        const crossingLeftward = sx > wx && xNext <= wx;
        if (crossingRightward && xNext - wx < opts.wallHysteresis) {
          xNext = wx - 1;
        } else if (crossingLeftward && wx - xNext < opts.wallHysteresis) {
          xNext = wx + 1;
        }
      }
    }

    sx = xNext;
    sy = yNext;

    out.push({
      tMs,
      x: sx,
      y: sy,
      rssi: { ...f.rssi },
      rssiUsed,
    });
  }

  return out;
}

/** Default loader: fetches the bundled JSON. Swap this for a Supabase call later. */
export async function loadTrace(url = "/data/beacon-trace.json"): Promise<RawEntry[]> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load trace: ${res.status}`);
  return res.json();
}
