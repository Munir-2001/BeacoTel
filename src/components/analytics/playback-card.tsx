"use client";

import { useState } from "react";
import {
  Download,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HEATMAP_BLOBS, PLAYBACK } from "@/lib/analytics-data";

const SPEEDS = ["0.5x", "1.0x", "1.5x", "2.0x"];

export function PlaybackCard() {
  const [playing, setPlaying] = useState(true);
  const [pct, setPct] = useState(PLAYBACK.currentPct);
  const [speed, setSpeed] = useState("1.0x");

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      {/* Heatmap stage */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.95_0.01_250)]">
        {/* Compliance pills */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Encryption Active
          </span>
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
            GDPR Compliant
          </span>
        </div>

        {/* Blueprint background */}
        <BlueprintBG />

        {/* Heatmap blobs */}
        <div className="pointer-events-none absolute inset-0">
          {HEATMAP_BLOBS.map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-2xl"
              style={{
                width: `${b.size}px`,
                height: `${b.size}px`,
                top: `${b.y}%`,
                left: `${b.x}%`,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, rgba(37,99,235,${b.intensity}) 0%, rgba(37,99,235,${b.intensity * 0.4}) 40%, rgba(37,99,235,0) 75%)`,
              }}
            />
          ))}
        </div>

        {/* Density legend */}
        <div className="absolute bottom-4 right-4 z-20 rounded-xl border border-border/70 bg-white/95 px-4 py-3 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Density Legend
          </p>
          <div
            className="h-2 w-44 rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgba(37,99,235,0.15), rgba(37,99,235,0.7), rgba(220,38,38,0.85))",
            }}
          />
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Low</span>
            <span>Med</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-6 px-2">
        <div className="flex items-end justify-between text-xs font-medium text-muted-foreground">
          <span>{PLAYBACK.startLabel}</span>
          <span>{PLAYBACK.endLabel}</span>
        </div>
        <div className="relative mt-3 h-1.5 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct}%` }}
          >
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow ring-1 ring-border">
              Current: {PLAYBACK.currentLabel}
            </div>
            <span className="block size-4 rounded-full border-2 border-primary bg-card shadow" />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            aria-label="Playback timeline"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <ControlButton ariaLabel="Skip back" onClick={() => setPct((p) => Math.max(0, p - 5))}>
            <SkipBack className="size-4 fill-current" strokeWidth={0} />
          </ControlButton>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
          >
            {playing ? (
              <Pause className="size-5 fill-current" strokeWidth={0} />
            ) : (
              <Play className="size-5 fill-current pl-0.5" strokeWidth={0} />
            )}
          </button>
          <ControlButton ariaLabel="Skip forward" onClick={() => setPct((p) => Math.min(100, p + 5))}>
            <SkipForward className="size-4 fill-current" strokeWidth={0} />
          </ControlButton>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Speed
          </span>
          <SpeedSelect value={speed} onChange={setSpeed} />
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80"
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export Snippet
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ControlButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-foreground/70 hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SpeedSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 cursor-pointer rounded-md border border-border bg-card pl-2.5 pr-7 text-sm font-medium text-foreground",
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 10 10%22><path fill=%22%23667085%22 d=%22M2 4l3 3 3-3z%22/></svg>')] bg-[right_0.5rem_center] bg-no-repeat"
      )}
    >
      {SPEEDS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function BlueprintBG() {
  return (
    <svg
      viewBox="0 0 800 500"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 size-full opacity-90"
      fill="none"
    >
      <defs>
        <pattern id="grid-zd" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" stroke="rgba(15,42,71,0.05)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="800" height="500" fill="#F3F6FA" />
      <rect width="800" height="500" fill="url(#grid-zd)" />
      {/* Building outline */}
      <path
        d="M60 60 H560 Q610 60 640 110 L700 200 Q720 230 720 270 V410 H60 Z"
        fill="#FFFFFF"
        stroke="#94A3B8"
        strokeWidth="2"
      />
      {/* Inner walls */}
      <g stroke="#64748B" strokeWidth="1.5">
        <line x1="60" y1="220" x2="640" y2="220" />
        <line x1="240" y1="60" x2="240" y2="220" />
        <line x1="430" y1="60" x2="430" y2="220" />
        <line x1="240" y1="140" x2="430" y2="140" />
        <line x1="200" y1="220" x2="200" y2="410" />
        <line x1="400" y1="220" x2="400" y2="410" />
        <line x1="540" y1="220" x2="540" y2="410" />
        <line x1="200" y1="320" x2="400" y2="320" />
      </g>
      {/* Furniture hints */}
      <g fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1">
        <rect x="90" y="100" width="40" height="60" rx="3" />
        <circle cx="335" cy="180" r="14" />
        <rect x="470" y="100" width="80" height="40" rx="3" />
        <rect x="240" y="260" width="120" height="40" rx="3" />
        <rect x="430" y="360" width="80" height="30" rx="3" />
      </g>
    </svg>
  );
}
