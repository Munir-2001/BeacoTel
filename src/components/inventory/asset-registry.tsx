"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ASSET_ROWS,
  INVENTORY_STATS,
  STAFF_OPTIONS,
  type AssetRow,
  type AssetStatus,
} from "@/lib/inventory-data";
import { cn } from "@/lib/utils";
import { EditAssetSheet, type AssetDraft } from "./edit-asset-sheet";

const PAGES = [1, 2, 3];

function rowToDraft(row: AssetRow): AssetDraft {
  return {
    id: row.id,
    name: row.name,
    rfidTagId: row.id.replace("#AST-", "RFID-"),
    status: row.status === "maintenance" ? "maintenance" : "in_use",
    assignedStaff: STAFF_OPTIONS[0],
    notes: "",
  };
}

export function AssetRegistry() {
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AssetDraft | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(row: AssetRow) {
    setEditing(rowToDraft(row));
    setSheetOpen(true);
  }

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
            className="h-10 gap-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
          <Button
            onClick={openCreate}
            className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Add Asset
          </Button>
        </div>
      </header>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <Th>Asset ID</Th>
              <Th>Name / Category</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th>Last Inspected</Th>
              <Th className="text-right">Value</Th>
              <Th className="text-right">Actions</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ASSET_ROWS.map((row) => {
              const Icon = row.icon;
              return (
                <TableRow
                  key={row.id}
                  onClick={() => openEdit(row)}
                  className="cursor-pointer border-border/70 hover:bg-muted/40"
                >
                  <TableCell className="py-5 text-sm font-medium text-foreground">
                    {row.id}
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg",
                          row.iconBg
                        )}
                      >
                        <Icon className={cn("size-4", row.iconFg)} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.category}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 text-sm text-foreground">
                    {row.location}
                  </TableCell>
                  <TableCell className="py-5">
                    <StatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="py-5 text-sm text-foreground">
                    {row.lastInspected}
                  </TableCell>
                  <TableCell className="py-5 text-right text-sm font-medium text-foreground">
                    €{row.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-5 text-right">
                    <button
                      aria-label="Edit row"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(row);
                      }}
                      className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="size-4" strokeWidth={2} />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {ASSET_ROWS.length} of {INVENTORY_STATS.total.toLocaleString()} assets
        </span>
        <nav className="flex items-center gap-1">
          <PageBtn
            ariaLabel="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </PageBtn>
          {PAGES.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={cn(
                "grid size-9 place-items-center rounded-md text-sm font-medium transition-colors",
                n === page
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
          <PageBtn
            ariaLabel="Next page"
            onClick={() => setPage((p) => Math.min(PAGES.length, p + 1))}
            disabled={page === PAGES.length}
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </PageBtn>
        </nav>
      </footer>

      <EditAssetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        onSave={() => setSheetOpen(false)}
        onArchive={() => setSheetOpen(false)}
      />
    </Card>
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
        className
      )}
    >
      {children}
    </TableHead>
  );
}

function StatusPill({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, { label: string; className: string }> = {
    operational: {
      label: "Operational",
      className: "bg-emerald-100 text-emerald-800",
    },
    maintenance: {
      label: "Maintenance",
      className: "bg-rose-100 text-rose-800",
    },
    broken: {
      label: "Broken",
      className: "bg-red-100 text-red-800",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        s.className
      )}
    >
      {s.label}
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
      className="grid size-9 place-items-center rounded-md text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
