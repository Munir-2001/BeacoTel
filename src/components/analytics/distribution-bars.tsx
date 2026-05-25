import { Card } from "@/components/ui/card";
import type { DistributionBar } from "@/lib/analytics/people-activity";
import { cn } from "@/lib/utils";

/**
 * Horizontal bar list. Each bar's fill width is `pct` (relative to the
 * largest in the series) so the leader always reaches the right edge.
 */
export function DistributionBars({
  title,
  subtitle,
  bars,
  accent = "primary",
  emptyLabel = "No data yet.",
}: {
  title: string;
  subtitle?: string;
  bars: DistributionBar[];
  accent?: "primary" | "emerald" | "sky" | "indigo";
  emptyLabel?: string;
}) {
  const colorFill: Record<typeof accent, string> = {
    primary: "bg-primary",
    emerald: "bg-emerald-600",
    sky: "bg-sky-600",
    indigo: "bg-indigo-600",
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header>
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      {bars.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {bars.map((b) => (
            <li key={b.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{b.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {b.value}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    colorFill[accent],
                  )}
                  style={{ width: `${Math.max(b.pct, 4)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
