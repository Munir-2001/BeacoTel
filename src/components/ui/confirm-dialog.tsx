"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SweetAlert-style confirmation dialog. Centered card with a colored icon,
 * title, message and Cancel / Confirm buttons — use it to gate destructive
 * actions. Controlled: render it with `open` and handle `onConfirm`/`onCancel`.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' = red confirm (destructive); 'default' = primary confirm. */
  tone?: "danger" | "default";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Esc to cancel while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  // Portal to <body> so the fixed overlay is relative to the viewport, not a
  // transformed/overflow ancestor (e.g. a slide-in sheet or scrollable table),
  // which would otherwise clip it and push text out of bounds.
  if (!open || typeof document === "undefined") return null;

  const danger = tone === "danger";

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-7 pt-8 text-center">
          <span
            className={cn(
              "grid size-16 place-items-center rounded-full",
              danger ? "bg-red-100" : "bg-amber-100",
            )}
          >
            <AlertTriangle
              className={cn(
                "size-8",
                danger ? "text-red-600" : "text-amber-600",
              )}
              strokeWidth={2}
            />
          </span>
          <h2 className="mt-5 w-full break-words text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {message ? (
            <div className="mt-2 w-full break-words text-sm leading-relaxed text-muted-foreground">
              {message}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 p-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
            className="h-11 flex-1 rounded-lg text-sm font-medium ring-1 ring-border"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "h-11 flex-1 rounded-lg text-sm font-semibold text-white disabled:opacity-60",
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            )}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
