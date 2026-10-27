// Gamepad helpers that need no Phaser, so they can be unit tested.
import type { Direction } from './maze';

/** The direction a stick is pushed, if it passes `threshold`. The stronger axis wins so a diagonal never moves two ways. */
export function stickDirection(x: number, y: number, threshold = 0.5): Direction | null {
  if (Math.max(Math.abs(x), Math.abs(y)) <= threshold) return null;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}
