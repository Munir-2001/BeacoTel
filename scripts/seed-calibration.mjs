/**
 * Seed / restore the four corner-beacon calibration rows.
 *
 * These four beacons sit at the physical extremes of the FabLab and are
 * what `src/lib/positioning/coords.ts` was calibrated against on
 * 2026-06-12. If they ever get deleted, overwritten, or you set up a
 * fresh Supabase project, run:
 *
 *   node --env-file=.env.local scripts/seed-calibration.mjs
 *
 * Idempotent — it UPSERTs by `beacon_id`, so running it twice does nothing
 * harmful. It does NOT touch any non-calibration rows (the Pi's beacons,
 * staff badges, etc.).
 *
 * ============================================================================
 *
 *  COORDINATE REFERENCE — current state of the world
 *
 *  Pi convention (decided by where the 4 corners landed):
 *    x = vertical on the floor plan, range 0..22  m  (top → bottom)
 *    y = horizontal on the floor plan, range 0..8.5 m (left → right)
 *
 *  Floor-plan SVG viewBox: 1200 × 480 pixels.
 *  Building outline (inside the SVG):
 *    top-left:     (50,  90)
 *    top-right:    (1150, 90)
 *    bottom-left:  (50,  390)
 *    bottom-right: (1150, 390)
 *
 *  Corner beacons (this script):
 *    100  Pi (0,    0)     top-left
 *    101  Pi (22,   0)     bottom-left
 *    102  Pi (0,    8.5)   top-right
 *    103  Pi (22,   8.5)   bottom-right
 *
 *  BLE receivers / anchors (declared in src/lib/positioning/trace.ts):
 *    Node 1  PROTOTIPAZIONE top  viewBox (1000, 130)
 *    Node 2  ELETTRONICA south   viewBox  (760, 370)
 *    Node 3  FABLAB NW           viewBox  (120, 130)
 *
 *  Conversion factors (derived from the calibration):
 *    PX_PER_M horizontal: 1100 px / 8.5 m ≈ 129.4 px / m
 *    PX_PER_M vertical:    300 px / 22  m ≈  13.6 px / m
 *
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing SUPABASE env vars. Run with: " +
      "node --env-file=.env.local scripts/seed-calibration.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** The four corner-beacon calibration rows. */
const CORNERS = [
  { beacon_id: 100, label: "top-left",     x: 0,  y: 0 },
  { beacon_id: 101, label: "bottom-left",  x: 22, y: 0 },
  { beacon_id: 102, label: "top-right",    x: 0,  y: 8.5 },
  { beacon_id: 103, label: "bottom-right", x: 22, y: 8.5 },
];

const now = new Date().toISOString();
const rows = CORNERS.map((c) => ({
  beacon_id: c.beacon_id,
  x: c.x,
  y: c.y,
  floor: 1,
  confidence: 0.9,
  last_seen: now,
}));

const { error } = await supabase
  .from("beacon_live_positions")
  .upsert(rows, { onConflict: "beacon_id" });

if (error) {
  console.error("Calibration upsert failed:", error.message);
  process.exit(1);
}

console.log("Calibration beacons restored:");
for (const c of CORNERS) {
  console.log(
    `  #${c.beacon_id}  Pi (${c.x.toString().padStart(5)}, ${c.y.toString().padStart(4)})  ${c.label}`,
  );
}
console.log("\nDone. /live-tracking will reflect the corners within ~2s.");
