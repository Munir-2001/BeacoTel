"use client";

import { useState } from "react";
import { ChevronDown, History, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FabLabMap } from "@/components/floorplan/fablab-map";
import {
  HeartbeatIndicator,
  LiveStatusPill,
} from "@/components/live-tracking/live-overlay";
import { cn } from "@/lib/utils";
import { AssetGuardOverlay, GuardEventFeed } from "./asset-guard";
import { useGlobalAssetGuard } from "./asset-guard-provider";

/**
 * Inventory floorplan with live geofence guarding. Tracked assets (item_type
 * 'asset' + beacon binding) render on the same FabLab plan / coordinate
 * system as the Live Tracking page. The guard itself — breach popup, red
 * alarm, siren, audit logging — is app-wide and lives in AssetGuardProvider
 * (dashboard layout); this card is a window onto that one shared instance.
 */
export function FloorplanCard() {
  const guard = useGlobalAssetGuard();
  const trackedCount = guard.states.length;
  const [alertsOpen, setAlertsOpen] = useState(false);

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
        {trackedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <LiveStatusPill
              status={guard.status}
              liveCount={guard.beacons.filter((b) => !b.stale).length}
              staleCount={guard.beacons.filter((b) => b.stale).length}
            />
            <HeartbeatIndicator lastEventAt={guard.lastEventAt} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-800">
              {trackedCount} tracked asset{trackedCount === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </header>

      <div className="relative mt-5 aspect-[5/2] overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.97_0.012_250)]">
        <FabLabMap idPrefix="inv" />
        <svg
          viewBox="0 0 1200 480"
          className="pointer-events-none absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <AssetGuardOverlay states={guard.states} />
        </svg>

        {trackedCount === 0 ? (
          <div className="absolute inset-0 grid place-items-center">
            <p className="rounded-full bg-white/90 px-4 py-2 text-sm text-muted-foreground shadow-sm">
              No tracked assets yet — mark an item as an Asset and bind a
              beacon to see it here.
            </p>
          </div>
        ) : null}
      </div>

      {/* Movement alert feed — audit-backed history + this session's events.
          Collapsed by default; the badge keeps the count visible. */}
      <section className="mt-5 rounded-xl border border-border/60 bg-muted/30 px-4">
        <button
          type="button"
          onClick={() => setAlertsOpen((v) => !v)}
          aria-expanded={alertsOpen}
          className="flex w-full items-center justify-between py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <History className="size-3.5" strokeWidth={2} />
            Movement alerts
            {guard.events.length > 0 ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-red-700">
                {guard.events.length}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              alertsOpen && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
        {alertsOpen ? (
          <div className="max-h-64 overflow-y-auto pb-2">
            <GuardEventFeed events={guard.events} />
          </div>
        ) : null}
      </section>
    </Card>
  );
}
