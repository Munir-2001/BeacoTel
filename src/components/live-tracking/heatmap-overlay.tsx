"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VIEWBOX_W = 1200;
const VIEWBOX_H = 480;
const CELL = 30; // viewBox units per heatmap cell — must match heatmap_cell_xy in migration 0015
const COLS = Math.ceil(VIEWBOX_W / CELL);
const ROWS = Math.ceil(VIEWBOX_H / CELL);

export type HeatmapWindow = "1h" | "6h" | "24h" | "7d";

export const HEATMAP_WINDOWS: { value: HeatmapWindow; label: string }[] = [
  { value: "1h", label: "Last hour" },
  { value: "6h", label: "Last 6h" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
];

/** Cool → warm color ramp shared by the heatmap cells and the legend. */
export const HEAT_STOPS: { at: number; r: number; g: number; b: number }[] = [
  { at: 0.0, r: 56, g: 189, b: 248 }, // sky-400
  { at: 0.5, r: 251, g: 191, b: 36 }, // amber-400
  { at: 1.0, r: 244, g: 63, b: 94 }, // rose-500
];

type CellRow = { cell_x: number; cell_y: number; hits: number };
type Status = "idle" | "loading" | "ready" | "error";

export type HeatmapStats = {
  /** Total hits summed across all cells in the window. */
  sampleCount: number;
  /** Densest cell's hit count (≥ 1 when any data is present). */
  maxPerCell: number;
  /** Kept for API compatibility; the rollup is cumulative across beacons. */
  uniqueBeacons: number[];
};

/**
 * Renders the pre-aggregated heatmap from public.heatmap_cells via the
 * `heatmap_window` RPC (migration 0015): per-cell hit counts summed over the
 * chosen time window, colored by the shared ramp. Cumulative across all
 * beacons; intensity is relative to the densest cell in the window.
 */
export function HeatmapOverlay({
  window,
  onStats,
}: {
  window: HeatmapWindow;
  /**
   * Called whenever a fetch completes — lets the parent surface counts in the
   * chrome (pill, legend) without re-querying.
   */
  onStats?: (stats: HeatmapStats) => void;
}) {
  const [grid, setGrid] = useState<number[]>([]);
  const [max, setMax] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const since = new Date();
    if (window === "1h") since.setHours(since.getHours() - 1);
    else if (window === "6h") since.setHours(since.getHours() - 6);
    else if (window === "24h") since.setHours(since.getHours() - 24);
    else since.setDate(since.getDate() - 7);

    const supabase = createClient();
    supabase
      .rpc("heatmap_window", { since: since.toISOString() })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[heatmap] rollup fetch failed", error);
          setStatus("error");
          setGrid([]);
          setMax(0);
          onStats?.({ sampleCount: 0, maxPerCell: 0, uniqueBeacons: [] });
          return;
        }
        const next = new Array(ROWS * COLS).fill(0);
        let m = 0;
        let total = 0;
        for (const r of (data ?? []) as CellRow[]) {
          const idx = r.cell_y * COLS + r.cell_x;
          if (idx < 0 || idx >= next.length) continue;
          const hits = Number(r.hits);
          next[idx] = hits;
          total += hits;
          if (hits > m) m = hits;
        }
        setGrid(next);
        setMax(m);
        setStatus("ready");
        onStats?.({ sampleCount: total, maxPerCell: m, uniqueBeacons: [] });
      });

    return () => {
      cancelled = true;
    };
    // onStats intentionally excluded — its identity isn't stable in callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window]);

  if (status === "loading" || status === "idle") return null;

  if (max === 0) {
    return (
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden
      >
        <g transform={`translate(${VIEWBOX_W / 2}, ${VIEWBOX_H / 2})`}>
          <rect
            x={-190}
            y={-32}
            width={380}
            height={64}
            rx={12}
            fill="rgba(255,255,255,0.95)"
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          <text
            x={0}
            y={-6}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="#0F172A"
            fontFamily="ui-sans-serif, system-ui"
          >
            No history in this window
          </text>
          <text
            x={0}
            y={14}
            textAnchor="middle"
            fontSize="10"
            fill="#64748B"
            fontFamily="ui-sans-serif, system-ui"
          >
            {status === "error"
              ? "Couldn't load the heatmap rollup."
              : "Try a wider window, or start the Pi feed."}
          </text>
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full mix-blend-multiply"
      aria-hidden
    >
      {grid.map((count, i) => {
        if (count === 0) return null;
        const cx = i % COLS;
        const cy = Math.floor(i / COLS);
        const t = count / max;
        return (
          <rect
            key={i}
            x={cx * CELL}
            y={cy * CELL}
            width={CELL}
            height={CELL}
            fill={heatColor(t)}
          />
        );
      })}
    </svg>
  );
}

/** Public ramp evaluator — same path the legend uses to draw its gradient. */
export function heatColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = HEAT_STOPS[0];
  let hi = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (clamped >= HEAT_STOPS[i].at && clamped <= HEAT_STOPS[i + 1].at) {
      lo = HEAT_STOPS[i];
      hi = HEAT_STOPS[i + 1];
      break;
    }
  }
  const span = hi.at - lo.at || 1;
  const k = (clamped - lo.at) / span;
  const r = Math.round(lo.r + (hi.r - lo.r) * k);
  const g = Math.round(lo.g + (hi.g - lo.g) * k);
  const b = Math.round(lo.b + (hi.b - lo.b) * k);
  const alpha = 0.18 + 0.6 * clamped;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
