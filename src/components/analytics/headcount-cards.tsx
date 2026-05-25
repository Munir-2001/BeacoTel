import { ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { HeadcountStats } from "@/lib/analytics/people-activity";

export function HeadcountCards({ stats }: { stats: HeadcountStats }) {
  const activePct =
    stats.total === 0 ? 0 : Math.round((stats.active / stats.total) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Total Personnel"
        value={stats.total.toString()}
        icon={<Users className="size-5 text-sky-700" strokeWidth={1.75} />}
        iconBg="bg-sky-100"
      />
      <Stat
        label="Active"
        value={stats.active.toString()}
        icon={<UserCheck className="size-5 text-emerald-700" strokeWidth={1.75} />}
        iconBg="bg-emerald-100"
        valueClassName="text-emerald-700"
      />
      <Stat
        label="Inactive"
        value={stats.inactive.toString()}
        icon={<UserX className="size-5 text-rose-700" strokeWidth={1.75} />}
        iconBg="bg-rose-100"
        valueClassName={stats.inactive > 0 ? "text-rose-700" : undefined}
      />
      <Stat
        label="Active Share"
        value={`${activePct}%`}
        icon={<ShieldCheck className="size-5 text-indigo-700" strokeWidth={1.75} />}
        iconBg="bg-indigo-100"
      />
    </div>
  );
}

function Stat({
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
