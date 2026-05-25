"use server";

import { createClient } from "@/lib/supabase/server";
import type { AuditResourceType } from "@/lib/audit/log";

/**
 * Server Action returning the recent activity for a single resource. Used by
 * the "Activity history" section inside edit sheets. Gating is done by the
 * audit_logs RLS policies (admin sees all, manager skips permission rows,
 * everyone sees their own); the action just forwards whatever RLS returns.
 */

export type HistoryItem = {
  id: string;
  occurredAt: string;
  /** First-person if we're the actor, third-person otherwise. */
  message: string;
  actorEmail: string | null;
  actorIsMe: boolean;
};

export async function getResourceHistory(
  resourceType: AuditResourceType,
  resourceId: string,
  limit = 20,
): Promise<HistoryItem[]> {
  if (!resourceId) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const myId = user?.id ?? null;

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, action, new_values, old_values, resource_id, occurred_at, actor_user_id, actor_email",
    )
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id as string,
    occurredAt: r.occurred_at as string,
    actorEmail: (r.actor_email as string | null) ?? null,
    actorIsMe: r.actor_user_id === myId,
    message: humanize(
      r.action as string,
      (r.new_values as Record<string, unknown> | null) ?? null,
      (r.old_values as Record<string, unknown> | null) ?? null,
      r.actor_user_id === myId,
      (r.actor_email as string | null) ?? null,
    ),
  }));
}

function humanize(
  action: string,
  n: Record<string, unknown> | null,
  o: Record<string, unknown> | null,
  actorIsMe: boolean,
  actorEmail: string | null,
): string {
  const who = actorIsMe ? "You" : actorEmail ?? "Someone";
  switch (action) {
    case "login.success":
      return `${who} signed in`;
    case "user.create":
      return `${who} created the account (${n?.role ?? "staff"})`;
    case "user.role_change":
      return o?.role
        ? `${who} changed role from ${o.role} to ${n?.role}`
        : `${who} set role to ${n?.role}`;
    case "user.set_active":
      return n?.is_active === false
        ? `${who} deactivated this account`
        : `${who} reactivated this account`;
    case "staff.create":
      return `${who} added this staff member`;
    case "staff.update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `${who} updated ${fields.join(", ")}`
        : `${who} updated this record`;
    }
    case "profile.self_update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `${who} updated their own profile (${fields.join(", ")})`
        : `${who} updated their own profile`;
    }
    case "permission.grant":
      return `${who} granted ${n?.action} on ${n?.resource}`;
    case "permission.revoke":
      return `${who} revoked ${n?.action} on ${n?.resource}`;
    case "inventory.added":
      return `${who} registered this asset`;
    case "inventory.removed":
      return `${who} archived this asset`;
    case "inventory.updated": {
      const fields = Object.keys(n ?? {}).filter((f) => f !== "_name");
      return fields.length
        ? `${who} updated ${fields.join(", ")}`
        : `${who} updated this asset`;
    }
    case "inventory.assigned":
      return `${who} assigned to ${n?.to ?? "a staff member"}`;
    case "inventory.unassigned":
      return o?.from
        ? `${who} released this asset (was with ${o.from})`
        : `${who} released this asset`;
    case "equipment.status_change": {
      const wasWith = o?.assignee ? ` (last with ${o.assignee})` : "";
      return o?.status
        ? `${who} changed status from ${pretty(o.status)} to ${pretty(n?.status)}${wasWith}`
        : `${who} set status to ${pretty(n?.status)}${wasWith}`;
    }
    case "equipment.inspection_completed":
      return `${who} marked this asset as inspected`;
    case "equipment.maintenance_started":
      return `${who} took this asset offline for service`;
    default:
      return `${who} performed ${action}`;
  }
}

function pretty(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "updated";
  return raw
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
