"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";

/**
 * Write-side of the RFID-tracking module. The withdrawal action is the
 * software stand-in for the fridge antenna firing: it flips the tag's
 * `present` flag and appends an immutable row to rfid_withdrawal_events
 * (which the live feed subscribes to). RLS restricts writes to admin +
 * manager; requirePermission is the app-level companion gate.
 */

export type RfidActionResult = { ok: boolean; error?: string };

const PATH = "/rfid-tracking";

type TagSnapshot = {
  id: string;
  epc: string;
  product_name: string;
  present: boolean;
  reader_id: string | null;
  rfid_readers: { label: string } | null;
};

/**
 * Record a withdrawal: an item left the fridge. Logs one event and marks the
 * tag absent. No-op-with-message if the item is already out (the antenna
 * can't withdraw what isn't there).
 */
export async function recordWithdrawal(
  tagId: string,
): Promise<RfidActionResult> {
  await requirePermission("rfid-tracking", "update");
  const supabase = await createClient();

  const { data: tag, error: readErr } = await supabase
    .from("rfid_tags")
    .select(
      "id, epc, product_name, present, reader_id, rfid_readers!reader_id(label)",
    )
    .eq("id", tagId)
    .single<TagSnapshot>();

  if (readErr || !tag) return { ok: false, error: "Tag not found." };
  if (!tag.present) {
    return { ok: false, error: "This item is already out of the fridge." };
  }

  const now = new Date().toISOString();

  const { error: evErr } = await supabase.from("rfid_withdrawal_events").insert({
    tag_id: tag.id,
    epc: tag.epc,
    product_name: tag.product_name,
    reader_id: tag.reader_id,
    reader_label: tag.rfid_readers?.label ?? null,
    kind: "withdrawn",
    withdrawn_at: now,
  });
  if (evErr) return { ok: false, error: evErr.message };

  const { error: updErr } = await supabase
    .from("rfid_tags")
    .update({ present: false, last_withdrawn_at: now })
    .eq("id", tag.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Return an item to the fridge: logs a 'returned' movement event and clears
 * the `present` flag back to true. No-op-with-message if it's already in the
 * fridge (can't return what never left).
 */
export async function returnTag(tagId: string): Promise<RfidActionResult> {
  await requirePermission("rfid-tracking", "update");
  const supabase = await createClient();

  const { data: tag, error: readErr } = await supabase
    .from("rfid_tags")
    .select(
      "id, epc, product_name, present, reader_id, rfid_readers!reader_id(label)",
    )
    .eq("id", tagId)
    .single<TagSnapshot>();

  if (readErr || !tag) return { ok: false, error: "Tag not found." };
  if (tag.present) {
    return { ok: false, error: "This item is already in the fridge." };
  }

  const { error: evErr } = await supabase.from("rfid_withdrawal_events").insert({
    tag_id: tag.id,
    epc: tag.epc,
    product_name: tag.product_name,
    reader_id: tag.reader_id,
    reader_label: tag.rfid_readers?.label ?? null,
    kind: "returned",
    withdrawn_at: new Date().toISOString(),
  });
  if (evErr) return { ok: false, error: evErr.message };

  const { error: updErr } = await supabase
    .from("rfid_tags")
    .update({ present: true })
    .eq("id", tag.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(PATH);
  return { ok: true };
}

export type RegisterTagInput = {
  epc: string;
  productName: string;
  category: string;
  readerId: string | null;
};

/** Register a new tagged soft asset into the registry. */
export async function registerTag(
  input: RegisterTagInput,
): Promise<RfidActionResult> {
  await requirePermission("rfid-tracking", "create");

  const epc = input.epc.trim();
  const productName = input.productName.trim();
  if (!epc) return { ok: false, error: "Tag ID (EPC) is required." };
  if (!productName) return { ok: false, error: "Product name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("rfid_tags").insert({
    epc,
    product_name: productName,
    category: input.category || null,
    reader_id: input.readerId || null,
    present: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Tag “${epc}” is already registered.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(PATH);
  return { ok: true };
}

/** Remove a tag from the registry. Past withdrawal events are preserved
 *  (their tag_id is set null on delete), so the log history stays intact. */
export async function unregisterTag(
  tagId: string,
): Promise<RfidActionResult> {
  await requirePermission("rfid-tracking", "delete");
  const supabase = await createClient();

  const { error } = await supabase.from("rfid_tags").delete().eq("id", tagId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}
