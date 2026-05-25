"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { FilterBar } from "@/components/system-logs/filter-bar";
import { EventList } from "@/components/system-logs/event-list";
import {
  EMPTY_RANGE,
  inRange,
  type DateRange,
} from "@/components/system-logs/date-range-picker";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_META,
  SEVERITY_META,
  type LogCategory,
  type LogEvent,
} from "@/lib/system-logs-data";

type Filter = "all" | LogCategory;

const PAGE_SIZE = 30;

export function SystemLogsClient({
  events,
  canExport,
}: {
  events: LogEvent[];
  /** Admin-only: shows the CSV export action. */
  canExport: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Track whether we've already fired the deep-link export so a remount
  // doesn't re-download (the URL strip happens after the click).
  const exportFired = useRef(false);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (filter !== "all" && ev.category !== filter) return false;
      if (!inRange(ev.occurredAt, range)) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          ev.message.toLowerCase().includes(q) ||
          ev.category.includes(q) ||
          ev.severity.includes(q)
        );
      }
      return true;
    });
  }, [events, filter, query, range]);

  const pageItems = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vda-telkonet-system-logs-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Deep-link from the sidebar (?export=1) auto-fires the download once.
  // Admin-gated by the same `canExport` flag the button uses, so non-admins
  // hitting the URL get no action.
  useEffect(() => {
    if (
      !exportFired.current &&
      canExport &&
      searchParams.get("export") === "1" &&
      filtered.length > 0
    ) {
      exportFired.current = true;
      exportCsv();
      router.replace(pathname);
    }
    // We intentionally don't depend on `filtered` to avoid re-firing as the
    // user changes filters — the deep-link should only act on initial open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canExport, pathname, router]);

  return (
    <>
      <FilterBar
        filter={filter}
        onFilter={(f) => {
          setFilter(f);
          setVisible(PAGE_SIZE);
        }}
        query={query}
        onQuery={(q) => {
          setQuery(q);
          setVisible(PAGE_SIZE);
        }}
        range={range}
        onRange={(r) => {
          setRange(r);
          setVisible(PAGE_SIZE);
        }}
      />

      {canExport ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            event{filtered.length === 1 ? "" : "s"} match the current filters.
          </span>
          <Button
            variant="ghost"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="h-9 gap-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" strokeWidth={2} />
            Export CSV ({filtered.length})
          </Button>
        </div>
      ) : null}

      <EventList
        events={pageItems}
        hasMore={hasMore}
        onLoadMore={() => setVisible((v) => v + PAGE_SIZE)}
      />
    </>
  );
}

function toCsv(rows: LogEvent[]): string {
  const header = [
    "occurred_at",
    "category",
    "severity",
    "message",
  ];
  const cells = (r: LogEvent) => [
    r.occurredAt,
    CATEGORY_META[r.category].label,
    SEVERITY_META[r.severity].label,
    r.message,
  ];
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [header, ...rows.map(cells)].map((line) =>
    line.map((c) => escape(String(c))).join(","),
  );
  return lines.join("\n");
}
