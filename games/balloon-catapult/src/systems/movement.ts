/**
 * Shared 2D geometry helpers (points, rectangles, clamping) and the aiming-reticle movement step.
 */

/** A 2D point or direction in screen space (+y points down). */
export interface Vec2 {
  x: number; // horizontal component, px
  y: number; // vertical component, px (grows downward)
}

/** An axis-aligned rectangle described by its four edges, in px. */
export interface Bounds {
  left: number; // x of the left edge
  top: number; // y of the top edge
  right: number; // x of the right edge
  bottom: number; // y of the bottom edge
}

/**
 * Limits a number to a range.
 *
 * @param value - The number to limit.
 * @param min - Lower limit.
 * @param max - Upper limit.
 * @returns `value`, or the nearest limit when it falls outside [min, max].
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Pulls a point back inside a rectangle.
 *
 * @param pos - The point to constrain.
 * @param bounds - The rectangle the point must stay within.
 * @returns A new point inside `bounds`.
 */
export const clampToBounds = (pos: Vec2, bounds: Bounds): Vec2 => ({
  x: clamp(pos.x, bounds.left, bounds.right),
  y: clamp(pos.y, bounds.top, bounds.bottom),
});

/**
 * Moves the aiming reticle for one frame, scaled by frame time so speed does not depend on frame rate.
 * Diagonal input is normalised so it is not faster than a straight one.
 *
 * @param pos - Current reticle position.
 * @param dir - Input direction, each axis -1 to 1 (partial values move proportionally slower).
 * @param speed - Reticle speed at full input, in px per second.
 * @param deltaMs - Time since the previous frame, in ms.
 * @param bounds - Area the reticle must stay inside.
 * @returns The reticle's new position.
 */
export function stepReticle(pos: Vec2, dir: Vec2, speed: number, deltaMs: number, bounds: Bounds): Vec2 {
  const length = Math.hypot(dir.x, dir.y);
  // Only shrink vectors longer than 1, so a half-pushed stick still moves at half speed.
  const scale = length > 1 ? 1 / length : 1;
  const distance = speed * (deltaMs / 1000); // px to travel this frame
  return clampToBounds(
    { x: pos.x + dir.x * scale * distance, y: pos.y + dir.y * scale * distance },
    bounds,
  );
}
