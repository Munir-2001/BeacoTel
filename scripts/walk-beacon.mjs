/**
 * Walks a single beacon around the FabLab floor by repeatedly UPSERTing
 * `beacon_live_positions`. Use it to watch the live tab update without a Pi.
 *
 * Run from Beacotel/:
 *   node --env-file=.env.local scripts/walk-beacon.mjs
 *
 * Optional env overrides:
 *   BEACON_ID=42 node --env-file=.env.local scripts/walk-beacon.mjs
 *   STEP_MS=250 node --env-file=.env.local scripts/walk-beacon.mjs
 *
 * Coords match the Pi's convention (used by src/lib/positioning/coords.ts):
 *   x = depth   (0..~8 m) → vertical on the floor plan
 *   y = length  (0..~24 m) → horizontal, FABLAB(0) → ELETTRONICA → PROTOTIPAZIONE(24)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing SUPABASE env vars. Run with: " +
      "node --env-file=.env.local scripts/walk-beacon.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BEACON_ID = Number(process.env.BEACON_ID ?? 66);
const STEP_MS = Number(process.env.STEP_MS ?? 500); // how often we UPSERT
const SEGMENT_MS = Number(process.env.SEGMENT_MS ?? 4000); // duration per waypoint hop

/**
 * Path through the building. Each point is (x_depth_m, y_length_m).
 * Rough room boundaries on the long axis (y):
 *   FABLAB         0 .. 13.3 m
 *   ELETTRONICA   13.3 .. 19.8 m
 *   PROTOTIPAZIONE 19.8 .. 24 m
 */
const WAYPOINTS = [
  { x: 4, y: 3 }, //  FABLAB west, mid-depth
  { x: 2, y: 7 }, //  FABLAB centre, near north wall
  { x: 6, y: 11 }, // FABLAB east, near south wall
  { x: 3, y: 15 }, // ELETTRONICA west
  { x: 6, y: 17.5 }, // ELETTRONICA south-mid
  { x: 2, y: 19 }, // ELETTRONICA east
  { x: 4, y: 22 }, // PROTOTIPAZIONE centre
  { x: 5, y: 20 }, // ELETTRONICA again, on the way back
];

const lerp = (a, b, t) => a + (b - a) * t;

let segmentIdx = 0;
let segmentStart = Date.now();
let updates = 0;
let consecutiveFailures = 0;

async function tick() {
  const a = WAYPOINTS[segmentIdx];
  const b = WAYPOINTS[(segmentIdx + 1) % WAYPOINTS.length];
  const t = Math.min(1, (Date.now() - segmentStart) / SEGMENT_MS);
  const x = lerp(a.x, b.x, t);
  const y = lerp(a.y, b.y, t);

  const { error } = await supabase.from("beacon_live_positions").upsert(
    {
      beacon_id: BEACON_ID,
      x,
      y,
      floor: 1,
      confidence: 0.9,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "beacon_id" },
  );

  if (error) {
    consecutiveFailures += 1;
    process.stdout.write(`\nupsert failed: ${error.message}\n`);
    if (consecutiveFailures >= 5) {
      console.error("Too many failures, exiting.");
      process.exit(1);
    }
  } else {
    consecutiveFailures = 0;
    updates += 1;
    process.stdout.write(
      `\r#${String(updates).padStart(4)}  ` +
        `beacon ${BEACON_ID}  ` +
        `x=${x.toFixed(2)}m  ` +
        `y=${y.toFixed(2)}m  ` +
        `(segment ${segmentIdx + 1}/${WAYPOINTS.length}, ` +
        `t=${(t * 100).toFixed(0)}%)   `,
    );
  }

  if (t >= 1) {
    segmentIdx = (segmentIdx + 1) % WAYPOINTS.length;
    segmentStart = Date.now();
  }
}

console.log(
  `Walking beacon ${BEACON_ID} across ${WAYPOINTS.length} waypoints.\n` +
    `Step every ${STEP_MS} ms, ${SEGMENT_MS} ms per segment.\n` +
    `Ctrl+C to stop.\n`,
);

// Fire once immediately, then on the interval.
await tick();
setInterval(tick, STEP_MS);
