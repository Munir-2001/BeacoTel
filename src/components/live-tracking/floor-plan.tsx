"use client";

import { Minus, Plus, Layers } from "lucide-react";
import type { Role, StaffPoint } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  points: StaffPoint[];
  activeRole: "all" | Role;
};

export function FloorPlan({ points, activeRole }: Props) {
  const visible =
    activeRole === "all"
      ? points
      : points.filter((p) => p.role === activeRole);

  return (
    <section className="relative flex-1 overflow-hidden rounded-2xl bg-[oklch(0.55_0.01_250)]/55 p-6 shadow-inner">
      {/* Top pills */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
          <span className="inline-block size-1.5 rounded-full bg-red-500" />
          Live Tracking
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
          Floor 01: Main Lobby
        </span>
      </div>

      {/* Canvas: blueprint + heatmaps + dots */}
      <div className="relative mx-auto h-full max-h-[640px] w-full max-w-[540px]">
        <Blueprint />

        {/* Heatmap blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute size-[180px] rounded-full blur-2xl"
            style={{
              top: "26%",
              left: "60%",
              background:
                "radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(220,38,38,0.35) 35%, rgba(220,38,38,0) 70%)",
            }}
          />
          <div
            className="absolute size-[220px] rounded-full blur-3xl"
            style={{
              top: "55%",
              left: "12%",
              background:
                "radial-gradient(circle, rgba(251,146,60,0.7) 0%, rgba(251,191,36,0.3) 40%, rgba(251,191,36,0) 75%)",
            }}
          />
        </div>

        {/* Density peak tag */}
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ top: "33%", left: "68%" }}
        >
          <span className="inline-flex items-center justify-center rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase leading-tight tracking-wider text-white shadow-lg">
            Density
            <br />
            Peak
          </span>
        </div>

        {/* Staff dots */}
        {visible.map((p) => (
          <span
            key={p.id}
            className={cn(
              "absolute z-10 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow",
              p.status === "active"
                ? p.role === "manager"
                  ? "bg-emerald-600"
                  : "bg-slate-800"
                : "bg-amber-500"
            )}
            style={{ top: `${p.y}%`, left: `${p.x}%` }}
            title={`${p.name} — ${p.zone}`}
          />
        ))}
      </div>

      {/* Zoom + layer controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <ControlButton ariaLabel="Zoom in">
          <Plus className="size-4" strokeWidth={2} />
        </ControlButton>
        <ControlButton ariaLabel="Zoom out">
          <Minus className="size-4" strokeWidth={2} />
        </ControlButton>
        <ControlButton ariaLabel="Layers">
          <Layers className="size-4" strokeWidth={2} />
        </ControlButton>
      </div>
    </section>
  );
}

function ControlButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid size-10 place-items-center rounded-lg bg-white text-foreground shadow-md ring-1 ring-black/5 transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}

function Blueprint() {
  return (
    <svg
      viewBox="0 0 540 640"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 size-full opacity-95"
      fill="none"
    >
      <defs>
        <pattern
          id="grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            stroke="rgba(15,42,71,0.05)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="540" height="640" fill="#EEF1F4" />
      <rect width="540" height="640" fill="url(#grid)" />

      {/* Outer building */}
      <path
        d="M50 80 L490 80 L490 540 L380 540 L350 590 L190 590 L160 540 L50 540 Z"
        fill="#F8FAFC"
        stroke="#94A3B8"
        strokeWidth="2.5"
      />

      {/* Inner walls — rooms grid */}
      <g stroke="#64748B" strokeWidth="1.8" fill="none">
        {/* Horizontal divider */}
        <line x1="50" y1="280" x2="490" y2="280" />
        {/* Top row partitions */}
        <line x1="220" y1="80" x2="220" y2="280" />
        <line x1="360" y1="80" x2="360" y2="280" />
        <line x1="220" y1="170" x2="360" y2="170" />
        {/* Bottom row partitions */}
        <line x1="170" y1="280" x2="170" y2="540" />
        <line x1="320" y1="280" x2="320" y2="540" />
        <line x1="170" y1="410" x2="320" y2="410" />
        <line x1="320" y1="400" x2="490" y2="400" />
        {/* Door gaps */}
        <line
          x1="220"
          y1="220"
          x2="220"
          y2="260"
          stroke="#F8FAFC"
          strokeWidth="3"
        />
        <line
          x1="170"
          y1="350"
          x2="170"
          y2="380"
          stroke="#F8FAFC"
          strokeWidth="3"
        />
        <line
          x1="280"
          y1="410"
          x2="310"
          y2="410"
          stroke="#F8FAFC"
          strokeWidth="3"
        />
      </g>

      {/* Furniture hints */}
      <g fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1">
        <rect x="80" y="120" width="40" height="60" rx="3" />
        <rect x="140" y="120" width="40" height="60" rx="3" />
        <rect x="380" y="120" width="80" height="40" rx="3" />
        <rect x="380" y="180" width="80" height="40" rx="3" />
        <circle cx="260" cy="220" r="18" />
        <rect x="220" y="320" width="80" height="50" rx="3" />
        <rect x="350" y="430" width="120" height="80" rx="4" />
      </g>

      {/* Entry indicator */}
      <path
        d="M240 595 L300 595"
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
