/** Mirrors public.equipment_status. */
export type EquipmentStatus =
  | "in_use"
  | "available"
  | "maintenance"
  | "broken"
  | "archived";

/** Mirrors public.equipment_category. */
export type EquipmentCategory =
  | "multimedia"
  | "appliance"
  | "structural"
  | "network"
  | "cleaning"
  | "other";

/** Mirrors public.equipment_item_type (migration 0012). */
export type ItemType = "inventory" | "asset";

export type Asset = {
  id: string;
  assetCode: string;
  name: string;
  category: EquipmentCategory;
  location: string;
  status: EquipmentStatus;
  rfidTagId: string;
  /** UUID of the assigned profile, null if unassigned. */
  assignedToId: string | null;
  /** Resolved name for display — joined from profiles. */
  assignedToName: string | null;
  /** Stored in cents, exposed to callers in major units (e.g. €1450.00). */
  value: number;
  notes: string;
  lastInspectedAt: string | null;
  /** 'inventory' (default, all pre-0012 rows) or 'asset' (tracked property). */
  itemType: ItemType;
  /** BLE beacon attached to this asset — null for untracked items. */
  beaconId: number | null;
  /** Home position + safe radius, floor-plan viewBox units (1200×480). */
  homeX: number | null;
  homeY: number | null;
  geofenceRadius: number | null;
};

/** An Asset that the floorplan can guard: typed + beacon-bound + homed. */
export type TrackedAsset = Asset & {
  beaconId: number;
  homeX: number;
  homeY: number;
  geofenceRadius: number;
};

export function isTrackedAsset(a: Asset): a is TrackedAsset {
  return (
    a.itemType === "asset" &&
    a.beaconId !== null &&
    a.homeX !== null &&
    a.homeY !== null &&
    a.geofenceRadius !== null
  );
}

export type InventoryStats = {
  total: number;
  newThisMonth: number;
};

// Display vocab — kept here (not in lib/inventory-data.ts) so server modules
// don't pull lucide icons through their import graph.
export const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: "in_use", label: "In Use" },
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
  { value: "broken", label: "Broken" },
];

export const ALL_STATUSES: EquipmentStatus[] = [
  "in_use",
  "available",
  "maintenance",
  "broken",
  "archived",
];

export const CATEGORY_OPTIONS: { value: EquipmentCategory; label: string }[] = [
  { value: "multimedia", label: "Multimedia Hardware" },
  { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural Asset" },
  { value: "network", label: "Network Infrastructure" },
  { value: "cleaning", label: "Cleaning Equipment" },
  { value: "other", label: "Other" },
];

export const ALL_CATEGORIES: EquipmentCategory[] = [
  "multimedia",
  "appliance",
  "structural",
  "network",
  "cleaning",
  "other",
];

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "inventory", label: "Inventory" },
  { value: "asset", label: "Asset" },
];

export const ALL_ITEM_TYPES: ItemType[] = ["inventory", "asset"];

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  inventory: "Inventory",
  asset: "Asset",
};

export const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  multimedia: "Multimedia Hardware",
  appliance: "Appliance",
  structural: "Structural Asset",
  network: "Network Infrastructure",
  cleaning: "Cleaning Equipment",
  other: "Other",
};
