"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  STAFF_OPTIONS,
  STATUS_OPTIONS,
  type EditableAssetStatus,
} from "@/lib/inventory-data";

export type AssetDraft = {
  id?: string;
  name: string;
  rfidTagId: string;
  status: EditableAssetStatus;
  assignedStaff: string;
  notes: string;
};

const EMPTY_DRAFT: AssetDraft = {
  name: "",
  rfidTagId: "",
  status: "in_use",
  assignedStaff: STAFF_OPTIONS[0],
  notes: "",
};

export function EditAssetSheet({
  open,
  onOpenChange,
  initial,
  onSave,
  onArchive,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When undefined, the sheet is in "create" mode. */
  initial?: AssetDraft;
  onSave: (draft: AssetDraft) => void;
  onArchive?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<AssetDraft>(initial ?? EMPTY_DRAFT);

  useEffect(() => {
    if (open) setDraft(initial ?? EMPTY_DRAFT);
  }, [open, initial]);

  const isEdit = Boolean(initial?.id);

  function update<K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit Asset" : "Add Asset"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Update asset registry and tracking parameters
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <FieldGroup label="Asset Visual">
            <div className="relative h-[180px] overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 55%, rgba(99,102,241,0.4) 0%, rgba(15,23,42,0) 60%)",
                }}
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Asset Name" htmlFor="asset-name">
            <Input
              id="asset-name"
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Lutron Central Hub X1"
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <FieldGroup label="RFID Tag ID" htmlFor="rfid">
              <div className="relative">
                <Radio
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary"
                  strokeWidth={2}
                />
                <Input
                  id="rfid"
                  value={draft.rfidTagId}
                  onChange={(e) => update("rfidTagId", e.target.value)}
                  placeholder="RFID-000-XXX"
                  className="h-11 rounded-lg bg-muted/60 pl-9 text-sm"
                />
              </div>
            </FieldGroup>
            <FieldGroup label="Status" htmlFor="status">
              <NativeSelect
                id="status"
                value={draft.status}
                onChange={(v) => update("status", v as EditableAssetStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
          </div>

          <div className="mt-6">
            <FieldGroup label="Assigned Staff" htmlFor="staff">
              <NativeSelect
                id="staff"
                value={draft.assignedStaff}
                onChange={(v) => update("assignedStaff", v)}
              >
                {STAFF_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
          </div>

          <div className="mt-6">
            <FieldGroup label="Maintenance History & Notes" htmlFor="notes">
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Enter maintenance notes or asset specifications..."
                rows={5}
                className="resize-none rounded-lg bg-muted/60 text-sm"
              />
            </FieldGroup>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 p-6">
          {isEdit && onArchive ? (
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
              onClick={() => initial?.id && onArchive(initial.id)}
            >
              Archive Asset
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-lg text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => onSave(draft)}
          >
            Save Changes
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 space-y-2 [&+&]:mt-6">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-muted/60 pl-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {children}
      </select>
      <ChevronDownSmall />
    </div>
  );
}

function ChevronDownSmall() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
