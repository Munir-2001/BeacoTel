import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Fetches the signed-in user's most recent audit rows for the topbar bell.
 * Uses the session client so the `audit_self_read` RLS policy is the gate.
 */

export type MyActivityRow = {
  id: string;
  action: string;
  /** Pre-rendered short message — same humanizer as System Logs. */
  message: string;
  /** ISO timestamp; client-side relative-time helper consumes it. */
  occurredAt: string;
};

export async function getMyRecentActivity(
  limit = 5,
): Promise<MyActivityRow[]> {
  const me = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, new_values, old_values, resource_id, occurred_at")
    .eq("actor_user_id", me.id)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id as string,
    action: r.action as string,
    message: shortHumanize(
      r.action as string,
      (r.new_values as Record<string, unknown> | null) ?? null,
      (r.old_values as Record<string, unknown> | null) ?? null,
      r.resource_id as string | null,
    ),
    occurredAt: r.occurred_at as string,
  }));
}

/**
 * Compact, first-person rephrasing — the bell shows what *you* did, so the
 * actor email is implicit. Keep these short; the popover is narrow.
 */
function shortHumanize(
  action: string,
  n: Record<string, unknown> | null,
  o: Record<string, unknown> | null,
  resourceId: string | null,
): string {
  switch (action) {
    case "login.success":
      return "Signed in";
    case "user.create":
      return `Created account for ${n?.email ?? "a user"}`;
    case "user.role_change":
      return o?.role
        ? `Changed role from ${o.role} to ${n?.role}`
        : `Set role to ${n?.role}`;
    case "user.set_active":
      return n?.is_active === false
        ? "Deactivated an account"
        : "Reactivated an account";
    case "permission.grant":
      return `Granted ${n?.action} on ${n?.resource} to ${n?.role}s`;
    case "permission.revoke":
      return `Revoked ${n?.action} on ${n?.resource} from ${n?.role}s`;
    case "staff.create":
      return `Added staff ${n?.name ?? n?.email ?? ""}`.trim();
    case "staff.update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `Updated ${fields.join(", ")} on a staff record`
        : "Updated a staff record";
    }
    case "profile.self_update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `Updated your profile (${fields.join(", ")})`
        : "Updated your profile";
    }
    case "inventory.added":
      return `Added ${n?.item ?? "asset"}${resourceId ? ` (${resourceId})` : ""}`;
    case "inventory.removed":
      return `Archived ${n?.item ?? "asset"}${resourceId ? ` (${resourceId})` : ""}`;
    case "inventory.assigned":
      return `Assigned ${n?.item ?? "asset"}${n?.to ? ` to ${n.to}` : ""}`;
    case "inventory.unassigned":
      return `Released ${n?.item ?? "asset"}${resourceId ? ` (${resourceId})` : ""}`;
    case "inventory.updated": {
      const fields = Object.keys(n ?? {}).filter((f) => f !== "_name");
      return fields.length
        ? `Updated ${n?._name ?? "asset"} (${fields.join(", ")})`
        : `Updated ${n?._name ?? "asset"}`;
    }
    case "equipment.status_change": {
      const target = n?.equipment ?? "Equipment";
      const next = prettyStatus(n?.status);
      const wasWith = o?.assignee ? ` (was with ${o.assignee})` : "";
      return `${target} → ${next}${wasWith}`;
    }
    case "equipment.inspection_completed":
      return `Inspected ${n?.equipment ?? "equipment"}`;
    case "equipment.maintenance_started":
      return `Started maintenance on ${n?.equipment ?? "equipment"}`;
    default:
      return action;
  }
}

function prettyStatus(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "updated";
  return raw
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
