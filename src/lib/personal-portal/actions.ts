"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
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
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", me.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}
