"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AlertCircle, MapPin, Radio, ShieldCheck } from "lucide-react";
import type { LiveBeacon } from "@/lib/positioning/live-beacons";
import { toViewBox } from "@/lib/positioning/coords";
import type { TrackedAsset } from "@/lib/inventory/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Geofence guard for beacon-tagged assets on the inventory floorplan.
 *
 * Per-asset state machine:
 *
 *   secure ──beacon leaves safe zone──▶ warning ──4s still outside──▶ alarm
 *     ▲                                   │                            │
 *     └────────beacon returns─────────────┴──────beacon returns────────┤
 *     └──────────────── operator acknowledges (still outside) ◀────────┘
 *                                  = acknowledged
 *
 * `warning` shows the small popup with the escalation timer line;
 * `alarm` raises the full red modal and emits onAlarm exactly once.
 */

export type GuardPhase = "secure" | "warning" | "alarm" | "acknowledged";

export type GuardState = {
  asset: TrackedAsset;
  /** Current beacon position, viewBox units. Null when no beacon row yet. */
  pos: { x: number; y: number } | null;
  /** Distance from home, viewBox units. Null when pos is null. */
  distance: number | null;
  stale: boolean;
  phase: GuardPhase;
  /** Epoch ms when the beacon left the safe zone (warning/alarm phases). */
  breachAt: number | null;
};

type PhaseEntry = { phase: GuardPhase; breachAt: number | null };

/** Pure snapshot of one asset against the latest beacon data. */
function readAsset(asset: TrackedAsset, beacons: LiveBeacon[]) {
  const beacon = beacons.find((b) => b.beacon_id === asset.beaconId) ?? null;
  const pos = beacon ? toViewBox(beacon.x, beacon.y) : null;
  const distance = pos
    ? Math.hypot(pos.x - asset.homeX, pos.y - asset.homeY)
    : null;
  return { pos, distance, stale: beacon?.stale ?? false };
}

const RECONCILE_MS = 150;

export function useAssetGuard({
  assets,
  beacons,
  breachDelayMs = 4_000,
  onAlarm,
  onResolve,
}: {
  assets: TrackedAsset[];
  beacons: LiveBeacon[];
  /** How long the beacon must stay outside before the alarm escalates. */
  breachDelayMs?: number;
  onAlarm?: (state: GuardState) => void;
  onResolve?: (state: GuardState) => void;
}) {
  const [phases, setPhases] = useState<Map<string, PhaseEntry>>(new Map());

  // Ref-mirrors (same pattern as rowsRef in live-beacons.ts) so the
  // reconcile interval always reads fresh data without re-arming itself.
  const phasesRef = useRef(phases);
  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);
  const inputsRef = useRef({ assets, beacons });
  useEffect(() => {
    inputsRef.current = { assets, beacons };
  }, [assets, beacons]);
  const cbRef = useRef({ onAlarm, onResolve });
  useEffect(() => {
    cbRef.current = { onAlarm, onResolve };
  });
  // One callback per breach, even across re-renders / StrictMode remounts.
  const firedAlarms = useRef<Set<string>>(new Set());
  const firedResolves = useRef<Set<string>>(new Set());

  // Reconcile loop: walks every tracked asset through the state machine.
  // Timer-driven (not data-driven) so the warning → alarm escalation fires
  // even when no new beacon row lands during the grace period.
  useEffect(() => {
    const id = window.setInterval(() => {
      const { assets: trackedAssets, beacons: liveBeacons } =
        inputsRef.current;
      const now = Date.now();
      let changed = false;
      const next = new Map(phasesRef.current);

      for (const asset of trackedAssets) {
        const { pos, distance, stale } = readAsset(asset, liveBeacons);
        const outside =
          distance !== null && distance > asset.geofenceRadius;
        const entry = next.get(asset.id) ?? {
          phase: "secure" as GuardPhase,
          breachAt: null,
        };
        let updated: PhaseEntry | null = null;

        if (entry.phase === "secure" && outside) {
          updated = { phase: "warning", breachAt: now };
        } else if (entry.phase === "warning") {
          if (!outside) {
            updated = { phase: "secure", breachAt: null };
          } else if (
            entry.breachAt !== null &&
            now - entry.breachAt >= breachDelayMs
          ) {
            updated = { phase: "alarm", breachAt: entry.breachAt };
            const key = `${asset.id}:${entry.breachAt}`;
            if (!firedAlarms.current.has(key)) {
              firedAlarms.current.add(key);
              cbRef.current.onAlarm?.({
                asset,
                pos,
                distance,
                stale,
                phase: "alarm",
                breachAt: entry.breachAt,
              });
            }
          }
        } else if (
          (entry.phase === "alarm" || entry.phase === "acknowledged") &&
          !outside
        ) {
          updated = { phase: "secure", breachAt: null };
          const key = `${asset.id}:${entry.breachAt}`;
          if (!firedResolves.current.has(key)) {
            firedResolves.current.add(key);
            cbRef.current.onResolve?.({
              asset,
              pos,
              distance,
              stale,
              phase: "secure",
              breachAt: null,
            });
          }
        }

        if (updated) {
          next.set(asset.id, updated);
          changed = true;
        }
      }

      if (changed) setPhases(next);
    }, RECONCILE_MS);
    return () => window.clearInterval(id);
  }, [breachDelayMs]);

  const states: GuardState[] = useMemo(
    () =>
      assets.map((asset) => {
        const { pos, distance, stale } = readAsset(asset, beacons);
        const entry = phases.get(asset.id) ?? {
          phase: "secure" as GuardPhase,
          breachAt: null,
        };
        return {
          asset,
          pos,
          distance,
          stale,
          phase: entry.phase,
          breachAt: entry.breachAt,
        };
      }),
    [assets, beacons, phases],
  );

  function acknowledge(assetId: string) {
    setPhases((prev) => {
      const next = new Map(prev);
      const entry = next.get(assetId);
      if (entry?.phase === "alarm") {
        next.set(assetId, { phase: "acknowledged", breachAt: entry.breachAt });
      }
      return next;
    });
  }

  return { states, acknowledge };
}

// --- floorplan SVG layer ------------------------------------------------------

const PHASE_COLOR: Record<GuardPhase, { ring: string; fill: string }> = {
  secure: { ring: "#059669", fill: "#10B981" },
  warning: { ring: "#D97706", fill: "#F59E0B" },
  alarm: { ring: "#DC2626", fill: "#EF4444" },
  acknowledged: { ring: "#DC2626", fill: "#EF4444" },
};

/**
 * Renders, per tracked asset: the safe-zone ring around its home position,
 * a small home marker, the live asset marker, and — while breached — a
 * dashed tether from home to the runaway beacon. Mount inside an
 * `<svg viewBox="0 0 1200 480">` stacked over the FabLab map.
 */
export function AssetGuardOverlay({ states }: { states: GuardState[] }) {
  return (
    <>
      {states.map((s) => (
        <GuardedAsset key={s.asset.id} state={s} />
      ))}
    </>
  );
}

function GuardedAsset({ state }: { state: GuardState }) {
  const { asset, pos, phase, stale } = state;
  // Once acknowledged, the operator has recovered the asset and we write its
  // beacon home — so render it home (green) immediately instead of waiting for
  // the live position to round-trip, and drop the breach styling.
  const recovered = phase === "acknowledged";
  const color = PHASE_COLOR[recovered ? "secure" : phase];
  const breached = phase !== "secure" && !recovered;
  const home = { x: asset.homeX, y: asset.homeY };
  // No live row yet (or just recovered) — park the marker at home.
  const at = recovered ? home : pos ?? home;

  return (
    <g>
      {/* Safe zone around home */}
      <circle
        cx={asset.homeX}
        cy={asset.homeY}
        r={asset.geofenceRadius}
        fill={color.fill}
        opacity={breached ? 0.12 : 0.08}
      />
      <circle
        cx={asset.homeX}
        cy={asset.homeY}
        r={asset.geofenceRadius}
        fill="none"
        stroke={color.ring}
        strokeWidth="2"
        strokeDasharray="6 4"
      >
        {breached ? (
          <animate
            attributeName="opacity"
            values="1;0.35;1"
            dur="0.9s"
            repeatCount="indefinite"
          />
        ) : null}
      </circle>

      {/* Home marker — where the asset belongs */}
      <g stroke={color.ring} strokeWidth="2">
        <line
          x1={asset.homeX - 6}
          y1={asset.homeY}
          x2={asset.homeX + 6}
          y2={asset.homeY}
        />
        <line
          x1={asset.homeX}
          y1={asset.homeY - 6}
          x2={asset.homeX}
          y2={asset.homeY + 6}
        />
      </g>

      {/* Tether from home to the runaway beacon */}
      {breached && pos ? (
        <line
          x1={asset.homeX}
          y1={asset.homeY}
          x2={pos.x}
          y2={pos.y}
          stroke="#DC2626"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      ) : null}

      {/* Asset marker — gold picture frame */}
      <g opacity={stale ? 0.55 : 1}>
        {breached ? (
          <circle cx={at.x} cy={at.y} r="20" fill="#EF4444" opacity="0.25">
            <animate
              attributeName="r"
              values="14;28;14"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.05;0.4"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        ) : null}
        <rect
          x={at.x - 11}
          y={at.y - 11}
          width="22"
          height="22"
          rx="3"
          fill="#B45309"
          stroke={breached ? "#DC2626" : "#FFFFFF"}
          strokeWidth="2.5"
        />
        <rect
          x={at.x - 6}
          y={at.y - 6}
          width="12"
          height="12"
          rx="1"
          fill="#FDE68A"
        />
        {/* Name chip */}
        <g transform={`translate(${at.x}, ${at.y + 26})`}>
          <rect
            x={-44}
            y={-9}
            width={88}
            height={16}
            rx={8}
            fill={breached ? "#7F1D1D" : "#1E293B"}
            opacity="0.9"
          />
          <text
            x={0}
            y={3}
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="ui-sans-serif, system-ui"
          >
            {asset.assetCode}
            {stale ? " · stale" : ""}
          </text>
        </g>
      </g>
    </g>
  );
}

// --- breach popup (warning phase) ---------------------------------------------

/**
 * Small card pinned over the floorplan while the escalation timer runs.
 * The amber→red line fills left to right over `breachDelayMs`; if the beacon
 * is still outside when it hits the end, the guard hook raises the alarm.
 */
export function BreachPopup({
  state,
  breachDelayMs,
}: {
  state: GuardState;
  breachDelayMs: number;
}) {
  const { asset } = state;
  return (
    <div className="w-[290px] overflow-hidden rounded-xl border border-amber-300 bg-white shadow-lg">
      <style>{`@keyframes ag-progress { from { width: 0% } to { width: 100% } }`}</style>
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100">
          <AlertCircle className="size-4 text-amber-700" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Safe-zone breach
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {asset.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {asset.assetCode} · beacon #{asset.beaconId} left its safe zone
          </p>
          <p className="mt-1 text-[11px] font-medium text-amber-700">
            Escalating to security alert…
          </p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-amber-100">
        <div
          // Remount per breach so the animation restarts from zero.
          key={state.breachAt ?? 0}
          className="h-full bg-gradient-to-r from-amber-400 to-red-600"
          style={{ animation: `ag-progress ${breachDelayMs}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

// --- alarm modal (alarm phase) --------------------------------------------------

/** Served from public/alarm.mp3 (the proxy matcher exempts audio files). */
const ALARM_SOUND_URL = "/alarm.mp3";

// One element for the whole page: once a user gesture has "blessed" it,
// every later play() — including one triggered by data, not a click — is
// allowed by the browser's autoplay policy.
let alarmAudio: HTMLAudioElement | null = null;

function getAlarmAudio(): HTMLAudioElement {
  if (!alarmAudio) {
    alarmAudio = new Audio(ALARM_SOUND_URL);
    alarmAudio.loop = true;
    alarmAudio.volume = 0.7;
    alarmAudio.preload = "auto";
  }
  return alarmAudio;
}

/**
 * Call once from the floorplan card. On the user's first click/keypress it
 * silently plays-and-pauses the alarm element, unlocking it so the siren can
 * start the moment the alarm fires — no gesture needed at that point.
 */
export function useAlarmAudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      const audio = getAlarmAudio();
      if (!audio.paused) return; // alarm already ringing — leave it alone
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}

/**
 * Loops the alarm sound for as long as the calling component is mounted —
 * i.e. it starts when the red alert appears and stops on acknowledge or
 * recovery. If the browser still blocks playback (no interaction since page
 * load), the next click/keypress starts it; the block is logged so it's
 * visible in the console instead of failing silently.
 */
function useAlarmSiren() {
  useEffect(() => {
    const audio = getAlarmAudio();
    audio.currentTime = 0;

    // play() on an already-playing element is a no-op, so retrying on every
    // interaction is safe — it only matters when autoplay was blocked.
    const tryPlay = () => {
      audio.play().catch((err: unknown) => {
        console.warn(
          "[asset-guard] alarm sound blocked by autoplay policy — click anywhere to start it",
          err,
        );
      });
    };
    tryPlay();
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("keydown", tryPlay);

    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);
}

export function AssetAlarmModal({
  state,
  onAcknowledge,
}: {
  state: GuardState;
  onAcknowledge: () => void;
}) {
  const { asset, distance, breachAt } = state;
  // Siren runs for the lifetime of the modal: from alert raise to acknowledge.
  useAlarmSiren();
  return (
    <div
      role="alertdialog"
      aria-label="Asset security alert"
      className="fixed inset-0 z-[100] grid place-items-center bg-red-950/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg animate-pulse rounded-3xl bg-red-600 p-1.5 [animation-duration:1.2s]">
        <div className="overflow-hidden rounded-[20px] bg-white">
          <header className="flex items-center gap-3 bg-red-600 px-6 py-4 text-white">
            <AlertCircle className="size-8 shrink-0" strokeWidth={2.4} />
            <div>
              <p className="text-lg font-bold uppercase tracking-wider">
                Security Alert
              </p>
              <p className="text-sm font-medium text-red-100">
                Tracked asset is being moved
              </p>
            </div>
          </header>

          <div className="px-6 py-5">
            <p className="text-xl font-semibold tracking-tight text-foreground">
              {asset.name}
            </p>
            <p className="mt-1 text-sm text-red-700">
              This asset left its designated safe zone and did not return
              within the grace period. The event has been logged.
              Acknowledging marks the asset as recovered and returns it to
              its home position.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <AlarmFact label="Asset code" value={asset.assetCode} />
              <AlarmFact
                label="Beacon"
                value={`#${asset.beaconId}`}
                icon={<Radio className="size-3.5 text-red-600" strokeWidth={2.2} />}
              />
              <AlarmFact
                label="Home location"
                value={asset.location || "—"}
                icon={<MapPin className="size-3.5 text-red-600" strokeWidth={2.2} />}
              />
              <AlarmFact
                label="Declared value"
                value={`€${asset.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}`}
              />
              <AlarmFact
                label="Breach began"
                value={
                  breachAt ? new Date(breachAt).toLocaleTimeString() : "—"
                }
              />
              <AlarmFact
                label="Off-zone distance"
                value={
                  distance !== null
                    ? `${Math.round(distance)} map units`
                    : "signal lost"
                }
              />
            </dl>
          </div>

          <footer className="flex justify-end gap-3 border-t border-red-100 bg-red-50 px-6 py-4">
            <Button
              onClick={onAcknowledge}
              className="h-11 rounded-lg bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700"
            >
              Acknowledge &amp; recover asset
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function AlarmFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
        {icon}
        {value}
      </dd>
    </div>
  );
}

// --- event feed ------------------------------------------------------------------

export type GuardFeedEvent = {
  id: string;
  occurredAt: string; // ISO
  message: string;
  kind: "alarm" | "resolve";
};

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Locale date
 * formatting differs between the server and the browser, so feed timestamps
 * only format once we're client-side — otherwise React flags a hydration
 * text mismatch on the server-loaded initial alerts.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function GuardEventFeed({ events }: { events: GuardFeedEvent[] }) {
  const hydrated = useHydrated();
  if (events.length === 0) {
    return (
      <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-600" strokeWidth={2} />
        No movement alerts. All tracked assets are inside their safe zones.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
          <span
            className={cn(
              "mt-1.5 inline-block size-2 shrink-0 rounded-full",
              e.kind === "alarm" ? "bg-red-500" : "bg-emerald-500",
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "font-medium",
                e.kind === "alarm" ? "text-red-700" : "text-foreground",
              )}
            >
              {e.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {hydrated ? new Date(e.occurredAt).toLocaleString() : " "}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
