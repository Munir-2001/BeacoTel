import { AlertTriangle, Boxes, CheckCheck, Wrench } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/auth/dal";
import { listAssets } from "@/lib/inventory/list";
import { Card } from "@/components/ui/card";
import { MaintenanceBoard } from "@/components/maintenance/maintenance-board";
import type { EquipmentStatus } from "@/lib/inventory/types";

export default async function MaintenancePage() {
  await requirePermission("maintenance", "read");

  const [assets, canEdit] = await Promise.all([
    listAssets(),
    hasPermission("maintenance", "update"),
  ]);

  const counts = countByStatus(assets);
  const needsAttention = counts.broken + counts.maintenance;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground">
            Maintenance
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Move assets across operational states and log inspections. Status
            changes and inspections both write to System Logs.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Needs Attention"
          value={needsAttention.toString()}
          icon={
            <AlertTriangle className="size-5 text-rose-700" strokeWidth={1.75} />
          }
          iconBg="bg-rose-100"
          valueClassName={needsAttention > 0 ? "text-rose-700" : undefined}
          sublabel={`${counts.broken} broken · ${counts.maintenance} in service`}
        />
        <Stat
          label="In Maintenance"
          value={counts.maintenance.toString()}
          icon={<Wrench className="size-5 text-amber-700" strokeWidth={1.75} />}
          iconBg="bg-amber-100"
        />
        <Stat
          label="In Use"
          value={counts.in_use.toString()}
          icon={<Boxes className="size-5 text-sky-700" strokeWidth={1.75} />}
          iconBg="bg-sky-100"
        />
        <Stat
          label="Available"
          value={counts.available.toString()}
          icon={
            <CheckCheck className="size-5 text-emerald-700" strokeWidth={1.75} />
          }
          iconBg="bg-emerald-100"
          valueClassName="text-emerald-700"
        />
      </div>

      <MaintenanceBoard assets={assets} canEdit={canEdit} />
    </div>
  );
}

function countByStatus(assets: { status: EquipmentStatus }[]) {
  const c: Record<EquipmentStatus, number> = {
    in_use: 0,
    available: 0,
    maintenance: 0,
    broken: 0,
    archived: 0,
  };
  for (const a of assets) c[a.status] += 1;
  return c;
}

function Stat({
  label,
  value,
  icon,
  iconBg,
  valueClassName,
  sublabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClassName?: string;
  sublabel?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`grid size-9 place-items-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p
        className={`mt-3 text-[32px] font-semibold leading-none tracking-tight ${
          valueClassName ?? "text-foreground"
        }`}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {sublabel}
        </p>
      ) : null}
    </Card>
  );
}
