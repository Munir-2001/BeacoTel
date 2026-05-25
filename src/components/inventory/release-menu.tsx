"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { releaseAsset, type ReleasableStatus } from "@/lib/inventory/actions";
import { STATUS_PILL } from "@/lib/inventory-data";
import { cn } from "@/lib/utils";

const RELEASE_OPTIONS: { value: ReleasableStatus; label: string; hint: string }[] =
  [
    { value: "available", label: "Mark Available", hint: "Ready for next use" },
    {
      value: "maintenance",
      label: "Send to Maintenance",
      hint: "Take offline for service",
    },
    {
      value: "broken",
      label: "Report Broken",
      hint: "Unsafe to use",
    },
  ];

/**
 * Replaces the disabled "In Use" pill on assigned rows / cards with a
 * dropdown that admin + manager can use to release the asset and set its
 * next status in one click. Server action `releaseAsset` does both the
 * unassignment and the status flip atomically and logs two audit rows.
 */
export function ReleaseMenu({
  assetId,
  onReleased,
  /** Toggle to switch to a wider style for the asset-card layout. */
  variant = "pill",
}: {
  assetId: string;
  onReleased?: () => void;
  variant?: "pill" | "wide";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function release(next: ReleasableStatus) {
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await releaseAsset(assetId, next);
      if (!res.ok) {
        setError(res.error ?? "Could not release this asset.");
        return;
      }
      onReleased?.();
      router.refresh();
    });
  }

  const pill = STATUS_PILL.in_use;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={pending}
        title="Release this asset and set its next status"
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
          pill.className,
          variant === "pill" ? "h-7 px-2.5" : "h-8 px-3",
        )}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" strokeWidth={2} />
        ) : null}
        {pill.label}
        <ChevronDown className="size-3" strokeWidth={2.2} />
      </button>

      {error ? (
        <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {open ? (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-30 mt-2 w-[240px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
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
  );
}
