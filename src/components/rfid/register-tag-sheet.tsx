"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, Tag } from "lucide-react";
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
import { registerTag } from "@/lib/rfid/actions";
import { RFID_CATEGORY_OPTIONS } from "@/lib/rfid/types";
import type { RfidReader } from "@/lib/rfid/types";

type Draft = {
  epc: string;
  productName: string;
  category: string;
  readerId: string;
};

export function RegisterTagSheet({
  open,
  onOpenChange,
  readers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  readers: RfidReader[];
  onSaved: () => void;
}) {
  const defaultReader = readers[0]?.id ?? "";
  const [draft, setDraft] = useState<Draft>({
    epc: "",
    productName: "",
    category: "beverage",
    readerId: defaultReader,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft({
        epc: "",
        productName: "",
        category: "beverage",
        readerId: defaultReader,
      });
      setError(null);
    }
  }, [open, defaultReader]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await registerTag({
        epc: draft.epc,
        productName: draft.productName,
        category: draft.category,
        readerId: draft.readerId || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not register tag.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px]">
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            Register Tag
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Attach an RFID tag to a soft asset so the fridge can track it.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Field label="Tag ID (EPC)" htmlFor="epc">
            <div className="relative">
              <Tag
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary"
                strokeWidth={2}
              />
              <Input
                id="epc"
                value={draft.epc}
                onChange={(e) => update("epc", e.target.value)}
                placeholder="EPC-XXX-0001"
                className="h-11 rounded-lg bg-muted/60 pl-9 font-mono text-sm"
              />
            </div>
          </Field>

          <Field label="Product Name" htmlFor="product">
            <Input
              id="product"
              value={draft.productName}
              onChange={(e) => update("productName", e.target.value)}
              placeholder="e.g. Pepsi 330ml"
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </Field>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="category">
              <NativeSelect
                id="category"
                value={draft.category}
                onChange={(v) => update("category", v)}
              >
                {RFID_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reader / Fridge" htmlFor="reader">
              <NativeSelect
                id="reader"
                value={draft.readerId}
                onChange={(v) => update("readerId", v)}
              >
                {readers.length === 0 ? (
                  <option value="">No readers</option>
                ) : null}
                {readers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {error ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 p-6">
          <Button
            variant="ghost"
            className="h-11 flex-1 rounded-lg text-sm font-medium"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={pending}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
            ) : null}
            Register Tag
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function Field({
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
