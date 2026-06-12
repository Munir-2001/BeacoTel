/**
 * Pi → UI coordinate conversion.
 *
 * The Pi computes positions in real-world METERS. Looking at the live data:
 *   - `x` ranges 0–~8 m  → it's the SHORT axis (room depth, N↕S in the plan)
 *   - `y` ranges 0–~24 m → it's the LONG axis  (room length, W↔E in the plan)
 *
 * The floor-plan SVG uses a viewBox of 1200 × 480 PIXELS where:
 *   - viewBox X (horizontal) runs along the LONG axis of the floor
 *   - viewBox Y (vertical)   runs along the SHORT axis of the floor
 *
 * So the mapping is rotated: **Pi y → viewBox x, Pi x → viewBox y**.
 *
 * Floor footprint from the architect's plan (FABLAB 86.23 + ELETTRONICA 72.47
 * + PROTOTIPAZIONE 34.00 = 192.7 m²) is roughly 24 m long × 8 m deep. Tune the
 * two constants below if dots end up in the wrong room.
 */

/** Long axis (FABLAB ↔ PROTOTIPAZIONE). Pi's `y` is in this dimension. */
export const FLOOR_LENGTH_M = 24;
/**
 * Short axis (room depth). Pi's `x` is in this dimension.
 *
 * Bumped from 8 to 10 after the live heatmap showed the densest cluster
 * pile up on the south wall: that means the Pi reports x-values up to
 * ~9–10 m, not the 8 m I'd estimated from the architect plan. Giving the
 * depth axis 2 extra metres lets those samples spread across the lower
 * third of the room instead of stacking on the wall edge.
 */
export const FLOOR_DEPTH_M = 14;

/** Building interior in viewBox pixels — matches the outline rect in Blueprint. */
const VBOX_X0 = 50;
const VBOX_Y0 = 90;
const VBOX_W = 1100; // 1150 - 50
const VBOX_H = 300; //  390 - 90

const PX_PER_M_LONG = VBOX_W / FLOOR_LENGTH_M;
const PX_PER_M_DEEP = VBOX_H / FLOOR_DEPTH_M;

export function metersToViewBox(xMeters: number, yMeters: number) {
  // Clamp incoming Pi coords to the building footprint. Without this, noise
  // / drift from the BLE triangulation can push samples a few metres past a
  // wall and the dot (or heatmap cell) renders in the grey area outside the
  // outline. Bump FLOOR_DEPTH_M / FLOOR_LENGTH_M above if you find that
  // legitimate samples are getting clamped.
  const x = Math.max(0, Math.min(FLOOR_DEPTH_M, xMeters));
  const y = Math.max(0, Math.min(FLOOR_LENGTH_M, yMeters));
  return {
    // Long-axis position (Pi's y) drives horizontal placement on the plan.
    x: VBOX_X0 + y * PX_PER_M_LONG,
    // Short-axis position (Pi's x) drives vertical placement on the plan.
    y: VBOX_Y0 + x * PX_PER_M_DEEP,
  };
}

/**
 * Backwards-compat guard: rows the in-app `/api/ble/signals/batch` route writes
 * are already in viewBox pixels because the centroid is computed over `ANCHORS`
 * in `trace.ts`. Tiny values are almost certainly meters from the Pi.
 *
 * Threshold of 40 is comfortably below `VBOX_X0` (50) so a viewBox value never
 * triggers it, while a meter value above 40 m is implausible for this floor.
 */
export function looksLikeMeters(x: number, y: number): boolean {
  return x < 40 && y < 40;
}

/** One-call helper: convert if needed, otherwise pass through. */
export function toViewBox(x: number, y: number): { x: number; y: number } {
  return looksLikeMeters(x, y) ? metersToViewBox(x, y) : { x, y };
}
