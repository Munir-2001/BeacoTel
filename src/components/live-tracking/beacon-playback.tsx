"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  ANCHORS,
  computeTrace,
  loadTrace,
  type TracePosition,
} from "@/lib/positioning/trace";
import { cn } from "@/lib/utils";

const VIEWBOX_W = 1200;
const VIEWBOX_H = 480;
const HEAT_W = 300;
const HEAT_H = 120;
const TRAIL_LEN = 24;
const SPEEDS = [1, 2, 5, 10, 25];

export function useBeaconPlayback() {
  const [positions, setPositions] = useState<TracePosition[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);

  const elapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTrace()
      .then((raw) => {
        if (cancelled) return;
        const pos = computeTrace(raw);
        elapsedRef.current = 0;
        setPositions(pos);
        setIdx(0);
        setPlaying(pos.length > 0);
      })
      .catch((e) => console.error("[beacon-playback] failed to load trace", e));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing || positions.length === 0) return;
    let last = performance.now();
    let active = true;
    const endMs = positions[positions.length - 1].tMs;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const dt = now - last;
      last = now;
      elapsedRef.current = Math.min(endMs, elapsedRef.current + dt * speed);

      // Advance idx to the largest position whose tMs <= elapsed.
      setIdx((cur) => {
        let next = cur;
        while (next < positions.length - 1 && positions[next + 1].tMs <= elapsedRef.current) {
          next++;
        }
        return next;
      });

      if (elapsedRef.current >= endMs) {
        setPlaying(false);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, positions]);

  const reset = () => {
    elapsedRef.current = 0;
    setIdx(0);
    setPlaying(positions.length > 0);
  };

  const currentRssi = positions[idx]?.rssiUsed ?? {};
  const currentTimeS = positions[idx]?.tMs ? positions[idx].tMs / 1000 : 0;
  const totalTimeS = positions.length > 0 ? positions[positions.length - 1].tMs / 1000 : 0;
  const atEnd = positions.length > 0 && idx >= positions.length - 1;

  return {
    positions,
    idx,
    playing,
    speed,
    currentRssi,
    currentTimeS,
    totalTimeS,
    atEnd,
    togglePlay: () => {
      if (atEnd) reset();
      else setPlaying((p) => !p);
    },
    setSpeed,
    reset,
  };
}

export type BeaconPlaybackState = ReturnType<typeof useBeaconPlayback>;

/** Heatmap canvas + trail SVG + moving dot — sits inside the zoomable canvas. */
export function TraceOverlay({ positions, idx }: { positions: TracePosition[]; idx: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<Float32Array | null>(null);
  const lastAccumulatedRef = useRef(-1);

  // Allocate / reset the grid whenever the position set changes.
  useEffect(() => {
    gridRef.current = new Float32Array(HEAT_W * HEAT_H);
    lastAccumulatedRef.current = -1;
    const c = canvasRef.current;
    if (c) {
      c.width = HEAT_W;
      c.height = HEAT_H;
      c.getContext("2d")?.clearRect(0, 0, HEAT_W, HEAT_H);
    }
  }, [positions]);

  // Incrementally accumulate splats and redraw.
  useEffect(() => {
    const grid = gridRef.current;
    const c = canvasRef.current;
    if (!grid || !c) return;

    let start = lastAccumulatedRef.current + 1;
    if (start > idx) {
      // Scrubbed backwards — rebuild from zero.
      grid.fill(0);
      start = 0;
    }
    for (let i = start; i <= idx && i < positions.length; i++) {
      splat(grid, positions[i].x / VIEWBOX_W, positions[i].y / VIEWBOX_H);
    }
    lastAccumulatedRef.current = idx;
    renderHeat(c, grid);
  }, [idx, positions]);

  const trail = positions.slice(Math.max(0, idx - TRAIL_LEN + 1), idx + 1);
  const head = positions[idx];

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 size-full mix-blend-multiply"
        style={{ imageRendering: "auto" }}
        aria-hidden
      />
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="pointer-events-none absolute inset-0 size-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {trail.length >= 2 ? (
          <polyline
            points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#7C3AED"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        ) : null}
        {head ? (
          <g>
            <circle cx={head.x} cy={head.y} r="22" fill="#7C3AED" opacity="0.18">
              <animate attributeName="r" values="14;26;14" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={head.x} cy={head.y} r="9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.5" />
          </g>
        ) : null}
      </svg>
    </>
  );
}

/** Numbered fixed beacons + an RSSI chip next to each, sourced from current frame. */
export function AnchorLayer({ rssiNow }: { rssiNow: Partial<Record<number, number>> }) {
  return (
    <>
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="pointer-events-none absolute inset-0 size-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {ANCHORS.map((a) => (
          <g key={a.nodeId}>
            <circle cx={a.x} cy={a.y} r="22" fill="#2563EB" opacity="0.12" />
            <circle cx={a.x} cy={a.y} r="14" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
            <text
              x={a.x}
              y={a.y + 4}
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="ui-sans-serif, system-ui"
            >
              {a.nodeId}
            </text>
          </g>
        ))}
      </svg>
      {ANCHORS.map((a) => {
        const rssi = rssiNow[a.nodeId];
        const offsetX = a.nodeId === 1 ? 22 : a.nodeId === 3 ? -22 : 0;
        const offsetY = a.nodeId === 2 ? -36 : 26;
        return (
          <div
            key={a.nodeId}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(${(a.x / VIEWBOX_W) * 100}% + ${offsetX}px)`,
              top: `calc(${(a.y / VIEWBOX_H) * 100}% + ${offsetY}px)`,
            }}
          >
            <span
              className={cn(
                "rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider shadow",
                rssi === undefined ? "text-muted-foreground" : "text-foreground"
              )}
            >
              B{a.nodeId} {rssi === undefined ? "—" : `${rssi} dBm`}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Play / pause / speed / reset + scrubbable timeline. */
export function PlaybackControls({ pb }: { pb: BeaconPlaybackState }) {
  const pct = pb.totalTimeS > 0 ? (pb.currentTimeS / pb.totalTimeS) * 100 : 0;
  return (
    <div className="absolute bottom-6 left-6 z-20 flex w-[min(440px,calc(100%-200px))] flex-col gap-2 rounded-xl bg-white/95 px-4 py-3 shadow-md ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={pb.togglePlay}
          aria-label={pb.playing ? "Pause" : "Play"}
          className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
        >
          {pb.playing ? (
            <Pause className="size-4 fill-current" strokeWidth={0} />
          ) : (
            <Play className="size-4 fill-current pl-0.5" strokeWidth={0} />
          )}
        </button>
        <button
          type="button"
          onClick={pb.reset}
          aria-label="Reset playback"
          className="grid size-9 place-items-center rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-4" strokeWidth={2} />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
            {fmt(pb.currentTimeS)} / {fmt(pb.totalTimeS)}
          </span>
        </div>
        <SpeedSelect value={pb.speed} onChange={pb.setSpeed} />
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SpeedSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 cursor-pointer rounded-md border border-border bg-card pl-1.5 pr-5 text-[11px] font-semibold text-foreground"
      aria-label="Playback speed"
    >
      {SPEEDS.map((s) => (
        <option key={s} value={s}>
          {s}×
        </option>
      ))}
    </select>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Gaussian splat into the heat grid. nx, ny ∈ [0, 1]. */
function splat(grid: Float32Array, nx: number, ny: number) {
  const cx = nx * HEAT_W;
  const cy = ny * HEAT_H;
  const r = 7;
  const sigma2 = (r * r) / 2;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(HEAT_W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(HEAT_H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 > r * r) continue;
      grid[y * HEAT_W + x] += Math.exp(-d2 / sigma2);
    }
  }
}

const STOPS: [number, [number, number, number]][] = [
  [0.0, [37, 99, 235]],
  [0.3, [34, 211, 238]],
  [0.55, [250, 204, 21]],
  [0.8, [249, 115, 22]],
  [1.0, [220, 38, 38]],
];
function heatColor(t: number): [number, number, number] {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [s0, c0] = STOPS[i];
    const [s1, c1] = STOPS[i + 1];
    if (t <= s1) {
      const k = (t - s0) / (s1 - s0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

function renderHeat(c: HTMLCanvasElement, grid: Float32Array) {
  const ctx = c.getContext("2d");
  if (!ctx) return;
  let max = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > max) max = grid[i];
  }
  if (max === 0) {
    ctx.clearRect(0, 0, HEAT_W, HEAT_H);
    return;
  }
  const img = ctx.createImageData(HEAT_W, HEAT_H);
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i] / max;
    if (v < 0.03) continue;
    const [r, g, b] = heatColor(Math.min(1, v));
    const px = i * 4;
    img.data[px + 0] = r;
    img.data[px + 1] = g;
    img.data[px + 2] = b;
    img.data[px + 3] = Math.min(255, Math.round(v * 210 + 30));
  }
  ctx.putImageData(img, 0, 0);
}

