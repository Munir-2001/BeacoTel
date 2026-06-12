/**
 * Pi → UI coordinate conversion.
 *
 * Calibrated 2026-06-12 from four corner beacons placed at the physical
 * extremes of the lab. Their saved positions in `beacon_live_positions`:
 *
 *   beacon_id  Pi (x, y)     Screen corner
 *   100        (0,    0)     top-left
 *   101        (22,   0)     bottom-left
 *   102        (0,    8.5)   top-right
 *   103        (22,   8.5)   bottom-right
 *
 * From those four points the Pi convention is unambiguous:
 *   - Going top → bottom, Pi `x` runs 0 → 22
 *     ⇒ Pi `x` maps to the viewBox **vertical** axis.
 *   - Going left → right, Pi `y` runs 0 → 8.5
 *     ⇒ Pi `y` maps to the viewBox **horizontal** axis.
 *
 * If the corner beacons ever move or you re-calibrate, just update the
 * two range constants below — the math re-aligns automatically.
 */

/** Range of Pi's `x` axis (top-to-bottom on screen, in metres). */
export const PI_X_RANGE_M = 22;
/** Range of Pi's `y` axis (left-to-right on screen, in metres). */
export const PI_Y_RANGE_M = 8.5;

/**
 * Kept under their old names so other modules importing them still compile.
 * `FLOOR_LENGTH_M` was previously "horizontal on screen" (now Pi y),
 * `FLOOR_DEPTH_M` was "vertical on screen" (now Pi x).
 */
export const FLOOR_LENGTH_M = PI_Y_RANGE_M;
export const FLOOR_DEPTH_M = PI_X_RANGE_M;

/** Building interior in viewBox pixels — matches the outline rect in Blueprint. */
const VBOX_X0 = 50;
const VBOX_Y0 = 90;
const VBOX_X1 = 1150;
const VBOX_Y1 = 390;

const PX_PER_M_HORIZONTAL = (VBOX_X1 - VBOX_X0) / PI_Y_RANGE_M;
const PX_PER_M_VERTICAL = (VBOX_Y1 - VBOX_Y0) / PI_X_RANGE_M;

export function metersToViewBox(xMeters: number, yMeters: number) {
  // Clamp Pi coords to the calibrated footprint so noise / drift from the
  // BLE triangulation never renders outside the building outline.
  const xc = Math.max(0, Math.min(PI_X_RANGE_M, xMeters));
  const yc = Math.max(0, Math.min(PI_Y_RANGE_M, yMeters));
  return {
    // Pi y → viewBox X (horizontal). beacon 102 at (0, 8.5) hits the right edge.
    x: VBOX_X0 + yc * PX_PER_M_HORIZONTAL,
    // Pi x → viewBox Y (vertical). beacon 101 at (22, 0) hits the bottom edge.
    y: VBOX_Y0 + xc * PX_PER_M_VERTICAL,
  };
}


/**
 * Backwards-compat guard: rows the in-app `/api/ble/signals/batch` route
 * writes are already in viewBox pixels because the centroid is computed
 * over `ANCHORS` in `trace.ts`. Tiny values are almost certainly meters
 * from the Pi (since VBOX_X0 = 50, real viewBox values can never be < 40).
 */
export function looksLikeMeters(x: number, y: number): boolean {
  return x < 40 && y < 40;
}

/** One-call helper: convert if needed, otherwise pass through. */
export function toViewBox(x: number, y: number): { x: number; y: number } {
  return looksLikeMeters(x, y) ? metersToViewBox(x, y) : { x, y };
}
