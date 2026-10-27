/**
 * Gamepad helpers that need no Phaser, so they can be unit tested.
 */
import type { Direction } from './maze';

/**
 * The direction a stick is pushed, if it passes `threshold`. The stronger axis wins so a diagonal never moves two ways.
 *
 * @param x - Horizontal stick axis, from -1 (full left) to 1 (full right).
 * @param y - Vertical stick axis, from -1 (full up) to 1 (full down), as Phaser reports it.
 * @param threshold - How far the stick must be pushed (0 to 1) before it counts, which filters out resting drift.
 * @returns The direction pushed, or null while neither axis is beyond the threshold.
 */
export function stickDirection(x: number, y: number, threshold = 0.5): Direction | null {
  // Inside the dead zone on both axes: nothing is pushed.
  if (Math.max(Math.abs(x), Math.abs(y)) <= threshold) return null;
  // Compare the axes so only the stronger one counts; an exact tie goes to horizontal.
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}
