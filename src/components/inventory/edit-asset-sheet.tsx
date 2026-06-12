"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, Radio } from "lucide-react";
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
  CATEGORY_OPTIONS,
  ITEM_TYPE_OPTIONS,
  STATUS_OPTIONS,
  type EquipmentCategory,
  type EquipmentStatus,
  type ItemType,
} from "@/lib/inventory/types";
import {
  archiveAsset,
  createAsset,
  updateAsset,
} from "@/lib/inventory/actions";
import { ActivityTimeline } from "@/components/audit/activity-timeline";
import type { StaffOption } from "./asset-registry";

export type AssetDraft = {
  id?: string;
  /** Read-only, displayed in edit mode. New assets get one auto-assigned. */
  assetCode?: string;
  name: string;
  category: EquipmentCategory;
  /** Stored excluding 'archived' — archiving goes through the dedicated button. */
  status: Exclude<EquipmentStatus, "archived">;
  location: string;
  rfidTagId: string;
  /** Profile UUID or empty string for unassigned. */
  assignedToId: string;
  value: number;
  notes: string;
  itemType: ItemType;
};

const EMPTY_DRAFT: AssetDraft = {
  name: "",
  category: "other",
  status: "available",
  location: "",
  rfidTagId: "",
  assignedToId: "",
  value: 0,
  notes: "",
  itemType: "inventory",
};

export function EditAssetSheet({
  open,
  onOpenChange,
  initial,
  staffOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: AssetDraft;
  staffOptions: StaffOption[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AssetDraft>(initial ?? EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(initial ?? EMPTY_DRAFT);
      setError(null);
    }
  }, [open, initial]);

  const isEdit = Boolean(initial?.id);
  const isAssigned = Boolean(draft.assignedToId);

  function update<K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  /**
   * Assignment and status are coupled (DB CHECK in migration 0007). Whenever
   * the user picks an assignee, force status to in_use; whenever they clear
   * the assignee, drop in_use down to available so the form stays valid.
   */
  function changeAssignee(v: string) {
    setDraft((d) => {
      if (v) return { ...d, assignedToId: v, status: "in_use" };
      return {
        ...d,
        assignedToId: "",
        status: d.status === "in_use" ? "available" : d.status,
      };
    });
  }

  function handleSave() {
    setError(null);
    const payload = {
      name: draft.name,
      category: draft.category,
      status: draft.status as EquipmentStatus,
      location: draft.location,
      rfidTagId: draft.rfidTagId,
      assignedToId: draft.assignedToId || null,
      value: Number.isFinite(draft.value) ? draft.value : 0,
      notes: draft.notes,
      itemType: draft.itemType,
    };
    startTransition(async () => {
      const res = isEdit && initial?.id
        ? await updateAsset(initial.id, payload)
        : await createAsset(payload);
      if (!res.ok) {
        setError(res.error ?? "Could not save asset.");
        return;
      }
      onSaved();
    });
  }

  function handleArchive() {
    if (!initial?.id) return;
    const id = initial.id;
    setError(null);
    startTransition(async () => {
      const res = await archiveAsset(id);
      if (!res.ok) {
        setError(res.error ?? "Could not archive asset.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit Asset" : "Add Asset"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "Update asset registry and tracking parameters."
              : "A new asset code is generated automatically."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isEdit && draft.assetCode ? (
            <FieldGroup label="Asset Code">
              <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm font-mono text-foreground">
                {draft.assetCode}
              </p>
            </FieldGroup>
          ) : null}

          <FieldGroup label="Asset Name" htmlFor="asset-name">
            <Input
              id="asset-name"
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Lutron Central Hub X1"
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>

          <div className="mt-6">
            <FieldGroup label="Item Type" htmlFor="item-type">
              <NativeSelect
                id="item-type"
                value={draft.itemType}
                onChange={(v) => update("itemType", v as ItemType)}
              >
                {ITEM_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-[11px] text-muted-foreground">
                Assets are high-value tracked property; inventory is everything
                else.
              </p>
            </FieldGroup>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <FieldGroup label="Category" htmlFor="cat">
              <NativeSelect
                id="cat"
                value={draft.category}
                onChange={(v) => update("category", v as EquipmentCategory)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
            <FieldGroup label="Status" htmlFor="status">
              <NativeSelect
                id="status"
                value={draft.status}
                onChange={(v) =>
                  update("status", v as AssetDraft["status"])
                }
                disabled={isAssigned}
              >
                {(isAssigned
                  ? STATUS_OPTIONS.filter((s) => s.value === "in_use")
                  : STATUS_OPTIONS.filter((s) => s.value !== "in_use")
                ).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
              {isAssigned ? (
                <p className="text-[11px] text-muted-foreground">
                  Locked while an assignee is set.
                </p>
              ) : null}
            </FieldGroup>
          </div>

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
            <FieldGroup label="Location" htmlFor="loc">
              <Input
                id="loc"
                value={draft.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Suite 401"
                className="h-11 rounded-lg bg-muted/60 text-sm"
              />
            </FieldGroup>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <FieldGroup label="Assigned Staff" htmlFor="staff">
              <NativeSelect
                id="staff"
                value={draft.assignedToId}
                onChange={changeAssignee}
              >
                <option value="">Unassigned</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
            <FieldGroup label="Value (€)" htmlFor="value">
              <Input
                id="value"
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(draft.value) ? draft.value : 0}
                onChange={(e) =>
                  update("value", Number.parseFloat(e.target.value) || 0)
                }
                className="h-11 rounded-lg bg-muted/60 text-sm"
              />
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

          {isEdit && draft.assetCode ? (
            <ActivityTimeline
              resourceType="equipment"
              resourceId={draft.assetCode}
            />
          ) : null}

          {error ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 p-6">
          {isEdit ? (
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-60"
              onClick={handleArchive}
              disabled={pending}
            >
              Archive Asset
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-lg text-sm font-medium"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={pending}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
            ) : null}
            {isEdit ? "Save Changes" : "Create Asset"}
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
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-muted/60 pl-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
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
    </div>
  );
}
