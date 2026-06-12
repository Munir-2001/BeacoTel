"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LiveBeacon = {
  beacon_id: number;
  x: number;
  y: number;
  floor: number | null;
  confidence: number | null;
  last_seen: string; // ISO timestamp from Postgres
  /**
   * True when `last_seen` is older than the freshness window. We still render
   * stale beacons — the last-known position is more useful than nothing; the
   * UI just dims them and labels them so the operator knows the dot is old.
   */
  stale: boolean;
};

export type LiveConnectionStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "error";

/**
 * The browser Supabase client is a singleton and caches realtime channels by
 * topic, so every useLiveBeacons instance needs its own topic. With a shared
 * one, a second subscriber (e.g. the app-wide asset guard in the layout plus
 * the Live Tracking page) would get the already-subscribed channel back and
 * crash with "cannot add postgres_changes callbacks after subscribe()".
 */
let channelSeq = 0;

type Options = {
  /** When false, no fetch and no realtime subscription — zero API calls. */
  enabled: boolean;
  /**
   * Beacons whose `last_seen` is older than this are flagged `stale = true`.
   * They still come back from the hook — they just render dimmed. Default 10s.
   */
  staleAfterMs?: number;
  /**
   * Polling fallback interval in ms. Even when Realtime is configured, we
   * re-SELECT every `pollMs` so the dot keeps moving if Realtime is mis-wired
   * (table not in publication, replica identity wrong, RLS off, …). Default
   * 2000. Set to 0 to disable polling entirely (rely solely on Realtime).
   */
  pollMs?: number;
};

/**
 * Subscribes to `beacon_live_positions` and returns the currently-live beacons.
 *
 * Two parallel update paths:
 *  1. Supabase Realtime subscription — instant push on INSERT/UPDATE/DELETE
 *     (provided the table is in `supabase_realtime` and has REPLICA IDENTITY
 *     FULL — see migration 0011).
 *  2. Polling fallback — every `pollMs` we re-SELECT the table and diff. This
 *     guarantees the dot keeps moving even if path #1 is broken, at the cost
 *     of one cheap SELECT per interval.
 *
 * The heartbeat indicator (`lastEventAt`) ticks whenever EITHER path observes
 * a change, so the UI reflects activity regardless of which path delivered it.
 */
export function useLiveBeacons({
  enabled,
  staleAfterMs = 10_000,
  pollMs = 2_000,
}: Options) {
  const [rows, setRows] = useState<Map<number, LiveBeacon>>(new Map());
  const [status, setStatus] = useState<LiveConnectionStatus>(
    enabled ? "connecting" : "disabled",
  );
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  // Ticks every second so the stale flag re-evaluates without waiting on data.
  const [tick, setTick] = useState(0);

  // Ref-mirror of `rows` so the polling closure can diff without re-creating
  // itself every time rows change.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disabled");
      setRows(new Map());
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    setStatus("connecting");

    /**
     * Re-fetch the whole table. Returns true if the data has changed since
     * the last snapshot — the heartbeat blips on that.
     */
    async function refetch(source: "initial" | "poll"): Promise<boolean> {
      const { data, error } = await supabase
        .from("beacon_live_positions")
        .select("beacon_id, x, y, floor, confidence, last_seen");
      if (cancelled) return false;
      if (error) {
        if (source === "initial") {
          console.error("[live-beacons] initial fetch failed", error);
          setStatus("error");
        } else {
          console.warn("[live-beacons] poll fetch failed", error.message);
        }
        return false;
      }

      const next = new Map<number, LiveBeacon>();
      for (const row of data ?? []) {
        next.set(row.beacon_id, { ...(row as LiveBeacon), stale: false });
      }

      // Diff against current state to decide whether to blip the heartbeat.
      const prev = rowsRef.current;
      let changed = prev.size !== next.size;
      if (!changed) {
        for (const [id, row] of next) {
          const old = prev.get(id);
          if (
            !old ||
            old.x !== row.x ||
            old.y !== row.y ||
            old.last_seen !== row.last_seen
          ) {
            changed = true;
            break;
          }
        }
      }

      if (source === "initial") {
        console.info(
          "[live-beacons] initial fetch returned",
          data?.length ?? 0,
          "row(s)",
          data,
        );
      }

      setRows(next);
      return changed;
    }

    // Initial hydrate.
    refetch("initial");

    // Realtime push — fast path. When wired correctly the polling SELECT
    // below sees no change and the heartbeat blips here instead.
    const channel = supabase
      .channel(`beacon-live-positions-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "beacon_live_positions" },
        (payload) => {
          setLastEventAt(Date.now());
          setRows((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as Partial<LiveBeacon>;
              if (old.beacon_id != null) next.delete(old.beacon_id);
            } else {
              const row = payload.new as LiveBeacon;
              next.set(row.beacon_id, { ...row, stale: false });
            }
            return next;
          });
        },
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
      });

    // Polling fallback — slow path. Only blips the heartbeat when the diff
    // actually changed, so a healthy Realtime channel won't double-blip.
    const pollInterval =
      pollMs > 0
        ? window.setInterval(async () => {
            const changed = await refetch("poll");
            if (changed) setLastEventAt(Date.now());
          }, pollMs)
        : null;

    const tickInterval = window.setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      cancelled = true;
      if (pollInterval !== null) window.clearInterval(pollInterval);
      window.clearInterval(tickInterval);
      supabase.removeChannel(channel);
    };
  }, [enabled, pollMs]);

  const beacons = useMemo(() => {
    if (!enabled) return [];
    const cutoff = Date.now() - staleAfterMs;
    const out: LiveBeacon[] = [];
    for (const b of rows.values()) {
      const isStale = new Date(b.last_seen).getTime() < cutoff;
      out.push({ ...b, stale: isStale });
    }
    return out;
    // tick included so the stale flag re-evaluates each second.
  }, [enabled, rows, staleAfterMs, tick]);

  return { beacons, status, lastEventAt };
}
