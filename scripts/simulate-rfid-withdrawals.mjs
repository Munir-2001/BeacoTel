/**
 * Simulates the fridge antenna detecting RFID-tagged soft assets being taken
 * out (and occasionally put back), for the RFID Tracking page. Drives the
 * live withdrawal feed without any hardware.
 *
 * Each tick it picks a random in-fridge tag and "withdraws" it — exactly the
 * write the in-page Withdraw button performs:
 *   1. INSERT a row into rfid_withdrawal_events (the live feed listens here)
 *   2. UPDATE the tag: present = false, last_withdrawn_at = now
 * Now and then it returns a withdrawn tag — a tracked 'returned' movement
 * event that also shows in the live feed — and if the fridge ever empties it
 * bulk-refills everything (a silent reset, no events) so the demo keeps going.
 *
 * RLS restricts writes on the rfid_* tables to admin/manager, so this script
 * needs the SERVICE ROLE key (which bypasses RLS). The anon key is rejected.
 *
 * Run from Beacotel/:
 *   node --env-file=.env.local scripts/simulate-rfid-withdrawals.mjs
 *
 * Optional env overrides:
 *   INTERVAL_MS=3500 RESTOCK_PROB=0.25 ONCE=1
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "The rfid_* tables only allow admin/manager writes, so this script needs\n" +
      "the service-role key. Run with:\n" +
      "  node --env-file=.env.local scripts/simulate-rfid-withdrawals.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 3500);
const RESTOCK_PROB = Number(process.env.RESTOCK_PROB ?? 0.25);
const ONCE = process.env.ONCE === "1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let stopping = false;

/** Fetch every tag with its reader label (service role → RLS bypassed). */
async function fetchTags() {
  const { data, error } = await supabase
    .from("rfid_tags")
    .select(
      "id, epc, product_name, present, reader_id, rfid_readers!reader_id(label)",
    );
  if (error) {
    console.error(`\ncould not read tags: ${error.message}`);
    return [];
  }
  return (data ?? []).map((t) => ({
    id: t.id,
    epc: t.epc,
    product_name: t.product_name,
    present: t.present,
    reader_id: t.reader_id,
    reader_label: t.rfid_readers?.label ?? null,
  }));
}

async function withdraw(tag) {
  const now = new Date().toISOString();
  const { error: evErr } = await supabase.from("rfid_withdrawal_events").insert({
    tag_id: tag.id,
    epc: tag.epc,
    product_name: tag.product_name,
    reader_id: tag.reader_id,
    reader_label: tag.reader_label,
    kind: "withdrawn",
    withdrawn_at: now,
  });
  if (evErr) {
    console.error(`\nwithdraw event failed: ${evErr.message}`);
    return;
  }
  await supabase
    .from("rfid_tags")
    .update({ present: false, last_withdrawn_at: now })
    .eq("id", tag.id);
  console.log(
    `↑ withdrawn  ${tag.product_name.padEnd(26)} ${tag.epc}` +
      `${tag.reader_label ? `  @ ${tag.reader_label}` : ""}`,
  );
}

async function returnItem(tag) {
  // A return is a tracked movement — logs a 'returned' event + flips present.
  const { error: evErr } = await supabase.from("rfid_withdrawal_events").insert({
    tag_id: tag.id,
    epc: tag.epc,
    product_name: tag.product_name,
    reader_id: tag.reader_id,
    reader_label: tag.reader_label,
    kind: "returned",
    withdrawn_at: new Date().toISOString(),
  });
  if (evErr) {
    console.error(`\nreturn event failed: ${evErr.message}`);
    return;
  }
  await supabase.from("rfid_tags").update({ present: true }).eq("id", tag.id);
  console.log(`↓ returned   ${tag.product_name.padEnd(26)} ${tag.epc}`);
}

async function restockAll(tags) {
  await supabase
    .from("rfid_tags")
    .update({ present: true })
    .in(
      "id",
      tags.map((t) => t.id),
    );
}

// Ctrl+C: refill the fridge so the next run starts clean.
process.on("SIGINT", async () => {
  if (stopping) process.exit(1);
  stopping = true;
  console.log("\nStopping — restocking the fridge…");
  const tags = await fetchTags();
  if (tags.length) await restockAll(tags);
  console.log("Fridge restocked. Bye.");
  process.exit(0);
});

// --- main loop ----------------------------------------------------------------

const initial = await fetchTags();
if (initial.length === 0) {
  console.error(
    "No RFID tags found. Apply migration 0013 (it seeds the demo tags) first.",
  );
  process.exit(1);
}

console.log(
  `RFID withdrawal simulator — ${initial.length} tags registered.\n` +
    `  every ~${INTERVAL_MS}ms a random in-fridge item is withdrawn` +
    ` (restock chance ${Math.round(RESTOCK_PROB * 100)}%/tick)\n` +
    `Ctrl+C to stop (and restock the fridge).\n`,
);

async function tick() {
  if (stopping) return;
  const tags = await fetchTags();
  const present = tags.filter((t) => t.present);
  const withdrawn = tags.filter((t) => !t.present);

  // Empty fridge → refill so the demo keeps going.
  if (present.length === 0) {
    console.log("— fridge empty, restocking everything —");
    await restockAll(tags);
    return;
  }

  // Sometimes someone puts an item back before the next withdrawal — this is
  // a tracked 'returned' event and shows in the live feed.
  if (withdrawn.length > 0 && Math.random() < RESTOCK_PROB) {
    await returnItem(pick(withdrawn));
  }

  await withdraw(pick(present));
}

do {
  await tick();
  if (!ONCE && !stopping) await sleep(INTERVAL_MS);
} while (!ONCE && !stopping);

if (ONCE) {
  console.log("\nDone (single withdrawal).");
  process.exit(0);
}
