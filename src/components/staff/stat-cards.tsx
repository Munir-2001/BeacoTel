import { Users, Zap, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { StaffStats as StaffStatsData } from "@/lib/staff/admin";

export function StaffStats({ stats }: { stats: StaffStatsData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Personnel"
        value={stats.totalPersonnel.toString()}
        icon={<Users className="size-5 text-sky-700" strokeWidth={1.75} />}
        iconBg="bg-sky-100"
      />
      <StatCard
        label="Active Now"
        value={stats.activeNow.toString()}
        icon={<Zap className="size-5 text-emerald-700 fill-emerald-700" strokeWidth={0} />}
        iconBg="bg-emerald-100"
        valueClassName="text-emerald-700"
      />
      <StatCard
        label="Admin Overrides"
        value={stats.adminOverrides.toString()}
        icon={<ShieldAlert className="size-5 text-indigo-700" strokeWidth={1.75} />}
        iconBg="bg-indigo-100"
      />
      <StatCard
        label="Active %"
        value={`${stats.safetyPct}%`}
        icon={<ShieldCheck className="size-5 text-indigo-700" strokeWidth={1.75} />}
        iconBg="bg-indigo-100"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClassName?: string;
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
    </Card>
  );
}
