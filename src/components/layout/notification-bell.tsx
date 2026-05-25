"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyActivityRow } from "@/lib/audit/me";

/**
 * Topbar bell. Shows a tiny dot when there's any activity in the last 24h.
 * Click opens a popover with the 5 most recent rows from `audit_logs` where
 * `actor_user_id = me`. The dot dismisses when the popover opens — purely
 * client-side; no "read receipt" persistence (yet).
 */
export function NotificationBell({ items }: { items: MyActivityRow[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const recentCount = items.filter(
    (r) => Date.now() - new Date(r.occurredAt).getTime() < 24 * 60 * 60 * 1000,
  ).length;
  const showDot = recentCount > 0 && !seen;

  useEffect(() => {
    if (!open) return;
    setSeen(true);
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {showDot ? (
          <span
            aria-hidden
            className="absolute right-2 top-2 inline-block size-2 rounded-full bg-rose-500 ring-2 ring-background"
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          className="absolute right-0 z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Your Recent Activity
            </h3>
            <Link
              href="/system-logs"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
            >
              See all
            </Link>
          </header>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Inbox className="size-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                Nothing recent. Your actions show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[360px] divide-y divide-border/70 overflow-y-auto">
              {items.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "px-4 py-3 transition-colors hover:bg-muted/60",
                  )}
                >
                  <p className="text-sm leading-snug text-foreground">
                    {row.message}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {relativeTime(row.occurredAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
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
  });
}
