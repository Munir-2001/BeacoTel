"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toViewBox } from "@/lib/positioning/coords";

const VIEWBOX_W = 1200;
const VIEWBOX_H = 480;
const CELL = 30; // viewBox units per heatmap cell
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

type HistoryRow = { x: number; y: number; beacon_id: number };
type Status = "idle" | "loading" | "ready" | "error";

export type HeatmapStats = {
  /** Total rows fetched in the window after any beacon filter. */
  sampleCount: number;
  /** Densest cell's hit count (≥ 1 when any data is present). */
  maxPerCell: number;
  /** Distinct beacon IDs seen in the window (pre-filter). */
  uniqueBeacons: number[];
};

/**
 * Reads from `beacon_position_history`, bins positions into cells, and
 * renders them as a colored density layer over the floor plan.
 *
 * Window filter is mandatory (1h / 24h / 7d); beacon filter is optional —
 * `null` shows all beacons, a number narrows to that single beacon's traces.
 */
export function HeatmapOverlay({
  window,
  beaconFilter = null,
  onStats,
}: {
  window: HeatmapWindow;
  /** When non-null, only history rows for this beacon are binned. */
  beaconFilter?: number | null;
  /**
   * Called whenever a fetch completes — lets the parent surface counts in
   * the chrome (pill, legend) without re-querying.
   */
  onStats?: (stats: HeatmapStats) => void;
}) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
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
    let q = supabase
      .from("beacon_position_history")
      .select("x, y, beacon_id")
      .gte("recorded_at", since.toISOString())
      .limit(10000);
    if (beaconFilter != null) q = q.eq("beacon_id", beaconFilter);

    q.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("[heatmap] fetch failed", error);
        setStatus("error");
        setRows([]);
        onStats?.({ sampleCount: 0, maxPerCell: 0, uniqueBeacons: [] });
        return;
      }
      const next = (data ?? []) as HistoryRow[];
      setRows(next);
      setStatus("ready");

      // When a beacon filter is applied, the rows we just got are only for
      // that beacon — but the parent still wants the full beacon list to
      // populate its dropdown. Run a small second query for that case.
      if (beaconFilter != null) {
        supabase
          .from("beacon_position_history")
          .select("beacon_id")
          .gte("recorded_at", since.toISOString())
          .limit(10000)
          .then(({ data: allData }) => {
            if (cancelled) return;
            const ids = Array.from(
              new Set((allData ?? []).map((r) => r.beacon_id as number)),
            ).sort((a, b) => a - b);
            const { max } = binRows(next);
            onStats?.({
              sampleCount: next.length,
              maxPerCell: max,
              uniqueBeacons: ids,
            });
          });
      } else {
        const ids = Array.from(new Set(next.map((r) => r.beacon_id))).sort(
          (a, b) => a - b,
        );
        const { max } = binRows(next);
        onStats?.({
          sampleCount: next.length,
          maxPerCell: max,
          uniqueBeacons: ids,
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // onStats intentionally excluded — its identity isn't stable in callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window, beaconFilter]);

  const { grid, max } = useMemo(() => binRows(rows), [rows]);

  if (status === "loading" || status === "idle") return null;

  if (rows.length === 0 || max === 0) {
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
              ? "Couldn't load beacon_position_history."
              : beaconFilter != null
                ? `No samples for beacon ${beaconFilter}. Try All beacons or a wider window.`
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

function binRows(rows: HistoryRow[]): { grid: number[]; max: number } {
  const grid = new Array(ROWS * COLS).fill(0);
  let max = 0;
  for (const r of rows) {
    const { x, y } = toViewBox(r.x, r.y);
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL)));
    const idx = cy * COLS + cx;
    grid[idx] += 1;
    if (grid[idx] > max) max = grid[idx];
  }
  return { grid, max };
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
