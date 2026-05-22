"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PAGE_LIST,
  ROLE_OPTIONS,
  STAFF_ROWS,
  STAFF_STATS,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-data";
import { cn } from "@/lib/utils";

type Tab = "all" | "on" | "off";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All Staff" },
  { value: "on", label: "On Duty" },
  { value: "off", label: "Off Duty" },
];

export function StaffTable({
  onRowOpen,
}: {
  onRowOpen: (member: StaffMember) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return STAFF_ROWS.filter((m) => {
      if (tab === "on" && m.status !== "active") return false;
      if (tab === "off" && m.status !== "inactive") return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.department.toLowerCase().includes(q) ||
          m.employeeId.toLowerCase().includes(q) ||
          m.role.includes(q)
        );
      }
      return true;
    });
  }, [query, tab]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((m) => m.id)));
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 shadow-none">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, department, or tag..."
            className="h-11 rounded-xl border-transparent bg-card pl-10 text-sm"
          />
        </div>
        <div className="flex h-11 rounded-xl bg-card p-1 ring-1 ring-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "h-full rounded-lg px-4 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors",
            selected.size > 0
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <History className="size-4" strokeWidth={1.75} />
          Bulk Actions
          {selected.size > 0 && (
            <span className="ml-1 rounded bg-white/15 px-1.5 text-[11px] font-semibold">
              {selected.size}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-12 pl-5">
                <Checkbox
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <Th>Name &amp; ID</Th>
              <Th>Assigned Role</Th>
              <Th>Status</Th>
              <Th className="pr-5 text-right">Actions</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow
                key={m.id}
                onClick={() => onRowOpen(m)}
                className="cursor-pointer border-border/60 transition-colors hover:bg-muted/40"
              >
                <TableCell className="w-12 pl-5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(m.id)}
                    onCheckedChange={() => toggle(m.id)}
                  />
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback
                        className={cn("text-xs font-semibold", m.avatarTint)}
                      >
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {m.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.employeeId} • {m.department}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                  <RoleSelect value={m.role} onChange={() => {}} />
                </TableCell>
                <TableCell className="py-4">
                  <StatusPill status={m.status} />
                </TableCell>
                <TableCell className="py-4 pr-5 text-right">
                  <button
                    aria-label="Row actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowOpen(m);
                    }}
                    className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="size-4" strokeWidth={2} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">1-{filtered.length}</span>{" "}
          of {STAFF_STATS.totalPersonnel} staff members
        </span>
        <nav className="flex items-center gap-1">
          <PageBtn
            ariaLabel="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </PageBtn>
          {PAGE_LIST.map((n, i) =>
            n === "..." ? (
              <span
                key={`gap-${i}`}
                className="grid size-9 place-items-center text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n as number)}
                className={cn(
                  "grid size-9 place-items-center rounded-md text-sm font-medium transition-colors",
                  n === page
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {n}
              </button>
            )
          )}
          <PageBtn
            ariaLabel="Next page"
            onClick={() => setPage((p) => p + 1)}
            disabled={false}
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </PageBtn>
        </nav>
      </footer>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-12 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className
      )}
    >
      {children}
    </TableHead>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: StaffRole;
  onChange: (v: StaffRole) => void;
}) {
  return (
    <div className="relative w-[150px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StaffRole)}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium text-foreground"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function StatusPill({ status }: { status: StaffStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
        <span className="inline-block size-1.5 rounded-full bg-emerald-600" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
      <span className="inline-block size-1.5 rounded-full bg-rose-600" />
      Inactive
    </span>
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
      className="grid size-9 place-items-center rounded-md text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
