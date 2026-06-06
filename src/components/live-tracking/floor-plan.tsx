"use client";

import { useCallback, useState } from "react";
import { Minus, Plus, Layers } from "lucide-react";
import {
  AnchorLayer,
  PlaybackControls,
  TraceOverlay,
  useBeaconPlayback,
} from "@/components/live-tracking/beacon-playback";
import {
  HeartbeatIndicator,
  LiveOverlay,
  LiveStatusPill,
} from "@/components/live-tracking/live-overlay";
import {
  HEATMAP_WINDOWS,
  HeatmapOverlay,
  type HeatmapStats,
  type HeatmapWindow,
} from "@/components/live-tracking/heatmap-overlay";
import { HeatmapLegend } from "@/components/live-tracking/heatmap-legend";
import { useLiveBeacons } from "@/lib/positioning/live-beacons";

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

type Mode = "live" | "replay" | "heatmap";

export function FloorPlan() {
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<Mode>("live");
  const [heatWindow, setHeatWindow] = useState<HeatmapWindow>("24h");
  const [heatBeacon, setHeatBeacon] = useState<number | null>(null);
  const [heatStats, setHeatStats] = useState<HeatmapStats>({
    sampleCount: 0,
    maxPerCell: 0,
    uniqueBeacons: [],
  });
  // Stable callback so HeatmapOverlay doesn't re-fetch on parent re-render.
  const onHeatStats = useCallback(
    (s: HeatmapStats) => setHeatStats(s),
    [],
  );
  const atMax = zoom >= ZOOM_MAX - 0.001;
  const atMin = zoom <= ZOOM_MIN + 0.001;

  // Subscription only runs while in live mode — no Realtime traffic during replay.
  const live = useLiveBeacons({ enabled: mode === "live" });

  // Playback hook always mounts (it just loads a static file), but its effects
  // don't hit the network beyond the initial trace fetch.
  const pb = useBeaconPlayback();

  return (
    <section className="relative flex-1 overflow-hidden rounded-2xl bg-[oklch(0.55_0.01_250)]/55 p-6 shadow-inner">
      {/* Top pills */}
      <div className="absolute left-6 top-6 z-20 flex flex-wrap items-center gap-2">
        {mode === "live" ? (
          <>
            <LiveStatusPill
              status={live.status}
              liveCount={live.beacons.filter((b) => !b.stale).length}
              staleCount={live.beacons.filter((b) => b.stale).length}
            />
            <HeartbeatIndicator lastEventAt={live.lastEventAt} />
          </>
        ) : mode === "replay" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
            <span className="inline-block size-1.5 rounded-full bg-purple-500" />
            Replay
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
            <span className="inline-block size-1.5 rounded-full bg-rose-500" />
            Heatmap
            <span className="ml-1 text-foreground/60">
              · {heatStats.sampleCount.toLocaleString()} samples
            </span>
          </span>
        )}
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
          Floor 01 — FabLab S35
        </span>
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === "heatmap" ? (
          <>
            <HeatmapWindowPicker value={heatWindow} onChange={setHeatWindow} />
            <HeatmapBeaconPicker
              value={heatBeacon}
              options={heatStats.uniqueBeacons}
              onChange={setHeatBeacon}
            />
          </>
        ) : null}
      </div>

      {/* Canvas: blueprint + trace overlay + anchors */}
      <div className="flex h-full items-center justify-center overflow-hidden">
        <div
          className="relative aspect-[5/2] w-full max-w-[1100px] transition-transform duration-150 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        >
          <Blueprint />
          {mode === "live" ? (
            <LiveOverlay beacons={live.beacons} />
          ) : mode === "replay" ? (
            <TraceOverlay positions={pb.positions} idx={pb.idx} />
          ) : (
            <HeatmapOverlay
              window={heatWindow}
              beaconFilter={heatBeacon}
              onStats={onHeatStats}
            />
          )}
          <AnchorLayer rssiNow={mode === "replay" ? pb.currentRssi : {}} />
        </div>
      </div>

      {mode === "replay" ? <PlaybackControls pb={pb} /> : null}
      {mode === "heatmap" ? (
        <HeatmapLegend
          sampleCount={heatStats.sampleCount}
          maxPerCell={heatStats.maxPerCell}
          windowLabel={
            HEATMAP_WINDOWS.find((w) => w.value === heatWindow)?.label ?? heatWindow
          }
          beaconFilter={heatBeacon}
        />
      ) : null}

      {/* Zoom + layer controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <ControlButton
          ariaLabel="Zoom in"
          disabled={atMax}
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
        >
          <Plus className="size-4" strokeWidth={2} />
        </ControlButton>
        <ControlButton
          ariaLabel="Zoom out"
          disabled={atMin}
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
        >
          <Minus className="size-4" strokeWidth={2} />
        </ControlButton>
        <ControlButton ariaLabel="Reset zoom" onClick={() => setZoom(1)}>
          <Layers className="size-4" strokeWidth={2} />
        </ControlButton>
      </div>
    </section>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const opts: { value: Mode; label: string }[] = [
    { value: "live", label: "Live" },
    { value: "replay", label: "Replay" },
    { value: "heatmap", label: "Heatmap" },
  ];
  return (
    <div className="inline-flex items-center rounded-full bg-white/95 p-0.5 text-[11px] font-semibold uppercase tracking-wider shadow-sm">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={mode === o.value}
          className={`rounded-full px-3 py-1 transition-colors ${
            mode === o.value
              ? "bg-primary text-primary-foreground"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function HeatmapWindowPicker({
  value,
  onChange,
}: {
  value: HeatmapWindow;
  onChange: (v: HeatmapWindow) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-white/95 p-0.5 text-[11px] font-semibold uppercase tracking-wider shadow-sm">
      {HEATMAP_WINDOWS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-3 py-1 transition-colors ${
            value === o.value
              ? "bg-rose-500 text-white"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Beacon selector for the heatmap. "All" merges every beacon's history into
 * one density grid; picking a single ID narrows to that beacon's traces.
 * Options come from the overlay's last fetch (distinct ids in the window),
 * so the list is always honest about what's in the DB.
 */
function HeatmapBeaconPicker({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: number[];
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
      <span className="text-foreground/55">Beacon</span>
      <select
        value={value == null ? "all" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "all" ? null : Number(e.target.value))
        }
        className="cursor-pointer bg-transparent text-[11px] font-semibold uppercase tracking-wider text-foreground focus:outline-none"
      >
        <option value="all">All ({options.length})</option>
        {options.map((id) => (
          <option key={id} value={id}>
            #{id}
          </option>
        ))}
      </select>
    </label>
  );
}

function ControlButton({
  children,
  ariaLabel,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="grid size-10 place-items-center rounded-lg bg-white text-foreground shadow-md ring-1 ring-black/5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}

function Blueprint() {
  return (
    <svg
      viewBox="0 0 1200 480"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 size-full opacity-95"
      fill="none"
    >
      <defs>
        <pattern id="lt-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="rgba(15,42,71,0.06)" strokeWidth="1" />
        </pattern>
        <pattern id="lt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1.1" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="1200" height="480" fill="#EEF1F4" />
      <rect width="1200" height="480" fill="url(#lt-grid)" />

      {/* Building outline — outer shell */}
      <rect
        x="40"
        y="80"
        width="1120"
        height="320"
        fill="#F8FAFC"
        stroke="#2563EB"
        strokeWidth="2"
      />
      {/* Inner outline (double-line wall) */}
      <rect
        x="48"
        y="88"
        width="1104"
        height="304"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="1"
      />

      {/* Top window/skylight strip (long horizontal feature near the top) */}
      <g>
        <rect x="100" y="72" width="700" height="16" fill="#FFFFFF" stroke="#475569" strokeWidth="1" />
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={i}
            x1={100 + i * 40}
            y1="72"
            x2={100 + i * 40}
            y2="88"
            stroke="#475569"
            strokeWidth="0.6"
          />
        ))}
        {/* Small interruption (mullion) */}
        <rect x="480" y="68" width="22" height="24" fill="#F8FAFC" stroke="#475569" strokeWidth="1" />
      </g>

      {/* Red dividing walls between rooms */}
      <g stroke="#DC2626" strokeWidth="3" strokeLinecap="square">
        <line x1="545" y1="88" x2="545" y2="360" />
        <line x1="545" y1="388" x2="545" y2="400" />
        <line x1="945" y1="88" x2="945" y2="360" />
        <line x1="945" y1="388" x2="945" y2="400" />
      </g>

      {/* Door swing arcs */}
      <g stroke="#475569" strokeWidth="1.1" fill="none">
        {/* FABLAB south door (left section) */}
        <path d="M 250 392 A 40 40 0 0 1 290 352" />
        <line x1="250" y1="392" x2="290" y2="392" stroke="#94A3B8" strokeWidth="2" />
        {/* ELETTRONICA from FABLAB door */}
        <path d="M 545 360 A 34 34 0 0 1 579 394" />
        {/* ELETTRONICA → PROTOTIPAZIONE door */}
        <path d="M 945 360 A 34 34 0 0 1 979 394" />
        {/* PROTOTIPAZIONE east double-doors */}
        <path d="M 1160 200 A 38 38 0 0 1 1122 238" />
        <path d="M 1160 320 A 38 38 0 0 0 1122 282" />
      </g>

      {/* Hatched structural columns (corners + along walls) */}
      <g>
        <rect x="60" y="84" width="18" height="14" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="60" y="216" width="18" height="22" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="1122" y="84" width="18" height="14" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="1122" y="216" width="18" height="22" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" />
        {/* Center floor fixtures */}
        <rect x="285" y="252" width="38" height="14" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="722" y="252" width="32" height="14" fill="url(#lt-hatch)" stroke="#94A3B8" strokeWidth="0.8" opacity="0.55" />
      </g>

      {/* ELETTRONICA — 3×3 workbench grid */}
      <g fill="#FFFFFF" stroke="#475569" strokeWidth="1">
        {[130, 220, 310].map((y) =>
          [575, 705, 835].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="90" height="32" rx="1" />
          ))
        )}
      </g>

    </svg>
  );
}

