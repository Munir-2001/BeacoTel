"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  Trash2,
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
import { recordWithdrawal, unregisterTag } from "@/lib/rfid/actions";
import { useTagChanges } from "@/lib/rfid/live";
import { rfidCategoryLabel, type RfidReader, type RfidTag } from "@/lib/rfid/types";
import { cn } from "@/lib/utils";
import { RegisterTagSheet } from "./register-tag-sheet";

export function TagRegistry({
  tags,
  readers,
  canEdit,
}: {
  tags: RfidTag[];
  readers: RfidReader[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Cross-client liveness: any rfid_tags change re-pulls server data so the
  // present/withdrawn state stays in sync with the live feed.
  useTagChanges(() => router.refresh());

  // Deep-link from the sidebar CTA: /rfid-tracking?new=1 opens the sheet.
  useEffect(() => {
    if (searchParams.get("new") === "1" && canEdit) {
      setSheetOpen(true);
      router.replace(pathname);
    }
  }, [searchParams, canEdit, pathname, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) =>
      [t.productName, t.epc, t.readerLabel ?? "", rfidCategoryLabel(t.category)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [tags, query]);

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            Tag Registry
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            RFID tags and the soft asset each one is attached to.
          </p>
        </div>
        {canEdit ? (
          <Button
            onClick={() => setSheetOpen(true)}
            className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Register Tag
          </Button>
        ) : null}
      </header>

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, tag ID, fridge…"
          className="h-9 rounded-lg border-transparent bg-muted/50 pl-9 text-sm ring-1 ring-border"
        />
      </div>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <Th>Tag ID (EPC)</Th>
              <Th>Soft Asset</Th>
              <Th>Category</Th>
              <Th>Fridge</Th>
              <Th>State</Th>
              {canEdit ? <Th className="text-right">Actions</Th> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableCell
                  colSpan={canEdit ? 6 : 5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {query
                    ? "No tags match your search."
                    : "No tags registered yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  canEdit={canEdit}
                  onChanged={() => router.refresh()}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-4 text-sm text-muted-foreground">
        {filtered.length} tag{filtered.length === 1 ? "" : "s"}
        {query && filtered.length !== tags.length
          ? ` (filtered from ${tags.length})`
          : ""}
      </footer>

      <RegisterTagSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        readers={readers}
        onSaved={() => {
          setSheetOpen(false);
          router.refresh();
        }}
      />
    </Card>
  );
}

function TagRow({
  tag,
  canEdit,
  onChanged,
}: {
  tag: RfidTag;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Action failed.");
        return;
      }
      onChanged();
    });
  }

  return (
    <TableRow className="border-border/70 hover:bg-muted/40">
      <TableCell className="py-4 font-mono text-sm text-foreground">
        {tag.epc}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50">
            <PackageOpen className="size-4 text-sky-700" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {tag.productName}
            </p>
            {error ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={2} />
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-sm text-foreground">
        {rfidCategoryLabel(tag.category)}
      </TableCell>
      <TableCell className="py-4 text-sm text-foreground">
        {tag.readerLabel ?? "—"}
      </TableCell>
      <TableCell className="py-4">
        <StatePill present={tag.present} />
      </TableCell>
      {canEdit ? (
        <TableCell className="py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {tag.present ? (
              <Button
                onClick={() => run(() => recordWithdrawal(tag.id))}
                disabled={pending}
                className="h-8 gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <PackageOpen className="size-3.5" strokeWidth={2.2} />
                Withdraw
              </Button>
            ) : (
              // Returns are driven by the RFID simulator script, not the UI.
              <Button
                disabled
                title="Returns are detected automatically by the fridge antenna (simulator)."
                className="h-8 gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" strokeWidth={2.2} />
                Return
              </Button>
            )}
            <button
              aria-label={`Unregister ${tag.epc}`}
              onClick={() => run(() => unregisterTag(tag.id))}
              disabled={pending}
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" strokeWidth={2} />
            </button>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function StatePill({ present }: { present: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        present
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800",
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          present ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {present ? "In Fridge" : "Withdrawn"}
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
