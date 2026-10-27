import { clamp } from './movement';

// The bucket is on the left end of the arm, so positive angles lift it.
export const ARM_RELEASE_ANGLE = 0.95; // arm flung up right after a shot
export const ARM_LOWERED_ANGLE = -0.7; // bucket dropped while a new balloon is loaded
export const ARM_READY_ANGLE = 0.25; // loaded and ready to fire

const DROP_END = 0.15;
const RAISE_START = 0.85;
const BALLOON_APPEARS = 0.3;

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeInOut = (t: number): number => t * t * (3 - 2 * t);

/** 0 right after firing, 1 when the catapult can fire again. */
export const reloadProgress = (cooldownMs: number, totalMs: number): number =>
  totalMs <= 0 ? 1 : clamp(1 - cooldownMs / totalMs, 0, 1);

export function armAngle(progress: number): number {
  const p = clamp(progress, 0, 1);
  if (p < DROP_END) return lerp(ARM_RELEASE_ANGLE, ARM_LOWERED_ANGLE, easeOut(p / DROP_END));
  if (p < RAISE_START) return ARM_LOWERED_ANGLE;
  return lerp(ARM_LOWERED_ANGLE, ARM_READY_ANGLE, easeInOut((p - RAISE_START) / (1 - RAISE_START)));
}

/** Size of the balloon sitting in the bucket: 0 (empty) to 1 (loaded). */
export function loadedBalloonScale(progress: number): number {
  const p = clamp(progress, 0, 1);
  if (p <= BALLOON_APPEARS) return 0;
  return clamp((p - BALLOON_APPEARS) / (RAISE_START - BALLOON_APPEARS), 0, 1);
}
