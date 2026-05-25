"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit/log";
import { ALL_DEPARTMENTS, type Department } from "@/lib/staff-data";

export type ActionResult = { ok: boolean; error?: string };

const PATH = "/personal-portal";

/**
 * Self-update for the signed-in user's profile. Uses the session client so
 * Postgres RLS (`profiles_update_self`) is the authoritative gate — the WITH
 * CHECK on that policy already prevents role escalation. Department / name
 * are the only mutable fields exposed here.
 */
export async function updateMyProfile(
  patch: { name?: string; department?: Department | null },
): Promise<ActionResult> {
  const me = await requirePermission("personal-portal", "update");

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "Name cannot be empty." };
    update.name = name;
  }
  if (patch.department !== undefined) {
    if (patch.department === null) {
      update.department = null;
    } else if (
      (ALL_DEPARTMENTS as readonly string[]).includes(patch.department)
    ) {
      update.department = patch.department;
    } else {
      return { ok: false, error: "Invalid department." };
    }
  }

  if (Object.keys(update).length === 1) {
    return { ok: true }; // only updated_at, nothing to do
  }

  const supabase = await createClient();

  // Capture before-state so the audit row carries an actual diff.
  const { data: before } = await supabase
    .from("profiles")
    .select("name, department")
    .eq("id", me.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", me.id);

  if (error) return { ok: false, error: error.message };

  const oldFields: Record<string, unknown> = {};
  const newFields: Record<string, unknown> = {};
  for (const k of Object.keys(update)) {
    if (k === "updated_at") continue;
    oldFields[k] = before ? (before as Record<string, unknown>)[k] : null;
    newFields[k] = (update as Record<string, unknown>)[k];
  }
  await recordAudit({
    action: "profile.self_update",
    resourceType: "profile",
    resourceId: me.id,
    oldValues: oldFields,
    newValues: newFields,
    actor: { id: me.id, email: me.email },
  });

  revalidatePath(PATH);
  return { ok: true };
}
