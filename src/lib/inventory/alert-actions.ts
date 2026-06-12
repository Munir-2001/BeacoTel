"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit/log";

/**
 * Geofence-breach alerting for tracked assets. The breach is *detected on the
 * client* (the floorplan watches beacon_live_positions), so this action only
 * persists the event — it never decides whether a breach happened.
 */

export type AssetAlertEvent = {
  id: string;
  /** ISO timestamp. */
  occurredAt: string;
  assetCode: string;
  assetName: string;
  beaconId: number | null;
};

export type LogAlertInput = {
  assetCode: string;
  assetName: string;
  beaconId: number;
  /** Beacon position at alarm time, floor-plan viewBox units. */
  x: number;
  y: number;
  /** Distance from home vs the allowed radius, viewBox units. */
  distance: number;
  geofenceRadius: number;
};

/** Two alarms for the same asset within this window are one incident. */
const DEDUPE_WINDOW_MS = 30_000;

/**
 * Writes one `asset.moved_alert` row to audit_logs (surfaces on System Logs
 * as a Security alert). Deduped per asset over a short window so several
 * open dashboards — or a React re-mount — don't multiply one theft into a
 * dozen log rows.
 */
export async function logAssetMovedAlert(
  input: LogAlertInput,
): Promise<{ ok: boolean; deduped?: boolean }> {
  // Viewer-level gate: anyone who can see the floorplan can report the alarm.
  await requirePermission("inventory", "read");

  const admin = createAdminClient();
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from("audit_logs")
    .select("id")
    .eq("action", "asset.moved_alert")
    .eq("resource_id", input.assetCode)
    .gte("occurred_at", since)
    .limit(1);

  if (recent && recent.length > 0) return { ok: true, deduped: true };

  await recordAudit({
    action: "asset.moved_alert",
    resourceType: "equipment",
    resourceId: input.assetCode,
    newValues: {
      item: input.assetName,
      beacon_id: input.beaconId,
      x: Math.round(input.x),
      y: Math.round(input.y),
      distance: Math.round(input.distance),
      geofence_radius: Math.round(input.geofenceRadius),
    },
  });

  return { ok: true };
}

/**
 * Demo-reset companion to the alarm's Acknowledge button: snaps the asset's
 * beacon back to its home position so the guard resolves to `secure`. Home
 * coords are read server-side from equipment — the client only names the
 * asset. (The beacon table itself is anon-writable per migration 0009, so
 * the inventory:read gate here is not the security boundary.)
 */
export async function returnAssetHome(
  assetCode: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("inventory", "read");

  const admin = createAdminClient();
  const { data: asset } = await admin
    .from("equipment")
    .select("beacon_id, home_x, home_y")
    .eq("asset_code", assetCode)
    .maybeSingle();

  if (
    !asset ||
    asset.beacon_id == null ||
    asset.home_x == null ||
    asset.home_y == null
  ) {
    return { ok: false, error: "Asset is not beacon-tracked." };
  }

  const { error } = await admin.from("beacon_live_positions").upsert(
    {
      beacon_id: asset.beacon_id,
      x: asset.home_x,
      y: asset.home_y,
      floor: 1,
      confidence: 0.99,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "beacon_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Recent breach events for the on-page feed — survives reloads, unlike the
 * client's in-session list. Called from the inventory server component.
 */
export async function listRecentAssetAlerts(
  limit = 8,
): Promise<AssetAlertEvent[]> {
  await requirePermission("inventory", "read");

  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_logs")
    .select("id, occurred_at, resource_id, new_values")
    .eq("action", "asset.moved_alert")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const n = (row.new_values ?? {}) as { item?: string; beacon_id?: number };
    return {
      id: row.id as string,
      occurredAt: row.occurred_at as string,
      assetCode: (row.resource_id as string | null) ?? "—",
      assetName: n.item ?? "Tracked asset",
      beaconId: n.beacon_id ?? null,
    };
  });
}
