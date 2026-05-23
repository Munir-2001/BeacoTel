import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/permissions";

/**
 * Server-only read functions for the RBAC Settings admin panel.
 * Every function is admin-gated; mutations live in `admin-actions.ts`.
 */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

/** All user accounts. Admin only. */
export async function listUsers(): Promise<AdminUser[]> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active, last_login, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as Role,
    isActive: p.is_active,
    lastLogin: p.last_login,
    createdAt: p.created_at,
  }));
}

/**
 * The full permission matrix as a Set of `role:resource:action` keys —
 * convenient for O(1) lookups when rendering checkboxes. Admin only.
 */
export async function listPermissions(): Promise<Set<string>> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permissions")
    .select("role, resource, action");

  if (error || !data) return new Set();
  return new Set(data.map((p) => `${p.role}:${p.resource}:${p.action}`));
}
