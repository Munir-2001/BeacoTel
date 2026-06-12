"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  useLiveBeacons,
  type LiveBeacon,
  type LiveConnectionStatus,
} from "@/lib/positioning/live-beacons";
import type { TrackedAsset } from "@/lib/inventory/types";
import {
  logAssetMovedAlert,
  returnAssetHome,
  type AssetAlertEvent,
} from "@/lib/inventory/alert-actions";
import {
  AssetAlarmModal,
  BreachPopup,
  useAlarmAudioUnlock,
  useAssetGuard,
  type GuardFeedEvent,
  type GuardState,
} from "./asset-guard";

/** Grace period between leaving the safe zone and the full red alarm. */
export const BREACH_DELAY_MS = 4_000;

type AssetGuardContextValue = {
  /** One entry per tracked asset, with live position + guard phase. */
  states: GuardState[];
  /** Movement-alert feed: audit-backed history + this session's events. */
  events: GuardFeedEvent[];
  /** Live subscription health, for status pills. */
  status: LiveConnectionStatus;
  lastEventAt: number | null;
  beacons: LiveBeacon[];
  /** Dismisses the red alarm and sends the asset back to its home spot. */
  acknowledge: (assetId: string) => void;
};

const AssetGuardContext = createContext<AssetGuardContextValue | null>(null);

export function useGlobalAssetGuard(): AssetGuardContextValue {
  const value = useContext(AssetGuardContext);
  if (!value) {
    throw new Error(
      "useGlobalAssetGuard must be used inside <AssetGuardProvider> (dashboard layout)",
    );
  }
  return value;
}

/**
 * App-wide asset guarding. Mounted once in the dashboard layout, so the
 * geofence watch — and the breach popup, red alarm, siren, and audit logging
 * — work on every page, not just the inventory floorplan. The floorplan
 * consumes the same instance via useGlobalAssetGuard(), so there is exactly
 * one state machine and one alarm regardless of the current route.
 */
export function AssetGuardProvider({
  trackedAssets,
  initialAlerts,
  children,
}: {
  trackedAssets: TrackedAsset[];
  initialAlerts: AssetAlertEvent[];
  children: React.ReactNode;
}) {
  const live = useLiveBeacons({ enabled: trackedAssets.length > 0 });
  // Unlock the alarm sound on the user's first interaction anywhere in the
  // app so the siren can autoplay when the alert fires.
  useAlarmAudioUnlock();

  const [events, setEvents] = useState<GuardFeedEvent[]>(() =>
    initialAlerts.map((a) => ({
      id: a.id,
      occurredAt: a.occurredAt,
      message: `${a.assetName} (${a.assetCode}) moved outside its safe zone`,
      kind: "alarm" as const,
    })),
  );

  const pushEvent = useCallback((e: GuardFeedEvent) => {
    setEvents((prev) => [e, ...prev].slice(0, 20));
  }, []);

  const handleAlarm = useCallback(
    (s: GuardState) => {
      pushEvent({
        id: `local-${s.asset.id}-${s.breachAt}`,
        occurredAt: new Date().toISOString(),
        message: `${s.asset.name} (${s.asset.assetCode}) moved outside its safe zone`,
        kind: "alarm",
      });
      // Fire-and-forget: the audit write must never block the alarm UI.
      logAssetMovedAlert({
        assetCode: s.asset.assetCode,
        assetName: s.asset.name,
        beaconId: s.asset.beaconId,
        x: s.pos?.x ?? s.asset.homeX,
        y: s.pos?.y ?? s.asset.homeY,
        distance: s.distance ?? 0,
        geofenceRadius: s.asset.geofenceRadius,
      }).catch((err) => console.error("[asset-guard] audit log failed", err));
    },
    [pushEvent],
  );

  const handleResolve = useCallback(
    (s: GuardState) => {
      pushEvent({
        id: `local-resolve-${s.asset.id}-${Date.now()}`,
        occurredAt: new Date().toISOString(),
        message: `${s.asset.name} (${s.asset.assetCode}) is back inside its safe zone`,
        kind: "resolve",
      });
    },
    [pushEvent],
  );

  const guard = useAssetGuard({
    assets: trackedAssets,
    beacons: live.beacons,
    breachDelayMs: BREACH_DELAY_MS,
    onAlarm: handleAlarm,
    onResolve: handleResolve,
  });

  const acknowledge = useCallback(
    (assetId: string) => {
      guard.acknowledge(assetId);
      const asset = trackedAssets.find((a) => a.id === assetId);
      if (!asset) return;
      // Recover the asset: park its beacon back at home. The next live
      // update then resolves the guard to `secure` and the feed logs the
      // return. Fire-and-forget — closing the modal can't block.
      returnAssetHome(asset.assetCode).catch((err) =>
        console.error("[asset-guard] return-home failed", err),
      );
    },
    [guard, trackedAssets],
  );

  const value = useMemo<AssetGuardContextValue>(
    () => ({
      states: guard.states,
      events,
      status: live.status,
      lastEventAt: live.lastEventAt,
      beacons: live.beacons,
      acknowledge,
    }),
    [guard.states, events, live.status, live.lastEventAt, live.beacons, acknowledge],
  );

  const warnings = guard.states.filter((s) => s.phase === "warning");
  const alarmed = guard.states.find((s) => s.phase === "alarm");

  return (
    <AssetGuardContext.Provider value={value}>
      {children}

      {/* Escalation popups — fixed below the topbar so they show on any page */}
      {warnings.length > 0 ? (
        <div className="fixed right-6 top-20 z-[90] flex flex-col gap-2">
          {warnings.map((s) => (
            <BreachPopup
              key={s.asset.id}
              state={s}
              breachDelayMs={BREACH_DELAY_MS}
            />
          ))}
        </div>
      ) : null}

      {alarmed ? (
        <AssetAlarmModal
          state={alarmed}
          onAcknowledge={() => acknowledge(alarmed.asset.id)}
        />
      ) : null}
    </AssetGuardContext.Provider>
  );
}
