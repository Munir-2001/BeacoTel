"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { PLAYBACK, ZONE_FILLS } from "@/lib/analytics-data";

export function PlaybackSummary() {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
        Playback Summary
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Total Visitors
          </p>
          <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-foreground">
            {PLAYBACK.totalVisitors.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Congestion Alert
          </p>
          <p
            className={cn(
              "mt-1.5 text-[26px] font-semibold leading-none tracking-tight",
              PLAYBACK.congestion === "Low"
                ? "text-red-600"
                : "text-amber-600"
            )}
          >
            {PLAYBACK.congestion}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ZoneBreakdown() {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-none">
      <header className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          Zone Breakdown
        </h3>
        <button className="text-xs font-medium text-primary hover:underline">
          Details
        </button>
      </header>

      <ul className="mt-4 space-y-4">
        {ZONE_FILLS.map((z) => {
          const Icon = z.icon;
          return (
            <li key={z.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  z.iconBg
                )}
              >
                <Icon className={cn("size-5", z.iconFg)} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{z.label}</span>
                  <span className="font-semibold text-foreground">
                    {z.pct}% Full
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${z.pct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function PlaybackLogic() {
  const [smoothing, setSmoothing] = useState([60]);

  return (
    <Card className="rounded-2xl border-transparent bg-primary p-5 text-primary-foreground shadow-none">
      <h3 className="text-[16px] font-semibold tracking-tight">
        Playback Logic
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-primary-foreground/75">
        Adjust temporal smoothing to reduce noise in dense areas while
        maintaining precision in walkways.
      </p>

      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/65">
          Spatial Smoothing
        </p>
        <Slider
          value={smoothing}
          onValueChange={(v) => setSmoothing(Array.isArray(v) ? v : [v])}
          min={0}
          max={100}
          step={1}
          className="[&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-teal-300 [&_[data-slot=slider-thumb]]:border-teal-300 [&_[data-slot=slider-thumb]]:bg-teal-300"
        />
      </div>

      <button className="mt-5 h-11 w-full rounded-xl bg-card text-sm font-semibold text-foreground shadow hover:bg-card/95">
        Apply Dynamic Filtering
      </button>
    </Card>
  );
}
