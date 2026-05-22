"use client";

import Link from "next/link";
import { ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "live" | "playback";

export function ZoneDensityHeader({
  mode,
  onChange,
  dateLabel,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  dateLabel: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/analytics" className="hover:text-foreground">
            Analytics
          </Link>
          <ChevronRight className="size-3.5" strokeWidth={2} />
          <span className="text-foreground">Zone Density Playback</span>
        </nav>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground">
          Zone Density Playback
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Analyze foot traffic patterns and space utilization with anonymized
          high-fidelity temporal data.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-[60px] rounded-2xl bg-secondary p-1.5">
          <ModeButton
            label="Live View"
            active={mode === "live"}
            onClick={() => onChange("live")}
          />
          <ModeButton
            label="Playback"
            active={mode === "playback"}
            onClick={() => onChange("playback")}
          />
        </div>
        <button className="flex h-[60px] items-center gap-3 rounded-2xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
          <Calendar className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <span className="leading-tight">{dateLabel}</span>
        </button>
      </div>
    </header>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-full rounded-xl px-5 text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label.split(" ").map((part, i, arr) => (
        <span key={i} className="block leading-tight">
          {part}
          {i < arr.length - 1 ? "" : ""}
        </span>
      ))}
    </button>
  );
}
