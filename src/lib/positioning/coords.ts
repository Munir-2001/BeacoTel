/**
 * Pi → UI coordinate conversion.
 *
 * Calibrated from the four corner beacons in `beacon_live_positions`:
 *
 *   beacon_id  Pi (x, y)
 *   100        (0,    0)
 *   101        (22,   0)
 *   102        (0,    8.5)
 *   103        (22,   8.5)
 *
 * So the floor spans Pi `x` ∈ [0, 22] and Pi `y` ∈ [0, 8.5]. The lab is a
 * long, shallow room: the 22 m axis runs the **length** of the building
 * (the FABLAB → ELETTRONICA → PROTOTIPAZIONE row, left→right on the
 * blueprint) and the 8.5 m axis is its **depth** (top→bottom). The blueprint
 * is drawn wide (1100 × 300 px interior), so:
 *
 *   - Pi `x` (0 → 22, length)  ⇒ viewBox **horizontal** axis (the long one).
 *   - Pi `y` (0 → 8.5, depth)  ⇒ viewBox **vertical** axis (the short one),
 *     measured from the BOTTOM — so the origin (0, 0) = beacon 100 sits at
 *     the **bottom-left** and `y` increases upward (102 at the top-left).
 *
 * Mapping the long axis to the long screen dimension keeps px-per-metre
 * roughly uniform on both axes (~50 vs ~35 px/m), so a beacon's dot moves
 * proportionally instead of flinging sideways on small `y` changes.
 *
 * If the corner beacons ever move or you re-calibrate, just update the two
 * range constants below — the math re-aligns automatically.
 */

/** Range of Pi's `x` axis — the building length (left↔right on screen), metres. */
export const PI_X_RANGE_M = 22;
/** Range of Pi's `y` axis — the building depth (top↔bottom on screen), metres. */
export const PI_Y_RANGE_M = 8.5;

/**
 * Kept under their old names so other modules importing them still compile.
 * `FLOOR_LENGTH_M` is the horizontal (length) span = Pi x; `FLOOR_DEPTH_M`
 * is the vertical (depth) span = Pi y.
 */
export const FLOOR_LENGTH_M = PI_X_RANGE_M;
export const FLOOR_DEPTH_M = PI_Y_RANGE_M;

/** Building interior in viewBox pixels — matches the outline rect in Blueprint. */
const VBOX_X0 = 50;
const VBOX_Y0 = 90;
const VBOX_X1 = 1150;
const VBOX_Y1 = 390;

// Pi x (length) drives the horizontal span; Pi y (depth) drives the vertical.
const PX_PER_M_HORIZONTAL = (VBOX_X1 - VBOX_X0) / PI_X_RANGE_M;
const PX_PER_M_VERTICAL = (VBOX_Y1 - VBOX_Y0) / PI_Y_RANGE_M;

export function metersToViewBox(xMeters: number, yMeters: number) {
  // Clamp Pi coords to the calibrated footprint so noise / drift from the
  // BLE triangulation never renders outside the building outline.
  const xc = Math.max(0, Math.min(PI_X_RANGE_M, xMeters));
  const yc = Math.max(0, Math.min(PI_Y_RANGE_M, yMeters));
  return {
    // Pi x → viewBox X (horizontal). beacon 101 at (22, 0) hits the right edge.
    x: VBOX_X0 + xc * PX_PER_M_HORIZONTAL,
    // Pi y → viewBox Y (vertical), measured from the bottom: y=0 maps to the
    // bottom edge so beacon 100 (0,0) is bottom-left; 102 (0,8.5) is top-left.
    y: VBOX_Y1 - yc * PX_PER_M_VERTICAL,
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
