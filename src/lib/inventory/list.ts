import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import {
  isTrackedAsset,
  type Asset,
  type EquipmentCategory,
  type EquipmentStatus,
  type InventoryStats,
  type ItemType,
  type TrackedAsset,
} from "@/lib/inventory/types";

/**
 * Read-side of the Inventory module. Uses the session client so RLS gates
 * who can list. `requirePermission("inventory", "read")` is the app-level
 * companion check; the seeded matrix gives all three roles read access.
 */

type Row = {
  id: string;
  asset_code: string;
  name: string;
  category: EquipmentCategory;
  location: string | null;
  status: EquipmentStatus;
  rfid_tag_id: string | null;
  assigned_to: string | null;
  value_cents: number;
  notes: string | null;
  last_inspected_at: string | null;
  item_type: ItemType;
  beacon_id: number | null;
  home_x: number | null;
  home_y: number | null;
  geofence_radius: number | null;
  profiles: { name: string } | null;
};

export async function listAssets(): Promise<Asset[]> {
  await requirePermission("inventory", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select(
      "id, asset_code, name, category, location, status, rfid_tag_id, assigned_to, value_cents, notes, last_inspected_at, item_type, beacon_id, home_x, home_y, geofence_radius, profiles!assigned_to(name)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Row[]).map(rowToAsset);
}

/**
 * Just the geofence-guarded subset — fetched by the dashboard layout on every
 * page so the global asset guard can watch beacons app-wide. Kept separate
 * from listAssets() so layout navigation doesn't pull the whole registry.
 */
export async function listTrackedAssets(): Promise<TrackedAsset[]> {
  await requirePermission("inventory", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select(
      "id, asset_code, name, category, location, status, rfid_tag_id, assigned_to, value_cents, notes, last_inspected_at, item_type, beacon_id, home_x, home_y, geofence_radius, profiles!assigned_to(name)",
    )
    .is("archived_at", null)
    .eq("item_type", "asset")
    .not("beacon_id", "is", null);

  if (error || !data) return [];

  return (data as unknown as Row[]).map(rowToAsset).filter(isTrackedAsset);
}

export async function getInventoryStats(): Promise<InventoryStats> {
  await requirePermission("inventory", "read");
  const supabase = await createClient();

  // Total — non-archived only.
  const { count: total } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);

  // New this month — created since the start of the current calendar month.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: newThisMonth } = await supabase
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .gte("created_at", monthStart.toISOString());

  return {
    total: total ?? 0,
    newThisMonth: newThisMonth ?? 0,
  };
}

function rowToAsset(r: Row): Asset {
  return {
    id: r.id,
    assetCode: r.asset_code,
    name: r.name,
    category: r.category,
    location: r.location ?? "",
    status: r.status,
    rfidTagId: r.rfid_tag_id ?? "",
    assignedToId: r.assigned_to,
    assignedToName: r.profiles?.name ?? null,
    value: r.value_cents / 100,
    notes: r.notes ?? "",
    lastInspectedAt: r.last_inspected_at,
    itemType: r.item_type ?? "inventory",
    beaconId: r.beacon_id,
    homeX: r.home_x,
    homeY: r.home_y,
    geofenceRadius: r.geofence_radius,
  };
}
