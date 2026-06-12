import "server-only";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * The set of audit actions we currently emit. Keeping this as a union (and
 * the literal strings in one place) makes it cheap to grep for callers when
 * we rename or retire an action.
 */
export type AuditAction =
  | "login.success"
  | "user.create"
  | "user.role_change"
  | "user.set_active"
  | "permission.grant"
  | "permission.revoke"
  | "staff.create"
  | "staff.update"
  | "profile.self_update"
  | "inventory.removed"
  | "inventory.added"
  | "inventory.updated"
  | "inventory.assigned"
  | "inventory.unassigned"
  | "equipment.status_change"
  | "equipment.inspection_completed"
  | "equipment.maintenance_started"
  | "asset.moved_alert";

export type AuditResourceType =
  | "profile"
  | "permission"
  | "equipment"
  | "inventory";

export type RecordAuditInput = {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  /** Optional snapshot of the row's previous values (just the fields that changed). */
  oldValues?: Record<string, unknown> | null;
  /** Optional snapshot of the new values. */
  newValues?: Record<string, unknown> | null;
  /**
   * Override the actor — defaults to the signed-in user. Pass explicitly when
   * the action runs *before* a session exists (e.g. `login.success` builds the
   * session, but we want the row attributed to the user being logged in).
   */
  actor?: { id: string | null; email: string | null } | null;
};

/**
 * Append one row to public.audit_logs. Never throws — auditing must not break
 * the calling action. Errors are logged to the server console so we can spot
 * misconfiguration without crashing legitimate writes.
 *
 * Uses the service-role client because audit_logs has no insert policy: this
 * is the *only* way rows land in the table, which is what makes the audit
 * trail trustworthy.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    // Resolve actor: explicit override > session user > null. We use the
    // session-bound client (not the service-role one) to read the user so the
    // cookie-based session is honored.
    let actorId: string | null = input.actor?.id ?? null;
    let actorEmail: string | null = input.actor?.email ?? null;
    if (actorId === null) {
      const session = await createClient();
      const { data } = await session.auth.getUser();
      actorId = data?.user?.id ?? null;
      actorEmail = data?.user?.email ?? null;
    }

    const admin = createAdminClient();

    // Request metadata — best-effort; missing headers (e.g. tests) are fine.
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent");

    const { error } = await admin.from("audit_logs").insert({
      actor_user_id: actorId,
      actor_email: actorEmail,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error(
        `[audit] failed to record ${input.action}: ${error.message}`,
      );
    }
  } catch (err) {
    console.error("[audit] unexpected error:", err);
  }
}
