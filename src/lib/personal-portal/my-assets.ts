import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/dal";
import type {
  Asset,
  EquipmentCategory,
  EquipmentStatus,
  ItemType,
} from "@/lib/inventory/types";

/**
 * The currently-signed-in user's own equipment assignments. Uses the
 * service-role client because `profiles RLS` would hide the assignee join
 * for managers/staff; the WHERE clause itself enforces "only me".
 */

type Row = {
  id: string;
  asset_code: string;
  name: string;
  category: EquipmentCategory;
  location: string | null;
  status: EquipmentStatus;
  rfid_tag_id: string | null;
  value_cents: number;
  notes: string | null;
  last_inspected_at: string | null;
  item_type: ItemType;
  beacon_id: number | null;
  home_x: number | null;
  home_y: number | null;
  geofence_radius: number | null;
};

export async function listMyAssets(): Promise<Asset[]> {
  const me = await getCurrentUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("equipment")
    .select(
      "id, asset_code, name, category, location, status, rfid_tag_id, value_cents, notes, last_inspected_at, item_type, beacon_id, home_x, home_y, geofence_radius",
    )
    .eq("assigned_to", me.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Row[]).map((r) => ({
    id: r.id,
    assetCode: r.asset_code,
    name: r.name,
    category: r.category,
    location: r.location ?? "",
    status: r.status,
    rfidTagId: r.rfid_tag_id ?? "",
    assignedToId: me.id,
    assignedToName: me.name,
    value: r.value_cents / 100,
    notes: r.notes ?? "",
    lastInspectedAt: r.last_inspected_at,
    itemType: r.item_type ?? "inventory",
    beaconId: r.beacon_id,
    homeX: r.home_x,
    homeY: r.home_y,
    geofenceRadius: r.geofence_radius,
  }));
}
