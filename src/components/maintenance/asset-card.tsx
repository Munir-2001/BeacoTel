"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";
import {
  ALL_STATUSES,
  STATUS_OPTIONS,
  type Asset,
  type EquipmentStatus,
} from "@/lib/inventory/types";
import {
  markInspected,
  setAssetStatus,
} from "@/lib/inventory/actions";
import { CATEGORY_VISUAL, STATUS_PILL } from "@/lib/inventory-data";
import { ReleaseMenu } from "@/components/inventory/release-menu";
import { cn } from "@/lib/utils";

/**
 * A single card in the maintenance kanban. Clicking the status pill opens
 * a dropdown to flip the row to another column; the "Inspected" button
 * stamps today's date and writes an `equipment.inspection_completed` audit.
 */
export function AssetCard({
  asset,
  canEdit,
}: {
  asset: Asset;
  canEdit: boolean;
}) {
  const visual = CATEGORY_VISUAL[asset.category];
  const Icon = visual.icon;
  const [status, setStatus] = useState<EquipmentStatus>(asset.status);
  const [lastInspectedAt, setLastInspectedAt] = useState<string | null>(
    asset.lastInspectedAt,
  );
  const [error, setError] = useState<string | null>(null);
  const [okFlash, setOkFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeStatus(next: EquipmentStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await setAssetStatus(asset.id, next);
      if (!res.ok) {
        setStatus(prev);
        setError(res.error ?? "Could not update status.");
      }
    });
  }

  function inspect() {
    setError(null);
    setOkFlash(false);
    const today = new Date().toISOString().slice(0, 10);
    const prev = lastInspectedAt;
    setLastInspectedAt(today);
    startTransition(async () => {
      const res = await markInspected(asset.id);
      if (!res.ok) {
        setLastInspectedAt(prev);
        setError(res.error ?? "Could not log inspection.");
        return;
      }
      setOkFlash(true);
      setTimeout(() => setOkFlash(false), 2200);
    });
  }

  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-none transition-shadow hover:shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {asset.assetCode}
        </span>
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            visual.iconBg,
          )}
        >
          <Icon className={cn("size-4", visual.iconFg)} strokeWidth={2} />
        </div>
      </header>

      <h3 className="mt-1.5 text-sm font-semibold leading-tight text-foreground">
        {asset.name}
      </h3>

      <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <MapPin className="size-3" strokeWidth={2} />
          <span>{asset.location || "—"}</span>
        </li>
        {asset.assignedToName ? (
          <li className="flex items-center gap-1.5">
            <UserRound className="size-3" strokeWidth={2} />
            <span>{asset.assignedToName}</span>
          </li>
        ) : null}
        <li className="flex items-center gap-1.5">
          <ClipboardCheck className="size-3" strokeWidth={2} />
          <span>
            {lastInspectedAt
              ? `Inspected ${formatDate(lastInspectedAt)}`
              : "Never inspected"}
          </span>
        </li>
      </ul>

      {error ? (
        <p className="mt-2.5 flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="size-3" strokeWidth={2} />
          {error}
        </p>
      ) : null}
      {okFlash && !error ? (
        <p className="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-700">
          <CheckCircle2 className="size-3" strokeWidth={2} />
          Inspection logged.
        </p>
      ) : null}

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        {canEdit ? (
          asset.assignedToId ? (
            <ReleaseMenu assetId={asset.id} variant="wide" />
          ) : (
            <StatusFlip
              value={status}
              onChange={changeStatus}
              disabled={pending}
            />
          )
        ) : (
          <StatusPill status={status} />
        )}
        {canEdit ? (
          <button
            type="button"
            onClick={inspect}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary px-2.5 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
            title="Mark this asset as inspected today"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" strokeWidth={2} />
            ) : (
              <ClipboardCheck className="size-3" strokeWidth={2} />
            )}
            Inspected
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function StatusFlip({
  value,
  onChange,
  disabled,
}: {
  value: EquipmentStatus;
  onChange: (v: EquipmentStatus) => void;
  disabled?: boolean;
}) {
  // Only shown for unassigned cards. 'in_use' is excluded too — to mark
  // something In Use you assign a staff member in the edit sheet.
  const editable = ALL_STATUSES.filter(
    (s) => s !== "archived" && s !== "in_use",
  );
  const pill = STATUS_PILL[value];
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as EquipmentStatus)}
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-full pl-2.5 pr-7 text-[10px] font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60",
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
        className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2"
        strokeWidth={2.2}
      />
    </div>
  );
}

function StatusPill({ status }: { status: EquipmentStatus }) {
  const pill = STATUS_PILL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        pill.className,
      )}
    >
      {pill.label}
    </span>
  );
}

function formatDate(iso: string): string {
  // YYYY-MM-DD only — render as local-time month/day.
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
