"use client";

import { useState } from "react";
import { ChevronDown, MapPin, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FLOORPLAN } from "@/lib/inventory-data";
import { cn } from "@/lib/utils";

export function FloorplanCard() {
  const [level, setLevel] = useState("Level 4 (Active)");

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
            <MapPin className="size-4 text-primary" strokeWidth={2} />
            Asset Tracking — Real-time Floorplan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {FLOORPLAN.levelLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LevelSelect value={level} onChange={setLevel} />
          <Button className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <SlidersHorizontal className="size-4" strokeWidth={2} />
            Filter Assets
          </Button>
        </div>
      </header>

      <FloorplanCanvas />
    </Card>
  );
}

function LevelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-lg border border-border bg-card pl-3.5 pr-9 text-sm font-medium text-foreground shadow-none focus-visible:border-ring focus-visible:outline-none"
      >
        <option>Level 1</option>
        <option>Level 2</option>
        <option>Level 3</option>
        <option>Level 4 (Active)</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function FloorplanCanvas() {
  return (
    <div className="relative mt-5 overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.97_0.012_250)]">
      {/* Dotted grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.78 0.02 250) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative grid aspect-[16/7] grid-cols-4 grid-rows-2 gap-0">
        {FLOORPLAN.rooms.topRow.map((label, i) => (
          <Room key={`top-${i}`} label={label} />
        ))}
        {FLOORPLAN.rooms.bottomRow.map((label, i) => (
          <Room key={`bot-${i}`} label={label} />
        ))}

        <span className="pointer-events-none absolute left-6 top-[49%] -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
          {FLOORPLAN.rooms.midLabel}
        </span>

        {FLOORPLAN.markers.map((m) => (
          <span
            key={m.id}
            className={cn(
              "absolute z-10 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow",
              m.kind === "core" ? "bg-primary" : "bg-emerald-700"
            )}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          />
        ))}

        <Legend />
      </div>
    </div>
  );
}

function Room({ label }: { label: string }) {
  return (
    <div className="relative border border-border/60 bg-white/40">
      <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
        {label}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-20 rounded-xl border border-border/70 bg-white/95 px-4 py-3 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Live Legend
      </p>
      <ul className="space-y-1.5 text-xs text-foreground">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary ring-2 ring-white" />
          Core Tech (Smart Hubs)
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-700 ring-2 ring-white" />
          Auxiliary (Mini-bars, Safes)
        </li>
      </ul>
    </div>
  );
}
