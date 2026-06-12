/**
 * Simulates the "valuable painting walks away" scenario for the Inventory
 * floorplan (Asset Tracking — Real-time Floorplan).
 *
 * Looks up the tracked asset seeded by migration 0012 (item_type 'asset',
 * beacon-bound), then loops a four-phase scenario by UPSERTing
 * `beacon_live_positions`:
 *
 *   1. secure  — beacon idles at home with tiny jitter        (IDLE_MS)
 *   2. theft   — beacon walks out of the safe zone toward
 *                the south door, then the east exit            (WALK_SPEED)
 *   3. gone    — beacon parks far from home; the 4s grace
 *                timer expires and the red alarm fires         (AWAY_MS)
 *   4. return  — security recovers it; beacon walks home       (WALK_SPEED)
 *
 * Movement is constant-speed (WALK_SPEED viewBox units/sec) rather than
 * fixed-duration, so every blip advances a small believable step instead of
 * teleporting across the plan when the path is long.
 *
 * Coordinates are written in floor-plan viewBox units (1200×480) — the same
 * space as equipment.home_x/home_y, so no meter conversion is involved
 * (toViewBox() in the UI passes values ≥ 40 straight through).
 *
 * Run from Beacotel/:
 *   node --env-file=.env.local scripts/simulate-asset-theft.mjs
 *
 * Optional env overrides:
 *   IDLE_MS=8000 AWAY_MS=12000 STEP_MS=400 WALK_SPEED=55 ONCE=1
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing SUPABASE env vars. Run with: " +
      "node --env-file=.env.local scripts/simulate-asset-theft.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STEP_MS = Number(process.env.STEP_MS ?? 400);
const IDLE_MS = Number(process.env.IDLE_MS ?? 8000);
const AWAY_MS = Number(process.env.AWAY_MS ?? 12000);
/** Walking pace, viewBox units per second (~22 units per 400ms blip). */
const WALK_SPEED = Number(process.env.WALK_SPEED ?? 55);
const ONCE = process.env.ONCE === "1";

// --- find the tracked asset ---------------------------------------------------

const { data: asset, error: assetErr } = await supabase
  .from("equipment")
  .select("name, asset_code, beacon_id, home_x, home_y, geofence_radius")
  .eq("item_type", "asset")
  .not("beacon_id", "is", null)
  .limit(1)
  .maybeSingle();

if (assetErr || !asset) {
  console.error(
    "No tracked asset found (item_type='asset' with beacon_id). " +
      "Apply migration 0012 first.",
    assetErr?.message ?? "",
  );
  process.exit(1);
}

const HOME = { x: asset.home_x, y: asset.home_y };

/**
 * Escape route, viewBox units: slip out of the safe zone, hug the FABLAB
 * south wall to the door at (270, 392), then run the corridor toward the
 * PROTOTIPAZIONE east exit.
 */
const ESCAPE = [
  HOME,
  { x: HOME.x + asset.geofence_radius + 40, y: HOME.y + 60 },
  { x: 270, y: 380 },
  { x: 560, y: 376 },
  { x: 900, y: 340 },
  { x: 1100, y: 270 },
];

const pathLength = (points) => {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return len;
};
const walkSecs = Math.round(pathLength(ESCAPE) / WALK_SPEED);

console.log(
  `Guarding scenario for "${asset.name}" (${asset.asset_code})\n` +
    `  beacon  #${asset.beacon_id}\n` +
    `  home    (${HOME.x}, ${HOME.y})  safe radius ${asset.geofence_radius}\n` +
    `  pace    ${WALK_SPEED} units/s (~${Math.round(WALK_SPEED * (STEP_MS / 1000))} per blip)\n` +
    `  phases  secure ${IDLE_MS}ms → theft ~${walkSecs}s → gone ${AWAY_MS}ms → return ~${walkSecs}s\n` +
    `Ctrl+C to stop.\n`,
);

const lerp = (a, b, t) => a + (b - a) * t;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
let stopping = false;

// Ctrl+C: don't leave the painting stranded mid-theft — park the beacon back
// at its home spot first so the dashboard resolves to "secure", then exit.
process.on("SIGINT", async () => {
  if (stopping) process.exit(1); // second Ctrl+C: force quit
  stopping = true;
  console.log("\nStopping — returning beacon to its home spot…");
  const { error } = await supabase.from("beacon_live_positions").upsert(
    {
      beacon_id: asset.beacon_id,
      x: HOME.x,
      y: HOME.y,
      floor: 1,
      confidence: 0.99,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "beacon_id" },
  );
  if (error) console.error(`could not park beacon home: ${error.message}`);
  else console.log("Beacon parked at home. Bye.");
  process.exit(error ? 1 : 0);
});

// Last position WE wrote. Lets us tell our own writes apart from an external
// reset (the dashboard's "Acknowledge & recover asset" parks the beacon home).
let lastWritten = null;

/**
 * True when someone else moved the beacon back to home since our last write.
 * Read-before-write: as long as we check before every overwrite, the
 * dashboard's single recovery write can't be lost between our updates.
 */
async function externallyRecovered() {
  if (!lastWritten) return false;
  const { data, error } = await supabase
    .from("beacon_live_positions")
    .select("x, y")
    .eq("beacon_id", asset.beacon_id)
    .maybeSingle();
  if (error || !data) return false;
  const drift = Math.hypot(data.x - lastWritten.x, data.y - lastWritten.y);
  const atHome = Math.hypot(data.x - HOME.x, data.y - HOME.y) < 2;
  return drift > 10 && atHome;
}

async function writePosition(x, y, label) {
  if (stopping) return; // the SIGINT handler owns the final write
  const { error } = await supabase.from("beacon_live_positions").upsert(
    {
      beacon_id: asset.beacon_id,
      x,
      y,
      floor: 1,
      confidence: 0.97,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "beacon_id" },
  );
  if (error) {
    failures += 1;
    process.stdout.write(`\nupsert failed: ${error.message}\n`);
    if (failures >= 5) {
      console.error("Too many failures, exiting.");
      process.exit(1);
    }
    return;
  }
  failures = 0;
  lastWritten = { x, y };
  process.stdout.write(
    `\r${label.padEnd(8)} x=${x.toFixed(0).padStart(4)}  y=${y
      .toFixed(0)
      .padStart(4)}   `,
  );
}

/**
 * Walk a polyline at WALK_SPEED units/sec, writing every STEP_MS, with a
 * touch of jitter so the track reads like a person carrying the asset —
 * small consistent steps, never a teleport. Long segments simply take
 * longer instead of being covered in the same number of blips.
 * With `watchRecovery`, checks for an external home-reset before each write
 * and returns "recovered" instead of clobbering it.
 */
async function walk(points, label, watchRecovery = false) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segMs = (Math.hypot(b.x - a.x, b.y - a.y) / WALK_SPEED) * 1000;
    const start = Date.now();
    while (Date.now() - start < segMs) {
      if (watchRecovery && (await externallyRecovered())) return "recovered";
      const t = Math.min(1, (Date.now() - start) / segMs);
      await writePosition(
        lerp(a.x, b.x, t) + (Math.random() - 0.5) * 6,
        lerp(a.y, b.y, t) + (Math.random() - 0.5) * 6,
        label,
      );
      await sleep(STEP_MS);
    }
  }
  if (watchRecovery && (await externallyRecovered())) return "recovered";
  const last = points[points.length - 1];
  await writePosition(last.x, last.y, label);
  return "done";
}

/** Sit near a point with small jitter for `durationMs`. Same return contract as walk(). */
async function idle(point, durationMs, label, watchRecovery = false) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    if (watchRecovery && (await externallyRecovered())) return "recovered";
    await writePosition(
      point.x + (Math.random() - 0.5) * 8,
      point.y + (Math.random() - 0.5) * 8,
      label,
    );
    await sleep(STEP_MS);
  }
  return "done";
}

function onRecovered() {
  // The dashboard already wrote the home position — adopt it and let the
  // loop start over from the secure phase.
  lastWritten = { x: HOME.x, y: HOME.y };
  console.log(
    "\n— alert acknowledged on the dashboard: asset recovered to home. Restarting cycle.",
  );
}

const FAR = ESCAPE[ESCAPE.length - 1];

cycle: do {
  console.log("\n— phase: SECURE (asset at home)");
  await idle(HOME, IDLE_MS, "secure");

  console.log("\n— phase: THEFT (leaving safe zone — expect popup, then alarm)");
  if ((await walk(ESCAPE, "theft", true)) === "recovered") {
    onRecovered();
    continue cycle;
  }

  console.log("\n— phase: GONE (far from home — red alarm should be up)");
  if ((await idle(FAR, AWAY_MS, "gone", true)) === "recovered") {
    onRecovered();
    continue cycle;
  }

  console.log("\n— phase: RETURN (security recovered the asset)");
  if ((await walk([...ESCAPE].reverse(), "return", true)) === "recovered") {
    onRecovered();
    continue cycle;
  }
} while (!ONCE);

console.log("\nDone (single cycle).");
process.exit(0);
