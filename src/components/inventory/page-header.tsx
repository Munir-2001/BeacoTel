import { Shapes, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { INVENTORY_STATS } from "@/lib/inventory-data";

export function PageHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-xl">
        <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-foreground">
          Inventory &amp; Assets Management — Refined
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Real-time oversight of luxury hardware and structural assets.
        </p>
      </div>

      <div className="flex gap-3">
        <StatCard
          icon={<Shapes className="size-5 text-indigo-600" strokeWidth={2} />}
          iconBg="bg-indigo-50"
          label="Total Assets"
          value={INVENTORY_STATS.total.toLocaleString()}
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-emerald-600" strokeWidth={2} />}
          iconBg="bg-emerald-50"
          label="New This Month"
          value={`+${INVENTORY_STATS.newThisMonth}`}
          valueClassName="text-emerald-600"
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
    <Card className="flex w-[230px] flex-row items-center gap-4 rounded-2xl border-border/70 bg-card p-4 shadow-none">
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
