"use client";

import { MapPin, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FabLabMap } from "@/components/floorplan/fablab-map";

export function FloorplanCard() {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
            <MapPin className="size-4 text-primary" strokeWidth={2} />
            Asset Tracking — Real-time Floorplan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Floor 01 — FabLab S35 · FABLAB · ELETTRONICA · PROTOTIPAZIONE
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <SlidersHorizontal className="size-4" strokeWidth={2} />
            Filter Assets
          </Button>
        </div>
      </header>

      <div className="relative mt-5 aspect-[5/2] overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.97_0.012_250)]">
        <FabLabMap idPrefix="inv" />
      </div>
    </Card>
  );
}
