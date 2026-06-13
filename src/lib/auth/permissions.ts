/**
 * RBAC vocabulary shared across the proxy, the Data Access Layer and the UI.
 *
 * This file is runtime-agnostic (no `server-only`, no Node APIs) so it can be
 * imported by `proxy.ts` for fast *optimistic* route checks. The authoritative
 * fine-grained checks live in the Data Access Layer (`dal.ts`) and are backed
 * by the `permissions` table + Postgres RLS.
 */

export type Role = "admin" | "manager" | "staff";

/** One resource per dashboard page. Matches `permissions.resource` in SQL. */
export type Resource =
  | "live-tracking"
  | "staff-directory"
  | "personal-portal"
  | "inventory"
  | "maintenance"
  | "rfid-tracking"
  | "analytics"
  | "system-logs"
  | "rbac-settings";

export type Action = "read" | "create" | "update" | "delete";

/** All roles, resources and actions — ordered, for rendering the RBAC matrix. */
export const ALL_ROLES: Role[] = ["admin", "manager", "staff"];
export const ALL_ACTIONS: Action[] = ["read", "create", "update", "delete"];
export const ALL_RESOURCES: Resource[] = [
  "live-tracking",
  "staff-directory",
  "personal-portal",
  "inventory",
  "maintenance",
  "rfid-tracking",
  "analytics",
  "system-logs",
  "rbac-settings",
];

/** Human-readable label for a resource. */
export const RESOURCE_LABEL: Record<Resource, string> = {
  "live-tracking": "Live Tracking",
  "staff-directory": "Staff Directory",
  "personal-portal": "Personal Portal",
  "inventory": "Inventory & Assets",
  "maintenance": "Maintenance",
  "rfid-tracking": "RFID Tracking",
  "analytics": "Analytics",
  "system-logs": "System Logs",
  "rbac-settings": "RBAC Settings",
};

/** Route prefix -> the resource it belongs to. */
export const RESOURCE_BY_ROUTE: Record<string, Resource> = {
  "/live-tracking": "live-tracking",
  "/staff-directory": "staff-directory",
  "/personal-portal": "personal-portal",
  "/inventory": "inventory",
  "/maintenance": "maintenance",
  "/rfid-tracking": "rfid-tracking",
  "/analytics": "analytics",
  "/system-logs": "system-logs",
  "/rbac-settings": "rbac-settings",
};

/**
 * Which roles may *view* (read) each page. This static map mirrors the
 * `(role, resource, 'read')` rows seeded in 0001_auth_rbac.sql and is used
 * only for the optimistic redirect in the proxy. The DAL re-checks against
 * the database, and RLS is the final gate — so a stale entry here can never
 * grant unauthorized data access, only a slightly-wrong redirect.
 */
export const PAGE_READ_ROLES: Record<Resource, Role[]> = {
  "live-tracking": ["admin", "manager"],
  "staff-directory": ["admin", "manager"],
  "personal-portal": ["admin", "manager", "staff"],
  // Inventory is admin/manager only as of migration 0007. Staff release
  // their assigned equipment through the My Assets card on /personal-portal.
  "inventory": ["admin", "manager"],
  "maintenance": ["admin", "manager"],
  "rfid-tracking": ["admin", "manager"],
  "analytics": ["admin", "manager"],
  "system-logs": ["admin", "manager"],
  "rbac-settings": ["admin"],
};

/** Resolve the resource for a pathname, or null if the path is not a page. */
export function resourceForPath(pathname: string): Resource | null {
  for (const [prefix, resource] of Object.entries(RESOURCE_BY_ROUTE)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return resource;
    }
  }
  return null;
}

/** Optimistic check: may this role open this page? */
export function canViewPage(role: Role, resource: Resource): boolean {
  return PAGE_READ_ROLES[resource].includes(role);
}
