import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import type {
  LogCategory,
  LogEvent,
  LogSeverity,
} from "@/lib/system-logs-data";

/**
 * Reads `audit_logs` and reshapes each row into the LogEvent DTO the existing
 * System Logs UI expects. RLS is the actual gate (admin sees all, manager
 * sees non-permission rows, every user sees their own); requirePermission is
 * a defensive belt-and-braces before the query.
 */

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  occurred_at: string;
};

export async function listAuditLogs(limit = 200): Promise<LogEvent[]> {
  await requirePermission("system-logs", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, actor_user_id, actor_email, action, resource_type, resource_id, old_values, new_values, occurred_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(rowToLogEvent);
}

/** Min/max occurred_at across the returned set, formatted for the date pill. */
export function dateRangeLabel(events: LogEvent[]): string {
  if (events.length === 0) return "No events";
  // events arrive newest-first
  const newest = parseTime(events[0]);
  const oldest = parseTime(events[events.length - 1]);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (
    newest.getFullYear() === oldest.getFullYear() &&
    newest.getMonth() === oldest.getMonth() &&
    newest.getDate() === oldest.getDate()
  ) {
    return `${fmt(newest)}, ${newest.getFullYear()}`;
  }
  return `${fmt(oldest)} – ${fmt(newest)}, ${newest.getFullYear()}`;
}

// --- internals ---------------------------------------------------------------

function rowToLogEvent(row: AuditRow): LogEvent {
  const ts = new Date(row.occurred_at);
  return {
    id: row.id,
    dayKey: dayKey(ts),
    dayLabel: dayLabel(ts),
    time: timeLabel(ts),
    occurredAt: row.occurred_at,
    category: categorize(row.action),
    severity: severityFor(row),
    message: humanize(row),
  };
}

function categorize(action: string): LogCategory {
  if (action.startsWith("permission.")) return "security";
  if (action.startsWith("equipment.")) return "maintenance";
  if (action.startsWith("inventory.")) return "inventory";
  // login, user.*, staff.*, profile.* — all are people-activity events.
  return "staff";
}

function severityFor(row: AuditRow): LogSeverity {
  if (
    row.action === "user.create" ||
    row.action === "staff.create" ||
    row.action === "equipment.inspection_completed"
  ) {
    return "success";
  }
  if (row.action === "user.set_active") {
    const isActive = (row.new_values as { is_active?: boolean } | null)?.is_active;
    return isActive === false ? "alert" : "info";
  }
  if (row.action === "permission.revoke") return "alert";
  if (row.action === "inventory.removed") return "alert";
  return "info";
}

function humanize(row: AuditRow): string {
  const actor = row.actor_email ?? "System";
  const n = row.new_values as Record<string, unknown> | null;
  const o = row.old_values as Record<string, unknown> | null;

  switch (row.action) {
    case "login.success":
      return `${actor} signed in`;
    case "user.create":
      return `${actor} created account ${n?.email ?? ""} as ${n?.role ?? "staff"}`.trim();
    case "user.role_change":
      return o?.role
        ? `${actor} changed role from ${o.role} to ${n?.role}`
        : `${actor} set role to ${n?.role}`;
    case "user.set_active":
      return n?.is_active === false
        ? `${actor} deactivated an account`
        : `${actor} reactivated an account`;
    case "permission.grant":
      return `${actor} granted ${n?.action} on ${n?.resource} to ${n?.role}s`;
    case "permission.revoke":
      return `${actor} revoked ${n?.action} on ${n?.resource} from ${n?.role}s`;
    case "staff.create":
      return `${actor} added staff member ${n?.name ?? n?.email ?? ""}`.trim();
    case "staff.update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `${actor} updated staff fields: ${fields.join(", ")}`
        : `${actor} updated a staff record`;
    }
    case "profile.self_update": {
      const fields = Object.keys(n ?? {});
      return fields.length
        ? `${actor} updated own profile (${fields.join(", ")})`
        : `${actor} updated own profile`;
    }
    case "equipment.status_change": {
      const name = (n?.equipment as string | undefined) ?? "Equipment";
      const code = row.resource_id ? ` (${row.resource_id})` : "";
      const newStatus = prettyStatus(n?.status);
      const oldStatus = prettyStatus(o?.status);
      const previousAssignee = o?.assignee
        ? ` — last assigned to ${o.assignee}`
        : "";
      return oldStatus
        ? `Equipment: ${name}${code} moved from ${oldStatus} to ${newStatus}${previousAssignee}`
        : `Equipment: ${name}${code} marked as ${newStatus}${previousAssignee}`;
    }
    case "equipment.inspection_completed":
      return `Maintenance: ${n?.equipment ?? "Equipment"} inspection completed${
        n?.by ? ` by ${n.by}` : ""
      }`;
    case "equipment.maintenance_started":
      return `Maintenance: ${n?.equipment ?? "Equipment"} taken offline for service${
        n?.reason ? ` (${n.reason})` : ""
      }`;
    case "inventory.removed":
      return `Inventory Alert: ${n?.item ?? "Item"} removed${
        n?.location ? ` from ${n.location}` : ""
      }`;
    case "inventory.added":
      return `Inventory: ${n?.item ?? "Item"} added${
        n?.location ? ` to ${n.location}` : ""
      }`;
    case "inventory.assigned":
      return `Inventory: ${n?.item ?? "Item"} assigned${
        n?.to ? ` to ${n.to}` : ""
      }`;
    case "inventory.unassigned":
      return `Inventory: ${n?.item ?? "Item"} released${
        o?.from ? ` by ${o.from}` : ""
      }`;
    case "inventory.updated": {
      const fields = Object.keys(n ?? {});
      const name = (n?._name as string | undefined) ?? "asset";
      return fields.length
        ? `Inventory: ${name} updated (${fields.filter((f) => f !== "_name").join(", ")})`
        : `Inventory: ${name} updated`;
    }
    default:
      return `${actor} performed ${row.action}`;
  }
}

function prettyStatus(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "updated";
  return raw
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date): string {
  const now = new Date();
  if (sameDay(d, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "yesterday";
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): string {
  const now = new Date();
  const short = d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  if (sameDay(d, now)) return `Today, ${short}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday, ${short}`;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// dateRangeLabel needs a Date from a LogEvent; the time-only `time` field is
// formatted, so we keep a tiny helper that just re-parses the day from dayKey
// — fine for the YYYY-MM-DD case; "today"/"yesterday" are inferred relative
// to now() and round-trip correctly.
function parseTime(ev: LogEvent): Date {
  if (ev.dayKey === "today") return new Date();
  if (ev.dayKey === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  return new Date(ev.dayKey);
}
