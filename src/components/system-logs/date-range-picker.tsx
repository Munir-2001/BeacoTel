"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inclusive date range. Empty strings mean "unbounded on that side"; using
 * `""` rather than `null` keeps the native <input type="date"> binding clean.
 */
export type DateRange = { from: string; to: string };

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Dismiss when clicking outside the popover.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = formatRangeLabel(value);

  function applyPreset(preset: "all" | "today" | "7d" | "30d") {
    const today = isoDay(new Date());
    switch (preset) {
      case "all":
        onChange(EMPTY_RANGE);
        return;
      case "today":
        onChange({ from: today, to: today });
        return;
      case "7d": {
        const from = new Date();
        from.setDate(from.getDate() - 6);
        onChange({ from: isoDay(from), to: today });
        return;
      }
      case "30d": {
        const from = new Date();
        from.setDate(from.getDate() - 29);
        onChange({ from: isoDay(from), to: today });
        return;
      }
    }
  }

  const hasRange = value.from || value.to;

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg bg-card px-3.5 text-sm font-medium ring-1 ring-border hover:bg-muted",
          hasRange ? "text-foreground" : "text-foreground",
        )}
      >
        <Calendar
          className="size-4 text-muted-foreground"
          strokeWidth={1.75}
        />
        {label}
        {hasRange ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date range"
            onClick={(e) => {
              e.stopPropagation();
              onChange(EMPTY_RANGE);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(EMPTY_RANGE);
              }
            }}
            className="ml-1 grid size-4 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" strokeWidth={2.2} />
          </span>
        ) : (
          <ChevronDown
            className="size-3.5 text-muted-foreground"
            strokeWidth={2}
          />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <PresetBtn label="All time" onClick={() => applyPreset("all")} />
            <PresetBtn label="Today" onClick={() => applyPreset("today")} />
            <PresetBtn label="Last 7 days" onClick={() => applyPreset("7d")} />
            <PresetBtn label="Last 30 days" onClick={() => applyPreset("30d")} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                From
              </label>
              <input
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                To
              </label>
              <input
                type="date"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange(EMPTY_RANGE)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PresetBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-md bg-muted/60 text-sm font-medium text-foreground hover:bg-muted"
    >
      {label}
    </button>
  );
}

function isoDay(d: Date): string {
  // YYYY-MM-DD in local time so the date-input round-trips cleanly.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRangeLabel(range: DateRange): string {
  if (!range.from && !range.to) return "All time";
  if (range.from && range.to && range.from === range.to) {
    return formatDay(range.from);
  }
  const from = range.from ? formatDay(range.from) : "…";
  const to = range.to ? formatDay(range.to) : "…";
  return `${from} – ${to}`;
}

function formatDay(iso: string): string {
  // Parse as local-time midnight so the string never shifts a day across TZs.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** True when the event's ISO timestamp falls inside the (inclusive) range. */
export function inRange(occurredAt: string, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  const ts = new Date(occurredAt);
  if (range.from) {
    const [y, m, d] = range.from.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (ts < start) return false;
  }
  if (range.to) {
    const [y, m, d] = range.to.split("-").map(Number);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    if (ts > end) return false;
  }
  return true;
}
