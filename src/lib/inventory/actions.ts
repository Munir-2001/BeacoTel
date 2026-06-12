"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requirePermission, getCurrentUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit/log";
import {
  ALL_CATEGORIES,
  ALL_ITEM_TYPES,
  ALL_STATUSES,
  type EquipmentCategory,
  type EquipmentStatus,
  type ItemType,
} from "@/lib/inventory/types";

export type ActionResult = { ok: boolean; error?: string };
export type CreateAssetResult = ActionResult & { id?: string; assetCode?: string };

const PATH = "/inventory";

export type AssetInput = {
  name: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  location: string;
  rfidTagId: string;
  /** Profile UUID, or empty/null to leave unassigned. */
  assignedToId: string | null;
  /** Major-unit value (e.g. 1450 for €1450). Stored as cents on disk. */
  value: number;
  notes: string;
  /** Optional so pre-0012 callers keep working — defaults to 'inventory'. */
  itemType?: ItemType;
};

/** Statuses staff may pick when releasing an assigned asset. */
export type ReleasableStatus = "available" | "maintenance" | "broken";
const RELEASABLE_STATUSES: ReleasableStatus[] = [
  "available",
  "maintenance",
  "broken",
];

function validate(input: AssetInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!(ALL_CATEGORIES as readonly string[]).includes(input.category)) {
    return "Pick a valid category.";
  }
  if (!(ALL_STATUSES as readonly string[]).includes(input.status)) {
    return "Pick a valid status.";
  }
  if (
    input.itemType !== undefined &&
    !(ALL_ITEM_TYPES as readonly string[]).includes(input.itemType)
  ) {
    return "Pick a valid item type.";
  }
  if (input.status === "archived") {
    return "Use the Archive action to archive an asset.";
  }
  if (!Number.isFinite(input.value) || input.value < 0) {
    return "Value must be a non-negative number.";
  }
  // Mirrors the DB CHECK constraint (migrations 0007/0008): in_use ⇔ assigned.
  // Catch it here so the user sees a friendly message instead of a constraint
  // violation from Postgres.
  if (input.assignedToId && input.status !== "in_use") {
    return "Assigned assets must have status 'In Use'.";
  }
  if (!input.assignedToId && input.status === "in_use") {
    return "Pick a staff member to mark this asset as In Use.";
  }
  return null;
}

function toRow(input: AssetInput) {
  // Auto-correct the invariant: when an assignee is set, status is in_use.
  // `validate()` already rejects a contradictory pair; this just normalizes
  // the row we send to the DB.
  const status: EquipmentStatus = input.assignedToId ? "in_use" : input.status;
  return {
    name: input.name.trim(),
    category: input.category,
    status,
    location: input.location.trim() || null,
    rfid_tag_id: input.rfidTagId.trim() || null,
    assigned_to: input.assignedToId || null,
    value_cents: Math.round(input.value * 100),
    notes: input.notes.trim() || null,
    // Omitted (pre-0012 callers) ⇒ leave untouched on update, DB default
    // 'inventory' on insert. Never coerce an existing 'asset' back down.
    ...(input.itemType !== undefined ? { item_type: input.itemType } : {}),
  };
}

export async function createAsset(
  input: AssetInput,
): Promise<CreateAssetResult> {
  await requirePermission("inventory", "create");

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert(toRow(input))
    .select("id, asset_code")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create asset." };
  }

  await recordAudit({
    action: "inventory.added",
    resourceType: "equipment",
    resourceId: data.asset_code,
    newValues: {
      item: input.name,
      location: input.location || undefined,
      status: input.assignedToId ? "in_use" : input.status,
    },
  });

  // If the asset was created with an assignee, log the assignment too — it's
  // semantically distinct from "added" and the system-log filter expects it.
  if (input.assignedToId) {
    const assigneeName = await lookupProfileName(input.assignedToId);
    await recordAudit({
      action: "inventory.assigned",
      resourceType: "equipment",
      resourceId: data.asset_code,
      newValues: { item: input.name, to: assigneeName ?? "a staff member" },
    });
  }

  revalidatePath(PATH);
  return { ok: true, id: data.id, assetCode: data.asset_code };
}

export async function updateAsset(
  id: string,
  input: AssetInput,
): Promise<ActionResult> {
  await requirePermission("inventory", "update");

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Capture every column we might mutate so we can emit one audit row per
  // distinct kind of change (status / assignment / generic update).
  const { data: before } = await supabase
    .from("equipment")
    .select(
      "asset_code, name, category, location, rfid_tag_id, status, assigned_to, value_cents, notes, item_type",
    )
    .eq("id", id)
    .single();

  const next = toRow(input);

  const { error } = await supabase
    .from("equipment")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  const code = before?.asset_code ?? id;

  // 1. Status change → equipment.status_change. If the asset had an assignee
  //    before the change, capture their name in old_values.assignee so the
  //    System Logs line reads "moved from In Use to Maintenance (was with X)".
  if (before && before.status !== next.status) {
    const previousAssignee = before.assigned_to
      ? await lookupProfileName(before.assigned_to)
      : null;
    await recordAudit({
      action: "equipment.status_change",
      resourceType: "equipment",
      resourceId: code,
      oldValues: {
        status: before.status,
        ...(previousAssignee ? { assignee: previousAssignee } : {}),
      },
      newValues: { status: next.status, equipment: next.name },
    });
  }

  // 2. Assignment change → inventory.assigned / inventory.unassigned
  if (before && before.assigned_to !== next.assigned_to) {
    if (next.assigned_to) {
      const assigneeName = await lookupProfileName(next.assigned_to);
      await recordAudit({
        action: "inventory.assigned",
        resourceType: "equipment",
        resourceId: code,
        newValues: { item: next.name, to: assigneeName ?? "a staff member" },
      });
    } else {
      const previousName = before.assigned_to
        ? await lookupProfileName(before.assigned_to)
        : null;
      await recordAudit({
        action: "inventory.unassigned",
        resourceType: "equipment",
        resourceId: code,
        oldValues: { from: previousName ?? "a staff member" },
        newValues: { item: next.name },
      });
    }
  }

  // 3. Any other field change → one consolidated inventory.updated row.
  const otherDiff = diffOtherFields(before, next);
  if (Object.keys(otherDiff.newValues).length > 0) {
    await recordAudit({
      action: "inventory.updated",
      resourceType: "equipment",
      resourceId: code,
      oldValues: otherDiff.oldValues,
      newValues: { _name: next.name, ...otherDiff.newValues },
    });
  }

  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

/** Soft-delete: sets archived_at and flips status so it falls out of listings. */
export async function archiveAsset(id: string): Promise<ActionResult> {
  await requirePermission("inventory", "delete");

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("equipment")
    .select("asset_code, name, assigned_to")
    .eq("id", id)
    .single();

  // The CHECK constraint forbids 'archived' status while an assignee is set,
  // so we clear the assignee on archive in the same UPDATE.
  const { error } = await supabase
    .from("equipment")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
      assigned_to: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "inventory.removed",
    resourceType: "equipment",
    resourceId: before?.asset_code ?? id,
    newValues: { item: before?.name ?? "Asset", reason: "archived" },
  });

  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

/**
 * Marks an asset as inspected today and emits a maintenance audit row.
 * Gated by `maintenance:update` since this lives on the maintenance board,
 * but admin + manager both have it (staff don't open this page).
 */
export async function markInspected(id: string): Promise<ActionResult> {
  await requirePermission("maintenance", "update");

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("equipment")
    .select("asset_code, name")
    .eq("id", id)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("equipment")
    .update({
      last_inspected_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "equipment.inspection_completed",
    resourceType: "equipment",
    resourceId: before?.asset_code ?? id,
    newValues: {
      equipment: before?.name ?? "Asset",
      inspected_at: today,
    },
  });

  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

/**
 * Inline status flip — used by the Inventory table and the Maintenance
 * kanban. Rejects changes that would violate the assigned ⇒ in_use rule.
 */
export async function setAssetStatus(
  id: string,
  status: EquipmentStatus,
): Promise<ActionResult> {
  await requirePermission("inventory", "update");
  if (!(ALL_STATUSES as readonly string[]).includes(status) || status === "archived") {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("equipment")
    .select("status, asset_code, name, assigned_to")
    .eq("id", id)
    .single();

  if (before?.status === status) return { ok: true };

  if (before?.assigned_to && status !== "in_use") {
    return {
      ok: false,
      error:
        "This asset is assigned to a staff member. Release it before changing status.",
    };
  }
  if (!before?.assigned_to && status === "in_use") {
    return {
      ok: false,
      error:
        "Open the asset and assign a staff member to mark it as In Use.",
    };
  }

  const { error } = await supabase
    .from("equipment")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "equipment.status_change",
    resourceType: "equipment",
    resourceId: before?.asset_code ?? id,
    oldValues: { status: before?.status },
    newValues: { status, equipment: before?.name ?? "Asset" },
  });

  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

/**
 * Admin/manager version of release. Unassigns any asset (not just one the
 * caller owns) and sets it to a chosen non-in_use status — handy from the
 * Inventory table or the Maintenance kanban when you need to quickly take
 * an in-use asset offline. Logs both `inventory.unassigned` and
 * `equipment.status_change` so the audit trail matches a manual edit-sheet
 * flow.
 */
export async function releaseAsset(
  id: string,
  newStatus: ReleasableStatus,
): Promise<ActionResult> {
  const me = await requirePermission("inventory", "update");

  if (!RELEASABLE_STATUSES.includes(newStatus)) {
    return { ok: false, error: "Pick a valid release status." };
  }

  const supabase = await createClient();
  const { data: row, error: readErr } = await supabase
    .from("equipment")
    .select("asset_code, name, assigned_to, status")
    .eq("id", id)
    .single();

  if (readErr || !row) {
    return { ok: false, error: "Asset not found." };
  }
  if (!row.assigned_to) {
    return { ok: false, error: "This asset is already unassigned." };
  }

  const previousAssigneeName = await lookupProfileName(row.assigned_to);

  const { error: updateErr } = await supabase
    .from("equipment")
    .update({
      assigned_to: null,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await recordAudit({
    action: "inventory.unassigned",
    resourceType: "equipment",
    resourceId: row.asset_code,
    oldValues: { from: previousAssigneeName ?? "a staff member" },
    newValues: { item: row.name },
    actor: { id: me.id, email: me.email },
  });
  await recordAudit({
    action: "equipment.status_change",
    resourceType: "equipment",
    resourceId: row.asset_code,
    oldValues: {
      status: row.status,
      ...(previousAssigneeName ? { assignee: previousAssigneeName } : {}),
    },
    newValues: { status: newStatus, equipment: row.name },
    actor: { id: me.id, email: me.email },
  });

  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

/**
 * Lets a staff member release one of their own assigned assets and pick its
 * next status (available / maintenance / broken). The ownership check is
 * the security boundary — there's no other gate, since staff don't have
 * inventory:update under the new permission matrix.
 */
export async function releaseMyAsset(
  id: string,
  newStatus: ReleasableStatus,
): Promise<ActionResult> {
  // Only requires a valid session — every signed-in user has personal-portal
  // permission. The ownership check below is what scopes this to "me".
  const me = await getCurrentUser();

  if (!RELEASABLE_STATUSES.includes(newStatus)) {
    return { ok: false, error: "Pick a valid release status." };
  }

  // Service-role read+write so staff (whose RLS doesn't permit writes to
  // equipment under migration 0006) can still release their own assets.
  const admin = createAdminClient();
  const { data: row, error: readErr } = await admin
    .from("equipment")
    .select("id, asset_code, name, assigned_to, status")
    .eq("id", id)
    .single();

  if (readErr || !row) {
    return { ok: false, error: "Asset not found." };
  }
  if (row.assigned_to !== me.id) {
    return { ok: false, error: "This asset isn't assigned to you." };
  }

  const { error: updateErr } = await admin
    .from("equipment")
    .update({
      assigned_to: null,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await recordAudit({
    action: "inventory.unassigned",
    resourceType: "equipment",
    resourceId: row.asset_code,
    oldValues: { from: me.name },
    newValues: { item: row.name },
    actor: { id: me.id, email: me.email },
  });
  await recordAudit({
    action: "equipment.status_change",
    resourceType: "equipment",
    resourceId: row.asset_code,
    oldValues: { status: row.status, assignee: me.name },
    newValues: { status: newStatus, equipment: row.name },
    actor: { id: me.id, email: me.email },
  });

  revalidatePath("/personal-portal");
  revalidatePath(PATH);
  revalidatePath("/maintenance");
  return { ok: true };
}

// --- internals ---------------------------------------------------------------

async function lookupProfileName(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();
  return data?.name ?? null;
}

type EquipmentDbShape = {
  name: string;
  category: EquipmentCategory;
  location: string | null;
  rfid_tag_id: string | null;
  value_cents: number;
  notes: string | null;
  /** Optional: absent when the caller didn't send itemType (pre-0012). */
  item_type?: ItemType;
};

function diffOtherFields(
  before: Partial<EquipmentDbShape> | null,
  next: EquipmentDbShape,
): {
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
} {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  if (!before) return { oldValues, newValues };

  const fields: (keyof EquipmentDbShape)[] = [
    "name",
    "category",
    "location",
    "rfid_tag_id",
    "value_cents",
    "notes",
    "item_type",
  ];
  for (const f of fields) {
    // undefined ⇒ the caller didn't touch this field (e.g. omitted itemType),
    // so it's not a change worth auditing.
    if (next[f] !== undefined && before[f] !== next[f]) {
      oldValues[f] = before[f] ?? null;
      newValues[f] = next[f];
    }
  }
  return { oldValues, newValues };
}
