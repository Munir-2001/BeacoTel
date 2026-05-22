"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/system-logs/filter-bar";
import { EventList } from "@/components/system-logs/event-list";
import {
  DEFAULT_DATE_RANGE,
  LOG_EVENTS,
  type LogCategory,
} from "@/lib/system-logs-data";

type Filter = "all" | LogCategory;

export default function SystemLogsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const events = useMemo(() => {
    return LOG_EVENTS.filter((ev) => {
      if (filter !== "all" && ev.category !== filter) return false;
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
  }, [filter, query]);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-8">
      <header>
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground">
          System Logs &amp; Event History
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Chronological record of property operations and staff activities.
        </p>
      </header>

      <FilterBar
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        dateRange={DEFAULT_DATE_RANGE}
      />

      <EventList events={events} />
    </div>
  );
}
