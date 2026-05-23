import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/permissions";
import type { Department } from "@/lib/staff-data";

/**
 * The signed-in user's own profile, in the shape the Personal Portal renders.
 * Uses the session client so the row is read through `profiles_update_self`
 * RLS — no service-role needed for self-reads.
 */

export type MyProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  employeeId: string;
  department: Department | null;
  lastLogin: string | null;
};

export async function getMyProfile(): Promise<MyProfile> {
  const me = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active, employee_id, department, last_login")
    .eq("id", me.id)
    .single();

  if (error || !data) {
    // Fall back to the DAL view — name/email/role are always present there.
    return {
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      isActive: me.isActive,
      employeeId: "",
      department: null,
      lastLogin: null,
    };
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as Role,
    isActive: data.is_active,
    employeeId: data.employee_id ?? "",
    department: (data.department as Department | null) ?? null,
    lastLogin: data.last_login,
  };
}
