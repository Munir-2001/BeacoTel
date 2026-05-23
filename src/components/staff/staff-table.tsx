"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
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
  DEPARTMENT_LABEL,
  DEPARTMENT_OPTIONS,
  ROLE_OPTIONS,
  avatarTintForRole,
  initialsOf,
  type Department,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-data";
import type { StaffRow } from "@/lib/staff/admin";
import { updateStaff } from "@/lib/staff/actions";
import { cn } from "@/lib/utils";

type Tab = "all" | "on" | "off";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All Staff" },
  { value: "on", label: "On Duty" },
  { value: "off", label: "Off Duty" },
];

const PAGE_SIZE = 10;

export function StaffTable({
  rows,
  currentUserId,
  canChangeRole,
  canChangeDepartment,
  onRowOpen,
}: {
  rows: StaffRow[];
  currentUserId: string;
  canChangeRole: boolean;
  canChangeDepartment: boolean;
  onRowOpen: (member: StaffRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return rows.filter((m) => {
      const status: StaffStatus = m.isActive ? "active" : "inactive";
      if (tab === "on" && status !== "active") return false;
      if (tab === "off" && status !== "inactive") return false;
      if (query) {
        const q = query.toLowerCase();
        const deptLabel = m.department ? DEPARTMENT_LABEL[m.department] : "";
        return (
          m.name.toLowerCase().includes(q) ||
          deptLabel.toLowerCase().includes(q) ||
          m.employeeId.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.includes(q)
        );
      }
      return true;
    });
  }, [rows, query, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map((m) => m.id)));
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 shadow-none">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by name, department, employee ID or email..."
            className="h-11 rounded-xl border-transparent bg-card pl-10 text-sm"
          />
        </div>
        <div className="flex h-11 rounded-xl bg-card p-1 ring-1 ring-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setTab(t.value);
                setPage(1);
              }}
              className={cn(
                "h-full rounded-lg px-4 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

      <div className="mt-4 overflow-x-auto rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-12 pl-5">
                <Checkbox
                  checked={
                    pageRows.length > 0 && selected.size === pageRows.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <Th>Name &amp; ID</Th>
              <Th>Department</Th>
              <Th>Assigned Role</Th>
              <Th>Status</Th>
              <Th className="pr-5 text-right">Actions</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No staff match this filter.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((m) => (
                <StaffRowCells
                  key={m.id}
                  row={m}
                  selected={selected.has(m.id)}
                  onToggleSelect={() => toggle(m.id)}
                  onOpen={() => onRowOpen(m)}
                  canChangeRole={canChangeRole && m.id !== currentUserId}
                  canChangeDepartment={canChangeDepartment}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-medium text-foreground">
            {pageRows.length === 0
              ? 0
              : `${(safePage - 1) * PAGE_SIZE + 1}-${
                  (safePage - 1) * PAGE_SIZE + pageRows.length
                }`}
          </span>{" "}
          of {filtered.length} staff
          {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
        </span>
        <nav className="flex items-center gap-1">
          <PageBtn
            ariaLabel="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </PageBtn>
          <span className="px-3 text-sm text-foreground">
            Page {safePage} / {pageCount}
          </span>
          <PageBtn
            ariaLabel="Next page"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </PageBtn>
        </nav>
      </footer>
    </div>
  );
}

function StaffRowCells({
  row,
  selected,
  onToggleSelect,
  onOpen,
  canChangeRole,
  canChangeDepartment,
}: {
  row: StaffRow;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  canChangeRole: boolean;
  canChangeDepartment: boolean;
}) {
  const [role, setRole] = useState<StaffRole>(row.role);
  const [department, setDepartment] = useState<Department | null>(row.department);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeRole(next: StaffRole) {
    if (next === role) return;
    const prev = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const res = await updateStaff(row.id, { role: next });
      if (!res.ok) {
        setRole(prev);
        setError(res.error ?? "Could not update role.");
      }
    });
  }

  function changeDepartment(next: Department) {
    if (next === department) return;
    const prev = department;
    setDepartment(next);
    setError(null);
    startTransition(async () => {
      const res = await updateStaff(row.id, { department: next });
      if (!res.ok) {
        setDepartment(prev);
        setError(res.error ?? "Could not update department.");
      }
    });
  }

  return (
    <TableRow
      onClick={onOpen}
      className="cursor-pointer border-border/60 transition-colors hover:bg-muted/40"
    >
      <TableCell className="w-12 pl-5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback
              className={cn("text-xs font-semibold", avatarTintForRole(row.role))}
            >
              {initialsOf(row.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.employeeId || "—"} • {row.email}
            </p>
            {error ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={2} />
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
        <DepartmentSelect
          value={department}
          onChange={changeDepartment}
          disabled={!canChangeDepartment || pending}
        />
      </TableCell>
      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
        <RoleSelect
          value={role}
          onChange={changeRole}
          disabled={!canChangeRole || pending}
        />
      </TableCell>
      <TableCell className="py-4">
        <StatusPill status={row.isActive ? "active" : "inactive"} />
      </TableCell>
      <TableCell className="py-4 pr-5 text-right">
        <button
          aria-label="Row actions"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="size-4" strokeWidth={2} />
        </button>
      </TableCell>
    </TableRow>
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
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: StaffRole;
  onChange: (v: StaffRole) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-[150px]">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as StaffRole)}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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

function DepartmentSelect({
  value,
  onChange,
  disabled,
}: {
  value: Department | null;
  onChange: (v: Department) => void;
  disabled?: boolean;
}) {
  // `""` represents an unset department; selecting it is a no-op because the
  // column is conceptually optional but the action only writes real values.
  return (
    <div className="relative w-[170px]">
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onChange(v as Department);
        }}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value === null ? (
          <option value="" disabled>
            Unassigned
          </option>
        ) : null}
        {DEPARTMENT_OPTIONS.map((opt) => (
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
