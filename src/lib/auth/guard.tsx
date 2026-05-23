import { requirePermission } from "@/lib/auth/dal";
import type { Resource } from "@/lib/auth/permissions";

/**
 * Builds a route-segment layout that gates the whole segment behind a
 * "read" permission on `resource`. Drop a two-line `layout.tsx` into any
 * dashboard route to protect it — works for both Server and Client pages,
 * since the check runs in the (Server Component) layout, not the page.
 *
 *   // app/(dashboard)/analytics/layout.tsx
 *   import { permissionLayout } from "@/lib/auth/guard";
 *   export default permissionLayout("analytics");
 *
 * If the user lacks the permission, `requirePermission` calls `forbidden()`,
 * which renders app/forbidden.tsx (HTTP 403).
 */
export function permissionLayout(resource: Resource) {
  return async function GuardedLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    await requirePermission(resource, "read");
    return children;
  };
}
