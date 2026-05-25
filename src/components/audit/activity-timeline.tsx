"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getResourceHistory, type HistoryItem } from "@/lib/audit/history";
import type { AuditResourceType } from "@/lib/audit/log";
import { cn } from "@/lib/utils";

/**
 * Loads the last N audit rows for a given resource and renders them as a
 * compact vertical timeline. Designed to drop into the bottom of an edit
 * sheet — fetches on mount so the data is always fresh.
 */
export function ActivityTimeline({
  resourceType,
  resourceId,
  limit = 15,
}: {
  resourceType: AuditResourceType;
  resourceId: string | undefined;
  limit?: number;
}) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;
    setItems(null);
    setError(null);
    getResourceHistory(resourceType, resourceId, limit)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load history.");
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId, limit]);

  if (!resourceId) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <History className="size-3.5" strokeWidth={2} />
          Activity History
        </Label>
        {items ? (
          <span className="text-[11px] text-muted-foreground">
            Last {items.length}
          </span>
        ) : null}
      </div>

      {items === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" strokeWidth={2} />
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 rounded-lg bg-muted/40 px-3 py-3 text-center text-xs text-muted-foreground">
          {error ?? "No activity recorded yet."}
        </p>
      ) : (
        <ol className="mt-3 space-y-3 border-l border-border/70 pl-4">
          {items.map((row, i) => (
            <li key={row.id} className="relative">
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[1.34rem] top-1.5 inline-block size-2 rounded-full",
                  i === 0
                    ? "bg-primary ring-4 ring-primary/15"
                    : "bg-muted-foreground/40",
                )}
              />
              <p className="text-sm leading-snug text-foreground">
                {row.message}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {relativeTime(row.occurredAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
