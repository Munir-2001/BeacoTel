"use client";

import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_META,
  SEVERITY_META,
  type LogEvent,
} from "@/lib/system-logs-data";
import { cn } from "@/lib/utils";

export function EventList({ events }: { events: LogEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="rounded-2xl border-border/70 bg-card p-12 text-center shadow-none">
        <p className="text-sm text-muted-foreground">
          No events match the current filters.
        </p>
      </Card>
    );
  }

  // Preserve incoming order while grouping by dayKey
  const groups: { key: string; label: string; items: LogEvent[] }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.key === ev.dayKey) {
      last.items.push(ev);
    } else {
      groups.push({ key: ev.dayKey, label: ev.dayLabel, items: [ev] });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {g.label}
          </h2>
          <ul className="space-y-3">
            {g.items.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </ul>
        </section>
      ))}

      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          className="h-11 rounded-lg bg-muted/60 px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Load More Events
        </Button>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: LogEvent }) {
  const cat = CATEGORY_META[event.category];
  const sev = SEVERITY_META[event.severity];
  const Icon = cat.icon;

  return (
    <li>
      <Card className="rounded-xl border-border/70 bg-card p-5 shadow-none transition-colors hover:bg-muted/30">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-lg",
              cat.iconBg
            )}
          >
            <Icon className={cn("size-5", cat.iconFg)} strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  cat.labelColor
                )}
              >
                {cat.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  sev.className
                )}
              >
                {sev.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {event.message}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2 text-right">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" strokeWidth={2} />
              {event.time}
            </span>
            <button className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline">
              Details
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}
