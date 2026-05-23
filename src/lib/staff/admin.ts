import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/permissions";
import type { Department } from "@/lib/staff-data";

/**
 * Server-only reads for the Staff Directory page.
 *
 * `requirePermission("staff-directory", "read")` is the auth gate; manager and
 * admin both pass. After that gate, we use the service-role client to read
 * every profile row in one query — the profiles table only has a self-or-admin
 * SELECT policy, so the regular session client would not return other users
 * for a manager. Permission is enforced in this layer; the service-role client
 * is just the transport.
 */

export type StaffStats = {
  totalPersonnel: number;
  activeNow: number;
  adminOverrides: number;
  safetyPct: number;
};

export type StaffRow = {
  id: string;
  employeeId: string;
  department: Department | null;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

export async function listStaff(): Promise<StaffRow[]> {
  await requirePermission("staff-directory", "read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, name, email, role, is_active, last_login, created_at, employee_id, department",
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    employeeId: p.employee_id ?? "",
    department: (p.department as Department | null) ?? null,
    name: p.name,
    email: p.email,
    role: p.role as Role,
    isActive: p.is_active,
    lastLogin: p.last_login,
    createdAt: p.created_at,
  }));
}

export async function getStaffStats(): Promise<StaffStats> {
  const rows = await listStaff();
  const totalPersonnel = rows.length;
  const activeNow = rows.filter((r) => r.isActive).length;
  const adminOverrides = rows.filter((r) => r.role === "admin").length;
  const safetyPct =
    totalPersonnel === 0
      ? 100
      : Math.round((activeNow / totalPersonnel) * 100);
  return { totalPersonnel, activeNow, adminOverrides, safetyPct };
}
