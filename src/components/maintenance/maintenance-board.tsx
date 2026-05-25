import { AlertTriangle, Boxes, CheckCheck, Wrench } from "lucide-react";
import type { Asset, EquipmentStatus } from "@/lib/inventory/types";
import { AssetCard } from "./asset-card";
import { cn } from "@/lib/utils";

type ColumnKey = Exclude<EquipmentStatus, "archived">;

const COLUMNS: {
  key: ColumnKey;
  label: string;
  icon: typeof Wrench;
  /** Dot color shown in the column header. */
  dot: string;
  /** Header tint applied behind the title strip. */
  headerBg: string;
}[] = [
  {
    key: "broken",
    label: "Broken",
    icon: AlertTriangle,
    dot: "bg-rose-500",
    headerBg: "bg-rose-50",
  },
  {
    key: "maintenance",
    label: "In Maintenance",
    icon: Wrench,
    dot: "bg-amber-500",
    headerBg: "bg-amber-50",
  },
  {
    key: "in_use",
    label: "In Use",
    icon: Boxes,
    dot: "bg-sky-500",
    headerBg: "bg-sky-50",
  },
  {
    key: "available",
    label: "Available",
    icon: CheckCheck,
    dot: "bg-emerald-500",
    headerBg: "bg-emerald-50",
  },
];

/**
 * Kanban view of all non-archived equipment, grouped by status. Cards inside
 * each column let the caller flip status (which moves the card to another
 * column on next render) and stamp an inspection.
 */
export function MaintenanceBoard({
  assets,
  canEdit,
}: {
  assets: Asset[];
  canEdit: boolean;
}) {
  const buckets = bucketByStatus(assets);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const items = buckets[col.key];
        return (
          <section
            key={col.key}
            aria-labelledby={`col-${col.key}`}
            className="flex min-h-[400px] flex-col rounded-2xl border border-border/70 bg-muted/30"
          >
            <header
              className={cn(
                "flex items-center justify-between gap-2 rounded-t-2xl px-4 py-3",
                col.headerBg,
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn("inline-block size-2 rounded-full", col.dot)}
                />
                <Icon className="size-4 text-foreground/70" strokeWidth={2} />
                <h2
                  id={`col-${col.key}`}
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {col.label}
                </h2>
              </div>
              <span className="rounded-full bg-card/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground ring-1 ring-border">
                {items.length}
              </span>
            </header>

            <div className="flex flex-col gap-3 p-3">
              {items.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Nothing here.
                </p>
              ) : (
                items.map((a) => (
                  <AssetCard key={a.id} asset={a} canEdit={canEdit} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function bucketByStatus(assets: Asset[]): Record<ColumnKey, Asset[]> {
  const buckets: Record<ColumnKey, Asset[]> = {
    broken: [],
    maintenance: [],
    in_use: [],
    available: [],
  };
  for (const a of assets) {
    if (a.status === "archived") continue;
    buckets[a.status as ColumnKey].push(a);
  }
  return buckets;
}
