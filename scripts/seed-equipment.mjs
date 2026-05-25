/**
 * Seeds demo rows into public.equipment so the Asset Registry has data to
 * render. Re-runnable — wipes any prior demo rows by name before inserting.
 *
 * Run from the Beacotel directory:
 *   node --env-file=.env.local scripts/seed-equipment.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve a couple of profiles for the `assigned_to` foreign key.
const { data: people } = await admin
  .from("profiles")
  .select("id, email")
  .in("email", [
    "elena.rodriguez@unitn.it",
    "sasha.kim@unitn.it",
    "marcus.vane@unitn.it",
  ]);
const byEmail = Object.fromEntries((people ?? []).map((p) => [p.email, p.id]));

const SEED = [
  {
    name: 'Samsung 65" Hospitality OLED',
    category: "multimedia",
    location: "Suite 401",
    status: "available",
    rfid_tag_id: "RFID-401-SH",
    assigned_to: null,
    value_cents: 145000,
    notes: "Wall-mounted; firmware 2024.07.",
    last_inspected_at: "2026-04-12",
  },
  {
    name: "Otis Service Lift A Motor",
    category: "structural",
    location: "Main Shaft",
    status: "maintenance",
    rfid_tag_id: "RFID-LFT-02",
    assigned_to: byEmail["marcus.vane@unitn.it"] ?? null,
    value_cents: 1280000,
    notes: "Quarterly service scheduled May 30.",
    last_inspected_at: "2026-03-04",
  },
  {
    name: "Sub-Zero Pro Mini-Bar",
    category: "appliance",
    location: "Suite 404",
    status: "in_use",
    rfid_tag_id: "RFID-404-MB",
    assigned_to: null,
    value_cents: 210000,
    notes: "Restocked weekly.",
    last_inspected_at: "2026-05-01",
  },
  {
    name: "Cisco Meraki MR56 AP",
    category: "network",
    location: "Exec Lounge",
    status: "available",
    rfid_tag_id: "RFID-LUN-WF",
    assigned_to: null,
    value_cents: 85000,
    notes: "Dual-band, 5GHz primary.",
    last_inspected_at: "2026-04-28",
  },
  {
    name: "Dyson V15 Vacuum",
    category: "cleaning",
    location: "Housekeeping Floor 3",
    status: "in_use",
    rfid_tag_id: "RFID-CLN-V15-07",
    assigned_to: byEmail["elena.rodriguez@unitn.it"] ?? null,
    value_cents: 75000,
    notes: "Battery replaced Apr 2026.",
    last_inspected_at: "2026-05-15",
  },
  {
    name: "Industrial Mop Cart",
    category: "cleaning",
    location: "Service Hall B",
    status: "available",
    rfid_tag_id: "RFID-MOP-07",
    assigned_to: byEmail["sasha.kim@unitn.it"] ?? null,
    value_cents: 32000,
    notes: null,
    last_inspected_at: "2026-04-21",
  },
  {
    name: "Pool Filter Unit",
    category: "appliance",
    location: "Mezzanine Pool",
    status: "broken",
    rfid_tag_id: "RFID-POOL-FLT",
    assigned_to: null,
    value_cents: 480000,
    notes: "Awaiting replacement filter cartridge.",
    last_inspected_at: "2026-02-19",
  },
];

const seedNames = SEED.map((s) => s.name);

// Idempotency: clear any prior demo rows by their (unique) names so re-runs
// don't duplicate. Real production rows would have different names, so this
// won't touch anything the user added through the UI.
await admin.from("equipment").delete().in("name", seedNames);

const { data, error } = await admin
  .from("equipment")
  .insert(SEED)
  .select("asset_code, name");

if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

console.log(`Inserted ${data.length} equipment rows:`);
for (const row of data) console.log(`  ${row.asset_code}  ${row.name}`);
