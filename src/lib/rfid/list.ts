import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import type {
  MovementKind,
  RfidReader,
  RfidStats,
  RfidTag,
  WithdrawalEvent,
} from "@/lib/rfid/types";

/**
 * Read-side of the RFID-tracking module. Uses the session client so RLS gates
 * who can read; `requirePermission("rfid-tracking", "read")` is the app-level
 * companion check (admin + manager per migration 0013).
 */

type TagRow = {
  id: string;
  epc: string;
  product_name: string;
  category: string | null;
  reader_id: string | null;
  present: boolean;
  last_withdrawn_at: string | null;
  created_at: string;
  rfid_readers: { label: string } | null;
};

type EventRow = {
  id: number;
  tag_id: string | null;
  epc: string;
  product_name: string;
  reader_label: string | null;
  kind: MovementKind;
  withdrawn_at: string;
};

export async function listReaders(): Promise<RfidReader[]> {
  await requirePermission("rfid-tracking", "read");
  const supabase = await createClient();
  const { data } = await supabase
    .from("rfid_readers")
    .select("id, label, location")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    location: r.location ?? null,
  }));
}

export async function listTags(): Promise<RfidTag[]> {
  await requirePermission("rfid-tracking", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfid_tags")
    .select(
      "id, epc, product_name, category, reader_id, present, last_withdrawn_at, created_at, rfid_readers!reader_id(label)",
    )
    .order("product_name", { ascending: true })
    .order("epc", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as TagRow[]).map(rowToTag);
}

export async function listRecentWithdrawals(
  limit = 50,
): Promise<WithdrawalEvent[]> {
  await requirePermission("rfid-tracking", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfid_withdrawal_events")
    .select("id, tag_id, epc, product_name, reader_label, kind, withdrawn_at")
    .order("withdrawn_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as EventRow[]).map(rowToEvent);
}

export async function getRfidStats(): Promise<RfidStats> {
  await requirePermission("rfid-tracking", "read");
  const supabase = await createClient();

  const { count: totalTags } = await supabase
    .from("rfid_tags")
    .select("id", { count: "exact", head: true });

  const { count: inFridge } = await supabase
    .from("rfid_tags")
    .select("id", { count: "exact", head: true })
    .eq("present", true);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count: withdrawnToday } = await supabase
    .from("rfid_withdrawal_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "withdrawn")
    .gte("withdrawn_at", dayStart.toISOString());

  return {
    totalTags: totalTags ?? 0,
    inFridge: inFridge ?? 0,
    withdrawnToday: withdrawnToday ?? 0,
  };
}

function rowToTag(r: TagRow): RfidTag {
  return {
    id: r.id,
    epc: r.epc,
    productName: r.product_name,
    category: r.category,
    readerId: r.reader_id,
    readerLabel: r.rfid_readers?.label ?? null,
    present: r.present,
    lastWithdrawnAt: r.last_withdrawn_at,
    createdAt: r.created_at,
  };
}

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
