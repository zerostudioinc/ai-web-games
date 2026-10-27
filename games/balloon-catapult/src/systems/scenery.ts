/**
 * Seeded pseudo-random helpers that place decorative scenery (grass tufts, flowers, pebbles, wood grain) identically on every load.
 */
import type { Bounds, Vec2 } from './movement';

/**
 * Small seedable PRNG so baked scenery looks the same on every load.
 *
 * @param seed - Any integer; the same seed always yields the same sequence.
 * @returns A function that returns the next pseudo-random number in [0, 1) on each call.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0; // coerce to an unsigned 32-bit integer
  return () => {
    // Standard mulberry32 mixing; every step wraps at 32 bits.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Divide by 2^32 to map the 32-bit result onto [0, 1).
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Scatters points at seeded-random positions inside a rectangle.
 *
 * @param seed - PRNG seed; the same seed always gives the same layout.
 * @param count - How many points to create.
 * @param area - Rectangle the points fall inside.
 * @returns `count` points inside `area`.
 */
export function scatterPoints(seed: number, count: number, area: Bounds): Vec2[] {
  const random = mulberry32(seed);
  const points: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: area.left + random() * (area.right - area.left),
      y: area.top + random() * (area.bottom - area.top),
    });
  }
  return points;
}
