"use client";

import { HEAT_STOPS, heatColor } from "./heatmap-overlay";

/**
 * Floating legend for the heatmap. Renders a horizontal gradient bar with
 * "Low / High" anchors plus a tick at the densest cell's value, then a
 * small summary block underneath.
 */
export function HeatmapLegend({
  sampleCount,
  maxPerCell,
  windowLabel,
  beaconFilter,
}: {
  sampleCount: number;
  maxPerCell: number;
  windowLabel: string;
  beaconFilter: number | null;
}) {
  // Build a CSS linear-gradient that matches `heatColor` at 0/0.5/1 stops.
  const gradient = `linear-gradient(to right, ${heatColor(0)}, ${heatColor(0.5)}, ${heatColor(1)})`;

  // Mid tick — show "≈ max/2 visits" so the operator can read the gradient
  // without having to interpolate.
  const midTick = Math.max(1, Math.round(maxPerCell / 2));

  return (
    <aside
      className="pointer-events-auto absolute left-6 bottom-6 z-20 w-[260px] rounded-2xl bg-white/95 p-3.5 text-foreground shadow-md ring-1 ring-black/5"
      aria-label="Heatmap legend"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
          Density
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          per cell
        </span>
      </header>

      {/* Gradient bar with ticks under it. */}
      <div className="mt-2.5">
        <div
          className="h-3 w-full rounded-full ring-1 ring-black/10"
          style={{ background: gradient }}
          aria-hidden
        />
        <div className="mt-1 flex justify-between text-[10px] font-semibold tabular-nums text-foreground/80">
          <span>1</span>
          <span>{midTick}</span>
          <span>{Math.max(1, maxPerCell)}</span>
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>Low</span>
          <span>Mid</span>
          <span>High</span>
        </div>
      </div>

      {/* Summary block. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-foreground/10 pt-3 text-[11px]">
        <dt className="text-muted-foreground">Window</dt>
        <dd className="text-right font-semibold tabular-nums">
          {windowLabel}
        </dd>
        <dt className="text-muted-foreground">Samples</dt>
        <dd className="text-right font-semibold tabular-nums">
          {sampleCount.toLocaleString()}
        </dd>
        <dt className="text-muted-foreground">Beacon</dt>
        <dd className="text-right font-semibold tabular-nums">
          {beaconFilter == null ? "All" : `#${beaconFilter}`}
        </dd>
      </dl>
    </aside>
  );
}
