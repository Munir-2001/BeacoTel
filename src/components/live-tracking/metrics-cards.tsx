import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { REAL_TIME_METRICS } from "@/lib/mock-data";

export function MetricsCards() {
  const { densityAlerts } = REAL_TIME_METRICS;
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Real-time Metrics
      </h3>
      <div className="grid grid-cols-1 gap-3">
        <MetricCard
          label="Density Alerts"
          value={densityAlerts.value.toString().padStart(2, "0")}
          valueClassName="text-red-600"
          trailing={
            <TriangleAlert className="size-4 text-red-600" strokeWidth={2.2} />
          }
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trailing,
  valueClassName,
}: {
  label: string;
  value: number | string;
  trailing?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="rounded-xl border-border/70 bg-card p-4 shadow-none">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span
          className={`text-[28px] font-semibold leading-none tracking-tight ${valueClassName ?? "text-foreground"}`}
        >
          {value}
        </span>
        {trailing}
      </div>
    </Card>
  );
}
