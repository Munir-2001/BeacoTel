/**
 * Simulates a *near miss* for the tracked asset on the Inventory floorplan
 * (Asset Tracking — Real-time Floorplan): the asset is briefly carried just
 * outside its safe zone — firing the amber warning popup and its escalation
 * timer line — but is brought back home BEFORE the 4-second grace period
 * expires, so the full red alarm never triggers and nothing is logged.
 *
 * This is the counterpart to simulate-asset-theft.mjs (which lets the timer
 * run out). Loops a three-phase scenario by UPSERTing `beacon_live_positions`:
 *
 *   1. secure   — beacon idles at home with tiny jitter         (IDLE_MS)
 *   2. excursion— beacon steps just past the fence toward the
 *                 door and dwells there                          (DWELL_MS)
 *   3. recover  — beacon walks straight back home, well within
 *                 the grace window → warning clears, no alarm    (WALK_SPEED)
 *
 * The time the beacon spends reporting outside-the-fence positions is kept
 * under the guard's BREACH_DELAY_MS (4 s), so the warning resolves to
 * "secure" instead of escalating. The script estimates that window on start
 * and refuses to run if the chosen knobs would actually trip the alarm.
 *
 * Coordinates are floor-plan viewBox units (1200×480), same space as
 * equipment.home_x/home_y (toViewBox() passes values ≥ 40 straight through).
 *
 * Run from Beacotel/:
 *   node --env-file=.env.local scripts/simulate-asset-nearmiss.mjs
 *
 * Optional env overrides:
 *   IDLE_MS=8000 DWELL_MS=1500 BREACH_MARGIN=30 STEP_MS=400 WALK_SPEED=55 ONCE=1
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing SUPABASE env vars. Run with: " +
      "node --env-file=.env.local scripts/simulate-asset-nearmiss.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Must match BREACH_DELAY_MS in
 * src/components/inventory/asset-guard-provider.tsx — the grace period the
 * beacon must return within. Kept as a literal because this is a plain Node
 * script and can't import the TS module.
 */
const BREACH_DELAY_MS = 4_000;

const STEP_MS = Number(process.env.STEP_MS ?? 400);
const IDLE_MS = Number(process.env.IDLE_MS ?? 8000);
/** How long the beacon dwells just outside the fence before turning back. */
const DWELL_MS = Number(process.env.DWELL_MS ?? 1500);
/** How far past the fence the beacon strays, viewBox units. */
const BREACH_MARGIN = Number(process.env.BREACH_MARGIN ?? 30);
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
const RADIUS = asset.geofence_radius;

// A point just past the fence, aimed toward the FABLAB south door so the
// little excursion reads as someone stepping out and thinking better of it.
const DOOR = { x: 270, y: 380 };
const toDoor = { x: DOOR.x - HOME.x, y: DOOR.y - HOME.y };
const doorLen = Math.hypot(toDoor.x, toDoor.y) || 1;
const dir = { x: toDoor.x / doorLen, y: toDoor.y / doorLen };
const OUT = {
  x: HOME.x + dir.x * (RADIUS + BREACH_MARGIN),
  y: HOME.y + dir.y * (RADIUS + BREACH_MARGIN),
};

// Estimate how long the beacon will report outside the fence: the margin
// portion of the walk out + the dwell + the margin portion of the walk back.
const legOutsideMs = (BREACH_MARGIN / WALK_SPEED) * 1000;
const estOutsideMs = Math.round(legOutsideMs * 2 + DWELL_MS);

if (estOutsideMs > BREACH_DELAY_MS - 500) {
  console.error(
    `Refusing to run: estimated time outside the fence (~${estOutsideMs}ms) is ` +
      `too close to the ${BREACH_DELAY_MS}ms grace window — the alarm would ` +
      `likely fire.\nLower DWELL_MS or BREACH_MARGIN, or raise WALK_SPEED.`,
  );
  process.exit(1);
}

console.log(
  `Near-miss scenario for "${asset.name}" (${asset.asset_code})\n` +
    `  beacon  #${asset.beacon_id}\n` +
    `  home    (${HOME.x}, ${HOME.y})  safe radius ${RADIUS}\n` +
    `  out pt  (${OUT.x.toFixed(0)}, ${OUT.y.toFixed(0)})  ` +
    `${BREACH_MARGIN} units past the fence\n` +
    `  est. time outside fence ~${estOutsideMs}ms  (grace ${BREACH_DELAY_MS}ms)\n` +
    `  phases  secure ${IDLE_MS}ms → excursion (dwell ${DWELL_MS}ms) → recover\n` +
    `Ctrl+C to stop.\n`,
);

const lerp = (a, b, t) => a + (b - a) * t;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
let stopping = false;

// Ctrl+C: park the beacon back home so the dashboard resolves to "secure".
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
  process.stdout.write(
    `\r${label.padEnd(10)} x=${x.toFixed(0).padStart(4)}  y=${y
      .toFixed(0)
      .padStart(4)}   `,
  );
}

/** Walk a straight line from a→b at WALK_SPEED, writing every STEP_MS. */
async function walkTo(from, to, label) {
  const segMs = (Math.hypot(to.x - from.x, to.y - from.y) / WALK_SPEED) * 1000;
  const start = Date.now();
  while (Date.now() - start < segMs) {
    if (stopping) return;
    const t = Math.min(1, (Date.now() - start) / segMs);
    await writePosition(
      lerp(from.x, to.x, t) + (Math.random() - 0.5) * 5,
      lerp(from.y, to.y, t) + (Math.random() - 0.5) * 5,
      label,
    );
    await sleep(STEP_MS);
  }
}

/** Sit near a point with small jitter for `durationMs`. */
async function idle(point, durationMs, label, jitter = 8) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    if (stopping) return;
    await writePosition(
      point.x + (Math.random() - 0.5) * jitter,
      point.y + (Math.random() - 0.5) * jitter,
      label,
    );
    await sleep(STEP_MS);
  }
}

do {
  console.log("\n— phase: SECURE (asset at home)");
  await idle(HOME, IDLE_MS, "secure");

  console.log(
    "\n— phase: EXCURSION (stepping just past the fence — expect the amber popup + timer)",
  );
  await walkTo(HOME, OUT, "excursion");
  // Dwell just outside; keep jitter tight so it doesn't accidentally drift
  // back inside and clear the warning before we mean to.
  await idle(OUT, DWELL_MS, "excursion", 4);

  console.log(
    "\n— phase: RECOVER (back home before the grace timer ends — no alarm)",
  );
  await walkTo(OUT, HOME, "recover");
  // Settle exactly at home so the guard reads a clean "secure".
  await writePosition(HOME.x, HOME.y, "recover");
} while (!ONCE);

console.log("\nDone (single cycle).");
process.exit(0);
