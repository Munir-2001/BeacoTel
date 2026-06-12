"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ALL_CATEGORIES,
  ALL_ITEM_TYPES,
  ALL_STATUSES,
  CATEGORY_LABEL,
  ITEM_TYPE_LABEL,
  STATUS_OPTIONS,
  type Asset,
  type EquipmentCategory,
  type EquipmentStatus,
  type ItemType,
} from "@/lib/inventory/types";
import { setAssetStatus } from "@/lib/inventory/actions";
import { CATEGORY_VISUAL, STATUS_PILL } from "@/lib/inventory-data";
import { cn } from "@/lib/utils";
import { EditAssetSheet, type AssetDraft } from "./edit-asset-sheet";
import { ReleaseMenu } from "./release-menu";

const PAGE_SIZE = 10;

export type StaffOption = { id: string; name: string };

export function AssetRegistry({
  rows,
  staffOptions,
  canEdit,
}: {
  rows: Asset[];
  staffOptions: StaffOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AssetDraft | undefined>(undefined);

  // Deep-link from the sidebar CTA: /inventory?new=1 opens the create sheet.
  // We strip the param after acting so refreshes don't re-trigger it.
  useEffect(() => {
    if (searchParams.get("new") === "1" && canEdit) {
      setEditing(undefined);
      setSheetOpen(true);
      router.replace(pathname);
    }
  }, [searchParams, canEdit, pathname, router]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | EquipmentCategory>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentStatus>(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // "all" | "unassigned" | uuid

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.itemType !== typeFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned") {
          if (r.assignedToId) return false;
        } else if (r.assignedToId !== assigneeFilter) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          r.name,
          r.assetCode,
          r.location,
          r.rfidTagId,
          r.assignedToName ?? "",
          CATEGORY_LABEL[r.category],
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, categoryFilter, statusFilter, typeFilter, assigneeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function openCreate() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(row: Asset) {
    setEditing(assetToDraft(row));
    setSheetOpen(true);
  }
  function resetPage() {
    setPage(1);
  }
  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vda-telkonet-assets-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filterActive =
    query !== "" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    assigneeFilter !== "all";

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            Asset Registry
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comprehensive inventory of all tracked property.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="h-10 gap-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
          {canEdit ? (
            <Button
              onClick={openCreate}
              className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" strokeWidth={2.2} />
              Add Asset
            </Button>
          ) : null}
        </div>
      </header>

      <FilterBar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          resetPage();
        }}
        category={categoryFilter}
        onCategory={(v) => {
          setCategoryFilter(v);
          resetPage();
        }}
        status={statusFilter}
        onStatus={(v) => {
          setStatusFilter(v);
          resetPage();
        }}
        itemType={typeFilter}
        onItemType={(v) => {
          setTypeFilter(v);
          resetPage();
        }}
        assignee={assigneeFilter}
        onAssignee={(v) => {
          setAssigneeFilter(v);
          resetPage();
        }}
        staffOptions={staffOptions}
        canClear={filterActive}
        onClear={() => {
          setQuery("");
          setCategoryFilter("all");
          setStatusFilter("all");
          setTypeFilter("all");
          setAssigneeFilter("all");
          resetPage();
        }}
      />

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <Th>Asset ID</Th>
              <Th>Name / Category</Th>
              <Th>Type</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th>Assigned To</Th>
              <Th className="text-right">Value</Th>
              <Th className="text-right">Actions</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {filterActive
                    ? "No assets match these filters."
                    : "No assets yet. Click “Add Asset” to register one."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <AssetRowCells
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  onOpen={() => openEdit(row)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-medium text-foreground">
            {pageRows.length === 0
              ? 0
              : `${(safePage - 1) * PAGE_SIZE + 1}-${(safePage - 1) * PAGE_SIZE + pageRows.length}`}
          </span>{" "}
          of {filtered.length} asset{filtered.length === 1 ? "" : "s"}
          {filterActive && filtered.length !== rows.length
            ? ` (filtered from ${rows.length})`
            : ""}
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

      <EditAssetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        staffOptions={staffOptions}
        onSaved={() => {
          setSheetOpen(false);
          router.refresh();
        }}
      />
    </Card>
  );
}

function AssetRowCells({
  row,
  canEdit,
  onOpen,
}: {
  row: Asset;
  canEdit: boolean;
  onOpen: () => void;
}) {
  const visual = CATEGORY_VISUAL[row.category];
  const Icon = visual.icon;
  const [status, setStatus] = useState<EquipmentStatus>(row.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus(next: EquipmentStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await setAssetStatus(row.id, next);
      if (!res.ok) {
        setStatus(prev);
        setError(res.error ?? "Could not update status.");
      }
    });
  }

  return (
    <TableRow
      onClick={onOpen}
      className="cursor-pointer border-border/70 hover:bg-muted/40"
    >
      <TableCell className="py-5 text-sm font-medium text-foreground">
        {row.assetCode}
      </TableCell>
      <TableCell className="py-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg",
              visual.iconBg,
            )}
          >
            <Icon className={cn("size-4", visual.iconFg)} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.category[0].toUpperCase() + row.category.slice(1)}
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
      <TableCell className="py-5">
        <TypePill itemType={row.itemType} tracked={row.beaconId !== null} />
      </TableCell>
      <TableCell className="py-5 text-sm text-foreground">
        {row.location || "—"}
      </TableCell>
      <TableCell
        className="py-5"
        onClick={(e) => e.stopPropagation()}
      >
        {canEdit ? (
          row.assignedToId ? (
            <ReleaseMenu assetId={row.id} />
          ) : (
            <InlineStatusSelect
              value={status}
              onChange={changeStatus}
              disabled={pending}
            />
          )
        ) : (
          <StatusPill status={status} />
        )}
      </TableCell>
      <TableCell className="py-5 text-sm text-foreground">
        {row.assignedToName ?? "—"}
      </TableCell>
      <TableCell className="py-5 text-right text-sm font-medium text-foreground">
        €{row.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="py-5 text-right">
        <button
          aria-label="Edit row"
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

function InlineStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: EquipmentStatus;
  onChange: (v: EquipmentStatus) => void;
  disabled?: boolean;
}) {
  // This dropdown only renders for unassigned rows (see caller). 'archived'
  // goes through the Archive button, and 'in_use' requires an assignee —
  // both come off the list.
  const editable = ALL_STATUSES.filter(
    (s) => s !== "archived" && s !== "in_use",
  );
  const pill = STATUS_PILL[value];

  return (
    <div className="relative w-[140px]">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as EquipmentStatus)}
        className={cn(
          "h-8 w-full cursor-pointer appearance-none rounded-full px-2.5 pr-7 text-[11px] font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60",
          pill.className,
        )}
      >
        {editable.map((s) => (
          <option key={s} value={s}>
            {STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2"
        strokeWidth={2.2}
      />
    </div>
  );
}

/**
 * Asset rows get a violet pill (plus a live-tracking dot when beacon-bound);
 * plain inventory stays neutral so the registry reads at a glance.
 */
function TypePill({
  itemType,
  tracked,
}: {
  itemType: ItemType;
  tracked: boolean;
}) {
  if (itemType === "asset") {
    return (
      <span
        title={tracked ? "Beacon-tracked asset" : "Asset"}
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-800"
      >
        {tracked ? (
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-violet-600" />
        ) : null}
        Asset
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
      Inventory
    </span>
  );
}

function StatusPill({ status }: { status: EquipmentStatus }) {
  const s = STATUS_PILL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        s.className,
      )}
    >
      {s.label}
    </span>
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
        "h-auto pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
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

function FilterBar({
  query,
  onQuery,
  category,
  onCategory,
  status,
  onStatus,
  itemType,
  onItemType,
  assignee,
  onAssignee,
  staffOptions,
  canClear,
  onClear,
}: {
  query: string;
  onQuery: (v: string) => void;
  category: "all" | EquipmentCategory;
  onCategory: (v: "all" | EquipmentCategory) => void;
  status: "all" | EquipmentStatus;
  onStatus: (v: "all" | EquipmentStatus) => void;
  itemType: "all" | ItemType;
  onItemType: (v: "all" | ItemType) => void;
  assignee: string;
  onAssignee: (v: string) => void;
  staffOptions: StaffOption[];
  canClear: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 p-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, asset code, RFID, location…"
          className="h-9 rounded-lg border-transparent bg-card pl-9 text-sm ring-1 ring-border"
        />
      </div>

      <SelectChip
        value={category}
        onChange={(v) => onCategory(v as "all" | EquipmentCategory)}
        options={[
          { value: "all", label: "All Categories" },
          ...ALL_CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABEL[c],
          })),
        ]}
      />

      <SelectChip
        value={status}
        onChange={(v) => onStatus(v as "all" | EquipmentStatus)}
        options={[
          { value: "all", label: "All Statuses" },
          ...ALL_STATUSES.filter((s) => s !== "archived").map((s) => ({
            value: s,
            label: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
          })),
        ]}
      />

      <SelectChip
        value={itemType}
        onChange={(v) => onItemType(v as "all" | ItemType)}
        options={[
          { value: "all", label: "All Types" },
          ...ALL_ITEM_TYPES.map((t) => ({
            value: t,
            label: ITEM_TYPE_LABEL[t],
          })),
        ]}
      />

      <SelectChip
        value={assignee}
        onChange={onAssignee}
        options={[
          { value: "all", label: "All Assignees" },
          { value: "unassigned", label: "Unassigned" },
          ...staffOptions.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SelectChip({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-lg bg-card pl-3 pr-8 text-sm font-medium text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
    </div>
  );
}

function toCsv(rows: Asset[]): string {
  const header = [
    "asset_code",
    "name",
    "category",
    "item_type",
    "status",
    "location",
    "rfid_tag_id",
    "assigned_to",
    "value_eur",
    "last_inspected_at",
    "notes",
  ];
  const cells = (r: Asset) => [
    r.assetCode,
    r.name,
    CATEGORY_LABEL[r.category],
    ITEM_TYPE_LABEL[r.itemType],
    STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status,
    r.location,
    r.rfidTagId,
    r.assignedToName ?? "",
    r.value.toFixed(2),
    r.lastInspectedAt ?? "",
    r.notes.replace(/\r?\n/g, " "),
  ];
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [header, ...rows.map(cells)].map((line) =>
    line.map((c) => escape(String(c))).join(","),
  );
  return lines.join("\n");
}

export function assetToDraft(a: Asset): AssetDraft {
  return {
    id: a.id,
    assetCode: a.assetCode,
    name: a.name,
    category: a.category,
    location: a.location,
    status: a.status === "archived" ? "available" : a.status,
    rfidTagId: a.rfidTagId,
    assignedToId: a.assignedToId ?? "",
    value: a.value,
    notes: a.notes,
    itemType: a.itemType,
  };
}
