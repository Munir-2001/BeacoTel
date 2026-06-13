"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MovementKind, WithdrawalEvent } from "@/lib/rfid/types";

/**
 * The browser Supabase client caches realtime channels by topic, so every
 * subscriber needs a unique topic — otherwise a second `.on()` on an already
 * `subscribe()`d channel throws (same lesson as live-beacons.ts).
 */
let channelSeq = 0;

type EventRow = {
  id: number;
  tag_id: string | null;
  epc: string;
  product_name: string;
  reader_label: string | null;
  kind: MovementKind;
  withdrawn_at: string;
};

function rowToEvent(r: EventRow): WithdrawalEvent {
  return {
    id: r.id,
    tagId: r.tag_id,
    epc: r.epc,
    productName: r.product_name,
    readerLabel: r.reader_label,
    kind: r.kind ?? "withdrawn",
    withdrawnAt: r.withdrawn_at,
  };
}

/**
 * Live withdrawal feed. Seeds from the server-rendered list, then prepends
 * each new rfid_withdrawal_events INSERT pushed over Supabase Realtime.
 * Polls as a fallback every `pollMs` so the feed keeps moving even if
 * Realtime is mis-wired (table not in publication, RLS, …).
 */
export function useWithdrawalFeed({
  initial,
  pollMs = 4000,
  max = 100,
}: {
  initial: WithdrawalEvent[];
  pollMs?: number;
  max?: number;
}) {
  const [events, setEvents] = useState<WithdrawalEvent[]>(initial);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef<Set<number>>(new Set(initial.map((e) => e.id)));

  function add(rows: WithdrawalEvent[]) {
    const fresh = rows.filter((r) => !seenIds.current.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach((r) => seenIds.current.add(r.id));
    setEvents((prev) =>
      [...fresh, ...prev]
        .sort((a, b) => b.withdrawnAt.localeCompare(a.withdrawnAt))
        .slice(0, max),
    );
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase
      .channel(`rfid-withdrawals-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rfid_withdrawal_events" },
        (payload) => {
          add([rowToEvent(payload.new as EventRow)]);
        },
      )
      .subscribe((s) => {
        if (!cancelled) setConnected(s === "SUBSCRIBED");
      });

    async function poll() {
      const { data } = await supabase
        .from("rfid_withdrawal_events")
        .select("id, tag_id, epc, product_name, reader_label, kind, withdrawn_at")
        .order("withdrawn_at", { ascending: false })
        .limit(20);
      if (cancelled || !data) return;
      add((data as EventRow[]).map(rowToEvent));
    }

    const interval =
      pollMs > 0 ? window.setInterval(poll, pollMs) : null;

    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, max]);

  return { events, connected };
}

/**
 * Calls `onChange` whenever rfid_tags changes anywhere (any client withdrew,
 * restocked, registered, or unregistered). The registry uses this to trigger
 * a router.refresh() so its present/last-withdrawn state stays live.
 */
export function useTagChanges(onChange: () => void) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`rfid-tags-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rfid_tags" },
        () => cb.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
