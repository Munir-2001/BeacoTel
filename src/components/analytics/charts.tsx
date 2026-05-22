import { MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DWELL_TIMES, PEAK_OCCUPANCY } from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

export function PeakOccupancyCard() {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            Peak Occupancy Trend
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Hourly average vs. Capacity
          </p>
        </div>
        <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
          +{PEAK_OCCUPANCY.deltaPct}%
        </span>
      </header>

      <div className="mt-5 flex h-32 items-end justify-between gap-2">
        {PEAK_OCCUPANCY.bars.map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t-sm transition-colors",
              i === PEAK_OCCUPANCY.peakIndex ? "bg-primary" : "bg-sky-100"
            )}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
    </Card>
  );
}

export function AvgDwellTimeCard() {
  const max = Math.max(...DWELL_TIMES.map((d) => d.minutes));
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            Average Dwell Time
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Minutes per primary zone
          </p>
        </div>
        <button
          aria-label="Card menu"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="size-4" strokeWidth={2} />
        </button>
      </header>

      <ul className="mt-5 space-y-4">
        {DWELL_TIMES.map((d) => (
          <li
            key={d.zone}
            className="grid grid-cols-[80px_1fr_50px] items-center gap-3 text-sm"
          >
            <span className="text-muted-foreground">{d.zone}</span>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-700"
                style={{ width: `${(d.minutes / max) * 100}%` }}
              />
            </div>
            <span className="text-right font-medium text-foreground">{d.minutes}m</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
