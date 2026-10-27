/**
 * Catapult reload animation maths: reload progress, the throwing arm's angle and the loaded balloon's size.
 */
import { clamp } from './movement';

// The bucket is on the left end of the arm, so positive angles lift it.
export const ARM_RELEASE_ANGLE = 0.95; // arm flung up right after a shot (radians)
export const ARM_LOWERED_ANGLE = -0.7; // bucket dropped while a new balloon is loaded (radians)
export const ARM_READY_ANGLE = 0.25; // loaded and ready to fire (radians)

// Reload progress (0 to 1) at which the animation changes phase.
const DROP_END = 0.15; // the arm has finished dropping from released to lowered
const RAISE_START = 0.85; // the arm starts lifting from lowered to ready
const BALLOON_APPEARS = 0.3; // a fresh balloon starts growing in the bucket

/**
 * Linear interpolation between two numbers.
 *
 * @param from - Value at t = 0.
 * @param to - Value at t = 1.
 * @param t - Blend factor, 0 to 1.
 * @returns The value `t` of the way from `from` to `to`.
 */
const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Ease-out curve: fast at the start, slowing towards the end.
 *
 * @param t - Progress, 0 to 1.
 * @returns Eased progress, 0 to 1.
 */
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Smoothstep ease-in-out curve: gentle at both ends.
 *
 * @param t - Progress, 0 to 1.
 * @returns Eased progress, 0 to 1.
 */
const easeInOut = (t: number): number => t * t * (3 - 2 * t);

/**
 * How far the catapult has reloaded since its last shot.
 *
 * @param cooldownMs - Time left until the catapult can fire again, in ms.
 * @param totalMs - Full cooldown length, in ms; 0 or less means there is no cooldown.
 * @returns Progress from 0 (just fired) to 1 (ready to fire again).
 */
export const reloadProgress = (cooldownMs: number, totalMs: number): number =>
  totalMs <= 0 ? 1 : clamp(1 - cooldownMs / totalMs, 0, 1);

/**
 * Angle of the throwing arm during a reload: flung up on release, dropped while a balloon is loaded,
 * then lifted back to the ready pose.
 *
 * @param progress - Reload progress from `reloadProgress`, 0 to 1 (values outside are clamped).
 * @returns Arm rotation in radians.
 */
export function armAngle(progress: number): number {
  const p = clamp(progress, 0, 1);
  // Phase 1: drop quickly from the release pose to the lowered pose.
  if (p < DROP_END) return lerp(ARM_RELEASE_ANGLE, ARM_LOWERED_ANGLE, easeOut(p / DROP_END));
  // Phase 2: stay lowered while the new balloon is loaded.
  if (p < RAISE_START) return ARM_LOWERED_ANGLE;
  // Phase 3: swing back up to the ready pose.
  return lerp(ARM_LOWERED_ANGLE, ARM_READY_ANGLE, easeInOut((p - RAISE_START) / (1 - RAISE_START)));
}

/**
 * Size of the balloon sitting in the bucket.
 *
 * @param progress - Reload progress from `reloadProgress`, 0 to 1 (values outside are clamped).
 * @returns Scale from 0 (empty bucket) to 1 (fully loaded).
 */
export function loadedBalloonScale(progress: number): number {
  const p = clamp(progress, 0, 1);
  if (p <= BALLOON_APPEARS) return 0;
  // The balloon grows from when it appears until the arm starts to rise.
  return clamp((p - BALLOON_APPEARS) / (RAISE_START - BALLOON_APPEARS), 0, 1);
}
