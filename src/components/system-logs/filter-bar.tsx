"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FILTER_OPTIONS,
  type LogCategory,
} from "@/lib/system-logs-data";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/system-logs/date-range-picker";
import { cn } from "@/lib/utils";

type Filter = "all" | LogCategory;

export function FilterBar({
  filter,
  onFilter,
  query,
  onQuery,
  range,
  onRange,
}: {
  filter: Filter;
  onFilter: (v: Filter) => void;
  query: string;
  onQuery: (v: string) => void;
  range: DateRange;
  onRange: (r: DateRange) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilter(opt.value)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-muted"
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Date range + search */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={range} onChange={onRange} />
          <div className="relative w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search logs..."
              className="h-10 rounded-lg border-transparent bg-card pl-9 text-sm ring-1 ring-border"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
