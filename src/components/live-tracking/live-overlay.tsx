"use client";

import { useEffect, useState } from "react";
import type { LiveBeacon, LiveConnectionStatus } from "@/lib/positioning/live-beacons";
import { toViewBox } from "@/lib/positioning/coords";
import { cn } from "@/lib/utils";

const VIEWBOX_W = 1200;
const VIEWBOX_H = 480;

/**
 * One dot per known beacon. Fresh beacons get the purple pulsing dot;
 * stale ones get a smaller slate dot with a short "Xm ago" label, so the
 * operator can still see the last-known position when the Pi is silent.
 *
 * Coordinates: the Pi writes meters, the in-app API writes viewBox pixels.
 * `toViewBox` accepts both and normalizes at the boundary.
 */
export function LiveOverlay({ beacons }: { beacons: LiveBeacon[] }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="pointer-events-none absolute inset-0 size-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      {beacons.map((b) => {
        const { x, y } = toViewBox(b.x, b.y);
        return b.stale ? (
          <StaleDot
            key={b.beacon_id}
            x={x}
            y={y}
            beaconId={b.beacon_id}
            lastSeen={b.last_seen}
          />
        ) : (
          <FreshDot
            key={b.beacon_id}
            x={x}
            y={y}
            beaconId={b.beacon_id}
            rawX={b.x}
            rawY={b.y}
          />
        );
      })}
    </svg>
  );
}

function FreshDot({
  x,
  y,
  beaconId,
  rawX,
  rawY,
}: {
  x: number;
  y: number;
  beaconId: number;
  /** Raw Pi/DB coordinates (metres) — shown on the chip below the dot. */
  rawX: number;
  rawY: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="22" fill="#7C3AED" opacity="0.18">
        <animate attributeName="r" values="14;26;14" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r="9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.5" />
      <text
        x={x}
        y={y + 3}
        fontSize="10"
        fontWeight="700"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="ui-sans-serif, system-ui"
      >
        {beaconId}
      </text>
      {/* Coord chip — the beacon's live x, y straight from beacon_live_positions. */}
      <g transform={`translate(${x}, ${y + 24})`}>
        <rect x={-32} y={-9} width={64} height={16} rx={8} fill="#4C1D95" opacity="0.92" />
        <text
          x={0}
          y={3}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          fill="#EDE9FE"
          fontFamily="ui-sans-serif, system-ui"
        >
          {rawX.toFixed(1)}, {rawY.toFixed(1)}
        </text>
      </g>
    </g>
  );
}

function StaleDot({
  x,
  y,
  beaconId,
  lastSeen,
}: {
  x: number;
  y: number;
  beaconId: number;
  lastSeen: string;
}) {
  return (
    <g>
      {/* Slow-pulsing amber halo so a stale dot is unmistakable across the plan. */}
      <circle cx={x} cy={y} r="24" fill="#F59E0B" opacity="0.18">
        <animate attributeName="r" values="20;30;20" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.22;0.08;0.22" dur="2.6s" repeatCount="indefinite" />
      </circle>
      {/* Dashed amber ring — "last known" marker. */}
      <circle
        cx={x}
        cy={y}
        r="17"
        fill="none"
        stroke="#D97706"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      {/* Main dot — amber instead of slate. */}
      <circle cx={x} cy={y} r="12" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2.5" />
      <text
        x={x}
        y={y + 4}
        fontSize="11"
        fontWeight="800"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="ui-sans-serif, system-ui"
      >
        {beaconId}
      </text>
      {/* Age chip — small amber pill so the "X ago" label reads at a glance. */}
      <g transform={`translate(${x}, ${y + 26})`}>
        <rect x={-26} y={-9} width={52} height={16} rx={8} fill="#92400E" />
        <text
          x={0}
          y={3}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          fill="#FEF3C7"
          fontFamily="ui-sans-serif, system-ui"
        >
          {relativeAge(lastSeen)}
        </text>
      </g>
    </g>
  );
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "future";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "stale";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Small status pill — sits with the other top pills in FloorPlan. */
export function LiveStatusPill({
  status,
  liveCount,
  staleCount,
}: {
  status: LiveConnectionStatus;
  liveCount: number;
  staleCount: number;
}) {
  const { label, dotClass } = describe(status, liveCount, staleCount);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
      <span className={`inline-block size-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

/**
 * Heartbeat pill — a small rose dot that's *always* pulsing so the operator
 * knows the page is live and listening, plus a brief intensify on every
 * Realtime event so they can actually see updates landing.
 */
export function HeartbeatIndicator({
  lastEventAt,
}: {
  lastEventAt: number | null;
}) {
  // `justFired` flips true for ~700 ms after each event so the dot turns a
  // deeper red — short enough to feel like a heartbeat, long enough to catch.
  const [justFired, setJustFired] = useState(false);
  useEffect(() => {
    if (lastEventAt === null) return;
    setJustFired(true);
    const t = setTimeout(() => setJustFired(false), 700);
    return () => clearTimeout(t);
  }, [lastEventAt]);

  const label = lastEventAt
    ? `Heartbeat · ${relativeTimeShort(lastEventAt)}`
    : "Heartbeat · idle";
  const title = lastEventAt
    ? `Last Realtime event: ${new Date(lastEventAt).toLocaleTimeString()}`
    : "No Realtime events yet on this page load.";

  return (
    <span
      title={title}
      className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm"
    >
      {/* Always-pulsing radar ring + brightening dot on event. */}
      <span className="relative inline-flex size-2 items-center justify-center">
        <span
          className={cn(
            "absolute inline-flex size-2 rounded-full opacity-75 animate-ping",
            justFired ? "bg-rose-600" : "bg-rose-400",
          )}
        />
        <span
          className={cn(
            "relative inline-block size-2 rounded-full transition-colors",
            justFired ? "bg-rose-700" : "bg-rose-500",
          )}
        />
      </span>
      {label}
    </span>
  );
}

function relativeTimeShort(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 1500) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

function describe(
  status: LiveConnectionStatus,
  liveCount: number,
  staleCount: number,
) {
  switch (status) {
    case "connected": {
      if (liveCount === 0 && staleCount === 0) {
        return { label: "Live · waiting", dotClass: "bg-green-500 animate-pulse" };
      }
      if (liveCount === 0) {
        return {
          label: `Live · ${staleCount} stale`,
          dotClass: "bg-slate-400",
        };
      }
      const livePart = `${liveCount} beacon${liveCount === 1 ? "" : "s"}`;
      const stalePart = staleCount > 0 ? ` + ${staleCount} stale` : "";
      return {
        label: `Live · ${livePart}${stalePart}`,
        dotClass: "bg-green-500 animate-pulse",
      };
    }
    case "connecting":
      return { label: "Connecting…", dotClass: "bg-yellow-500 animate-pulse" };
    case "error":
      return { label: "Live · offline", dotClass: "bg-red-500" };
    case "disabled":
    default:
      return { label: "Live · off", dotClass: "bg-slate-400" };
  }
}
