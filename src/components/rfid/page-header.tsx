import { Refrigerator, PackageOpen, Tags } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { RfidStats } from "@/lib/rfid/types";

export function PageHeader({ stats }: { stats: RfidStats }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-xl">
        <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-foreground">
          RFID Tracking
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Live withdrawal monitoring for RFID-tagged soft assets at the fridge.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard
          icon={<Tags className="size-5 text-indigo-600" strokeWidth={2} />}
          iconBg="bg-indigo-50"
          label="Registered Tags"
          value={stats.totalTags.toLocaleString()}
        />
        <StatCard
          icon={<Refrigerator className="size-5 text-emerald-600" strokeWidth={2} />}
          iconBg="bg-emerald-50"
          label="In Fridge"
          value={stats.inFridge.toLocaleString()}
          valueClassName="text-emerald-600"
        />
        <StatCard
          icon={<PackageOpen className="size-5 text-amber-600" strokeWidth={2} />}
          iconBg="bg-amber-50"
          label="Withdrawn Today"
          value={stats.withdrawnToday.toLocaleString()}
          valueClassName="text-amber-600"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card className="flex w-[210px] flex-row items-center gap-4 rounded-2xl border-border/70 bg-card p-4 shadow-none">
      <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-1 text-[26px] font-semibold leading-none tracking-tight ${valueClassName ?? "text-foreground"}`}
        >
          {value}
        </p>
      </div>
    </Card>
  );
}
