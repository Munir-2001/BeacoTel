"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/dal";
import { recordAudit } from "@/lib/audit/log";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  type Action,
  type Resource,
  type Role,
} from "@/lib/auth/permissions";
import { isValidEmail } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };
export type CreateUserState = { ok: boolean; error: string | null };

const RBAC_PATH = "/rbac-settings";

/**
 * Create a new user account. Form action (used with `useActionState`).
 * Admin only. Uses the service-role client because creating an auth user
 * is a privileged operation.
 */
export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!name || !email || !password) {
    return { ok: false, error: "Name, email and password are all required." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address, e.g. name@company.com." };
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

  // The signup trigger creates the profile; upsert to make role/name exact.
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, name, role }, { onConflict: "id" });

  await recordAudit({
    action: "user.create",
    resourceType: "profile",
    resourceId: data.user.id,
    newValues: { email, name, role },
  });

  revalidatePath(RBAC_PATH);
  return { ok: true, error: null };
}

/** Change a user's role. Admin only; an admin cannot change their own role. */
export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const me = await requireRole("admin");

  if (!ALL_ROLES.includes(role)) {
    return { ok: false, error: "Invalid role." };
  }
  if (userId === me.id) {
    return { ok: false, error: "You can't change your own role." };
  }

  const supabase = await createClient();
  // Fetch the previous role so the audit row carries the diff.
  const { data: before } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "user.role_change",
    resourceType: "profile",
    resourceId: userId,
    oldValues: before ? { role: before.role } : null,
    newValues: { role },
  });

  revalidatePath(RBAC_PATH);
  return { ok: true };
}

/**
 * Activate or deactivate a user. Admin only; an admin cannot deactivate
 * their own account (would lock themselves out via the DAL).
 */
export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const me = await requireRole("admin");

  if (userId === me.id && !isActive) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  await recordAudit({
    action: "user.set_active",
    resourceType: "profile",
    resourceId: userId,
    newValues: { is_active: isActive },
  });

  revalidatePath(RBAC_PATH);
  return { ok: true };
}

/**
 * Grant or revoke a single (role, resource, action) permission.
 * Admin only. The `admin` role's permissions are fixed by design.
 */
export async function togglePermission(
  role: Role,
  resource: Resource,
  action: Action,
  enabled: boolean,
): Promise<ActionResult> {
  await requireRole("admin");

  if (role === "admin") {
    return { ok: false, error: "Admin permissions are fixed." };
  }
  if (!ALL_RESOURCES.includes(resource) || !ALL_ACTIONS.includes(action)) {
    return { ok: false, error: "Invalid permission." };
  }

  const supabase = await createClient();

  if (enabled) {
    const { error } = await supabase
      .from("permissions")
      .upsert(
        { role, resource, action },
        { onConflict: "role,resource,action", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("permissions")
      .delete()
      .match({ role, resource, action });
    if (error) return { ok: false, error: error.message };
  }

  await recordAudit({
    action: enabled ? "permission.grant" : "permission.revoke",
    resourceType: "permission",
    resourceId: `${role}:${resource}:${action}`,
    newValues: { role, resource, action },
  });

  revalidatePath(RBAC_PATH);
  return { ok: true };
}
