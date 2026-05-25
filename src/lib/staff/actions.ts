"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission, getCurrentUser } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit/log";
import { ALL_ROLES, type Role } from "@/lib/auth/permissions";
import { ALL_DEPARTMENTS, type Department } from "@/lib/staff-data";

function asDepartment(raw: string | null | undefined): Department | null {
  if (!raw) return null;
  return (ALL_DEPARTMENTS as readonly string[]).includes(raw)
    ? (raw as Department)
    : null;
}

export type ActionResult = { ok: boolean; error?: string };
export type CreateStaffState = { ok: boolean; error: string | null };

const PATH = "/staff-directory";

/**
 * Create a new staff member. Form action used with `useActionState`.
 * Requires `staff-directory:create` — admin only by default seed.
 */
export async function createStaff(
  _prev: CreateStaffState,
  formData: FormData,
): Promise<CreateStaffState> {
  await requirePermission("staff-directory", "create");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const employeeId =
    String(formData.get("employeeId") ?? "").trim() || null;
  const departmentRaw = String(formData.get("department") ?? "").trim();
  const department = asDepartment(departmentRaw);
  if (departmentRaw && !department) {
    return { ok: false, error: "Pick a valid department." };
  }

  if (!name || !email || !password) {
    return { ok: false, error: "Name, email and password are all required." };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!ALL_ROLES.includes(role)) {
    return { ok: false, error: "Pick a valid role." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the user.",
    };
  }

  // Only forward employee_id when the admin actually supplied one — if it's
  // blank the column default (next_employee_id()) mints the next 'EMP-…' ID.
  const profilePatch: Record<string, unknown> = {
    id: data.user.id,
    email,
    name,
    role,
    department,
  };
  if (employeeId) profilePatch.employee_id = employeeId;

  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(profilePatch, { onConflict: "id" });
  if (upsertErr) {
    return { ok: false, error: upsertErr.message };
  }

  await recordAudit({
    action: "staff.create",
    resourceType: "profile",
    resourceId: data.user.id,
    newValues: {
      email,
      name,
      role,
      department,
      employee_id: employeeId ?? "(auto)",
    },
  });

  revalidatePath(PATH);
  return { ok: true, error: null };
}

/**
 * Patch one staff member's mutable fields. Role changes are admin-only; if the
 * caller is a manager, role is silently dropped from the patch. Status flips
 * go through `setStaffActive` so the self-deactivation guard stays in one place.
 */
export type StaffPatch = {
  name?: string;
  employeeId?: string | null;
  department?: Department | null;
  role?: Role;
};

export async function updateStaff(
  id: string,
  patch: StaffPatch,
): Promise<ActionResult> {
  const me = await requirePermission("staff-directory", "update");

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "Name cannot be empty." };
    update.name = name;
  }
  if (patch.employeeId !== undefined) {
    const trimmed = patch.employeeId?.trim();
    // employee_id is NOT NULL — silently ignore a blank submission so the
    // existing auto-generated value stays put. HR can overwrite with any
    // non-blank string.
    if (trimmed) update.employee_id = trimmed;
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
  if (patch.role !== undefined) {
    if (me.role !== "admin") {
      return { ok: false, error: "Only admins can change roles." };
    }
    if (!ALL_ROLES.includes(patch.role)) {
      return { ok: false, error: "Invalid role." };
    }
    if (id === me.id) {
      return { ok: false, error: "You can't change your own role." };
    }
    update.role = patch.role;
  }

  if (Object.keys(update).length === 1) {
    return { ok: true }; // nothing to do (only updated_at)
  }

  const admin = createAdminClient();

  // Snapshot only the columns we might mutate so the audit diff stays tight.
  const { data: before } = await admin
    .from("profiles")
    .select("name, employee_id, department, role")
    .eq("id", id)
    .single();

  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Role changes get their own action name so A8 ("role changes") filters
  // cleanly. Everything else collapses into staff.update.
  const roleChanged =
    "role" in update && before && before.role !== update.role;
  const otherFieldChanged = Object.keys(update).some(
    (k) => k !== "role" && k !== "updated_at",
  );

  if (roleChanged) {
    await recordAudit({
      action: "user.role_change",
      resourceType: "profile",
      resourceId: id,
      oldValues: { role: before?.role },
      newValues: { role: update.role },
    });
  }
  if (otherFieldChanged) {
    const oldFields: Record<string, unknown> = {};
    const newFields: Record<string, unknown> = {};
    for (const k of Object.keys(update)) {
      if (k === "updated_at" || k === "role") continue;
      oldFields[k] = before ? (before as Record<string, unknown>)[k] : null;
      newFields[k] = (update as Record<string, unknown>)[k];
    }
    await recordAudit({
      action: "staff.update",
      resourceType: "profile",
      resourceId: id,
      oldValues: oldFields,
      newValues: newFields,
    });
  }

  revalidatePath(PATH);
  return { ok: true };
}

/** Toggle a staff member's active state. Self-deactivation is blocked. */
export async function setStaffActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const me = await requirePermission("staff-directory", "update");

  if (id === me.id && !isActive) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "user.set_active",
    resourceType: "profile",
    resourceId: id,
    newValues: { is_active: isActive },
  });

  revalidatePath(PATH);
  return { ok: true };
}

/** Tiny helper so client code can render a "you" badge without re-querying. */
export async function getCurrentUserId(): Promise<string> {
  const me = await getCurrentUser();
  return me.id;
}
