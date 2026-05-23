import "server-only";

import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_BY_ROUTE } from "@/lib/auth/permissions";
import type { Action, Resource, Role } from "@/lib/auth/permissions";

/** Route for each resource (inverse of RESOURCE_BY_ROUTE). */
const ROUTE_BY_RESOURCE = Object.fromEntries(
  Object.entries(RESOURCE_BY_ROUTE).map(([route, res]) => [res, route]),
) as Record<Resource, string>;

/** Order in which a landing page is chosen — first one the user can read wins. */
const LANDING_PRIORITY: Resource[] = [
  "live-tracking",
  "analytics",
  "staff-directory",
  "personal-portal",
  "inventory",
  "maintenance",
  "system-logs",
  "rbac-settings",
];

/**
 * Data Access Layer — the authoritative authorization gate.
 *
 * Every Server Component page, Server Action and Route Handler that touches
 * protected data must go through here. The proxy is only an optimistic
 * pre-filter; Postgres RLS is the final backstop. This layer sits in between:
 * it re-verifies the session server-side and checks fine-grained permissions.
 *
 * All exports are wrapped in React `cache()`, so within a single request the
 * session and permission lookups run at most once.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

/**
 * Verify the session. Returns the user id + role from the *validated* JWT.
 * Redirects to /login if there is no valid session.
 */
export const verifySession = cache(async (): Promise<{
  userId: string;
  role: Role;
}> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;
  if (error || !claims?.sub) {
    redirect("/login");
  }

  return {
    userId: claims.sub as string,
    role: ((claims.user_role as Role) ?? "staff") satisfies Role,
  };
});

/**
 * Full profile of the signed-in user, as a DTO (no sensitive columns).
 * Redirects to /login if unauthenticated; redirects deactivated accounts out.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    redirect("/login");
  }
  if (!data.is_active) {
    redirect("/login?error=account-disabled");
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as Role,
    isActive: data.is_active,
  };
});

/**
 * Every (resource, action) pair allowed for the current user's role.
 * Read from the `permissions` table — the editable source of truth.
 */
const loadPermissions = cache(async (): Promise<Set<string>> => {
  const { role } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permissions")
    .select("resource, action")
    .eq("role", role);

  if (error || !data) return new Set();
  return new Set(data.map((p) => `${p.resource}:${p.action}`));
});

/** Non-throwing check — use for conditionally rendering UI. */
export async function hasPermission(
  resource: Resource,
  action: Action,
): Promise<boolean> {
  return (await loadPermissions()).has(`${resource}:${action}`);
}

/** Every resource the current user may read — used to filter the sidebar nav. */
export async function getReadableResources(): Promise<Resource[]> {
  const perms = await loadPermissions();
  const resources = new Set<Resource>();
  for (const entry of perms) {
    const [resource, action] = entry.split(":");
    if (action === "read") resources.add(resource as Resource);
  }
  return [...resources];
}

/**
 * The route to send the current user to after login / from `/`.
 * Role-aware: picks the first page they may actually open, so a user whose
 * role lacks Live Tracking never lands on a 403.
 */
export async function getLandingPath(): Promise<string> {
  const readable = new Set(await getReadableResources());
  const first = LANDING_PRIORITY.find((r) => readable.has(r));
  return first ? ROUTE_BY_RESOURCE[first] : "/login";
}

/**
 * Throwing check — use at the top of a protected page / action / route.
 * Renders the 403 page (forbidden.tsx) if the user lacks the permission.
 */
export async function requirePermission(
  resource: Resource,
  action: Action = "read",
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!(await hasPermission(resource, action))) {
    forbidden();
  }
  return user;
}

/** Throwing check by role. Renders the 403 page if the role does not match. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    forbidden();
  }
  return user;
}
