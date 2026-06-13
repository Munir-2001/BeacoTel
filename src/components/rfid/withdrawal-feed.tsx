"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  PackageOpen,
  Radio,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useWithdrawalFeed } from "@/lib/rfid/live";
import type { WithdrawalEvent } from "@/lib/rfid/types";
import { cn } from "@/lib/utils";

/** Most-recent N movement events per page. */
const PAGE_SIZE = 3;

const noopSubscribe = () => () => {};
/** False during SSR + hydration, true after — gates locale date formatting so
 *  server and client markup match (see asset-guard.tsx for the same trick). */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function WithdrawalFeed({ initial }: { initial: WithdrawalEvent[] }) {
  const { events, connected } = useWithdrawalFeed({ initial });
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = events.slice(start, start + PAGE_SIZE);

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
            <PackageOpen className="size-4 text-primary" strokeWidth={2} />
            Live Fridge Activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Items detected leaving and returning to the fridge, newest first.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm ring-1 ring-border"
          title={
            connected
              ? "Subscribed to live movement events"
              : "Falling back to polling"
          }
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
            )}
          />
          {connected ? "Live" : "Polling"}
        </span>
      </header>

      <div className="mt-5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Radio className="size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              No activity yet. Withdraw or return a tagged item from the fridge
              below to see it appear here instantly.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {pageRows.map((e) => (
              <EventRow key={e.id} event={e} hydrated={hydrated} />
            ))}
          </ul>
        )}
      </div>

      {events.length > 0 ? (
        <footer className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-medium text-foreground">
              {start + 1}-{start + pageRows.length}
            </span>{" "}
            of {events.length}
          </span>
          <nav className="flex items-center gap-1">
            <PageBtn
              ariaLabel="Newer events"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </PageBtn>
            <span className="px-2 text-foreground">
              {safePage} / {pageCount}
            </span>
            <PageBtn
              ariaLabel="Older events"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage === pageCount}
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </PageBtn>
          </nav>
        </footer>
      ) : null}
    </Card>
  );
}

function EventRow({
  event,
  hydrated,
}: {
  event: WithdrawalEvent;
  hydrated: boolean;
}) {
  const returned = event.kind === "returned";
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
          returned ? "bg-emerald-50" : "bg-amber-50",
        )}
      >
        {returned ? (
          <PackageCheck className="size-4 text-emerald-600" strokeWidth={2} />
        ) : (
          <PackageOpen className="size-4 text-amber-600" strokeWidth={2} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {event.productName}{" "}
          <span
            className={cn(
              "font-normal",
              returned ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {returned ? "returned" : "withdrawn"}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono">{event.epc}</span>
          {event.readerLabel ? ` · ${event.readerLabel}` : ""}
        </p>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {hydrated ? formatTime(event.withdrawnAt) : " "}
      </time>
    </li>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.round(diff / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return new Date(iso).toLocaleString();
}
