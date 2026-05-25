import { getCurrentUser } from "@/lib/auth/dal";
import { listAuditLogs } from "@/lib/system-logs/list";
import { SystemLogsClient } from "@/components/system-logs/system-logs-client";

export default async function SystemLogsPage() {
  const [events, me] = await Promise.all([
    listAuditLogs(500),
    getCurrentUser(),
  ]);
  // CSV export is admin-only. Managers still see the full filterable feed but
  // can't bulk-export — that's the role-line we agreed on.
  const canExport = me.role === "admin";

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground">
          System Logs &amp; Event History
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Chronological record of property operations and staff activities.
        </p>
      </header>

      <SystemLogsClient events={events} canExport={canExport} />
    </div>
  );
}
