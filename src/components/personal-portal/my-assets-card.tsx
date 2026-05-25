"use client";

import { useState } from "react";
import { Package2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Asset } from "@/lib/inventory/types";
import { MyAssetRow } from "./my-asset-row";

/**
 * Shows equipment currently assigned to the signed-in user. Each row exposes
 * a "Release" action so staff can hand equipment back without touching the
 * Inventory page (they no longer have permission to open it anyway, post
 * migration 0007).
 */
export function MyAssetsCard({ assets: initial }: { assets: Asset[] }) {
  // Track released rows locally so the card updates instantly even though the
  // server has already revalidated /personal-portal — the next render of the
  // server component will simply confirm what we already showed.
  const [released, setReleased] = useState<Set<string>>(new Set());
  const visible = initial.filter((a) => !released.has(a.id));

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-foreground">
          <Package2 className="size-5 text-foreground/70" strokeWidth={1.75} />
          My Assets
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
          {visible.length} assigned
        </span>
      </header>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-lg bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No equipment is currently assigned to you.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((a) => (
            <MyAssetRow
              key={a.id}
              asset={a}
              onReleased={(id) =>
                setReleased((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                })
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
