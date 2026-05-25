"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  MapPin,
  PackageOpen,
} from "lucide-react";
import { releaseMyAsset, type ReleasableStatus } from "@/lib/inventory/actions";
import { CATEGORY_VISUAL, STATUS_PILL } from "@/lib/inventory-data";
import type { Asset } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

const RELEASE_OPTIONS: { value: ReleasableStatus; label: string; hint: string }[] = [
  { value: "available", label: "Mark Available", hint: "Returning in good condition" },
  { value: "maintenance", label: "Send to Maintenance", hint: "Needs service before next use" },
  { value: "broken", label: "Report Broken", hint: "Unsafe to use" },
];

/**
 * Single row inside the My Assets card. Houses the Release flow: click the
 * button, pick a destination status, and the server action both unassigns
 * the row from the current user and flips its status accordingly.
 */
export function MyAssetRow({
  asset,
  onReleased,
}: {
  asset: Asset;
  /** Tells the parent to drop this row from the list optimistically. */
  onReleased: (id: string) => void;
}) {
  const visual = CATEGORY_VISUAL[asset.category];
  const Icon = visual.icon;
  const pill = STATUS_PILL[asset.status];

  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function release(next: ReleasableStatus) {
    setError(null);
    setMenuOpen(false);
    startTransition(async () => {
      const res = await releaseMyAsset(asset.id, next);
      if (!res.ok) {
        setError(res.error ?? "Could not release this asset.");
        return;
      }
      onReleased(asset.id);
    });
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5">
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          visual.iconBg,
        )}
      >
        <Icon className={cn("size-4", visual.iconFg)} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {asset.assetCode}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              pill.className,
            )}
          >
            {pill.label}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {asset.name}
        </p>
        <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {asset.location ? (
            <li className="flex items-center gap-1">
              <MapPin className="size-3" strokeWidth={2} />
              {asset.location}
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <ClipboardCheck className="size-3" strokeWidth={2} />
            {asset.lastInspectedAt
              ? `Inspected ${formatDate(asset.lastInspectedAt)}`
              : "Never inspected"}
          </li>
        </ul>
        {error ? (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="size-3" strokeWidth={2} />
            {error}
          </p>
        ) : null}
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-secondary px-3 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" strokeWidth={2} />
          ) : (
            <PackageOpen className="size-3.5" strokeWidth={2} />
          )}
          Release
          <ChevronDown className="size-3" strokeWidth={2.2} />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-[260px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          >
            <p className="border-b border-border/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Release & set status
            </p>
            <ul className="py-1">
              {RELEASE_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => release(opt.value)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {opt.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
