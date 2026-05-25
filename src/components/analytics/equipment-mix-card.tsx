import { Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  prettyEquipmentStatus,
  type EquipmentMixSlice,
} from "@/lib/analytics/people-activity";
import { STATUS_PILL } from "@/lib/inventory-data";
import { cn } from "@/lib/utils";

/**
 * Stacked horizontal bar showing how the active equipment pool is divided
 * across statuses, with a small legend underneath. Uses the same pill colors
 * as the Asset Registry table so the page reads consistently.
 */
export function EquipmentMixCard({ slices }: { slices: EquipmentMixSlice[] }) {
  const total = slices.reduce((s, x) => s + x.count, 0);

  // Map status → tailwind bg class for the bar (solid). Pill backgrounds in
  // inventory-data.ts are tinted (bg-X-100); the legend uses those tints.
  const BAR_BG: Record<EquipmentMixSlice["status"], string> = {
    in_use: "bg-sky-500",
    available: "bg-emerald-500",
    maintenance: "bg-amber-500",
    broken: "bg-rose-500",
    archived: "bg-slate-400",
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header>
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
          <Wrench className="size-4 text-primary" strokeWidth={2} />
          Equipment Status Mix
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active asset pool across operational states.
        </p>
      </header>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No equipment registered yet.
        </p>
      ) : (
        <>
          <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {slices.map((s) =>
              s.count === 0 ? null : (
                <div
                  key={s.status}
                  className={cn("h-full", BAR_BG[s.status])}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${prettyEquipmentStatus(s.status)}: ${s.count}`}
                />
              ),
            )}
          </div>

          <ul className="mt-5 space-y-2.5">
            {slices.map((s) => {
              const pill = STATUS_PILL[s.status];
              return (
                <li
                  key={s.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block size-2.5 rounded-full",
                        BAR_BG[s.status],
                      )}
                    />
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        pill.className,
                      )}
                    >
                      {prettyEquipmentStatus(s.status)}
                    </span>
                  </span>
                  <span className="tabular-nums text-foreground">
                    {s.count}{" "}
                    <span className="text-muted-foreground">({s.pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
