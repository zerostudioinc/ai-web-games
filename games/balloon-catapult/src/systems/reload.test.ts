/**
 * Tests for the catapult reload animation: progress, arm angle and loaded-balloon size.
 */
import { describe, expect, it } from 'vitest';
import {
  ARM_LOWERED_ANGLE,
  ARM_READY_ANGLE,
  ARM_RELEASE_ANGLE,
  armAngle,
  loadedBalloonScale,
  reloadProgress,
} from './reload';

// Reload progress is the share of the cooldown that has elapsed.
describe('reloadProgress', () => {
  it('runs from 0 (just fired) to 1 (ready)', () => {
    expect(reloadProgress(700, 700)).toBe(0);
    expect(reloadProgress(350, 700)).toBeCloseTo(0.5);
    expect(reloadProgress(0, 700)).toBe(1);
  });

  it('clamps out-of-range cooldowns', () => {
    expect(reloadProgress(900, 700)).toBe(0); // more time left than the full cooldown
    expect(reloadProgress(-10, 700)).toBe(1); // negative time left
    expect(reloadProgress(10, 0)).toBe(1); // no cooldown at all
  });
});

// The arm drops, rests lowered, then lifts to the ready pose.
describe('armAngle', () => {
  it('flings up on release, drops to lowered, and ends ready', () => {
    expect(armAngle(0)).toBeCloseTo(ARM_RELEASE_ANGLE);
    expect(armAngle(0.5)).toBe(ARM_LOWERED_ANGLE);
    expect(armAngle(1)).toBeCloseTo(ARM_READY_ANGLE);
  });

  it('has no jumps at the phase boundaries', () => {
    // 0.15 is where the drop ends and 0.85 is where the lift starts; the angle must be continuous across both.
    for (const boundary of [0.15, 0.85]) {
      expect(Math.abs(armAngle(boundary + 1e-6) - armAngle(boundary - 1e-6))).toBeLessThan(1e-3);
    }
  });
});

// The balloon in the bucket grows in as the reload completes.
describe('loadedBalloonScale', () => {
  it('is empty after firing and full when ready', () => {
    expect(loadedBalloonScale(0)).toBe(0);
    expect(loadedBalloonScale(1)).toBe(1);
  });

  it('never shrinks while reloading', () => {
    // Sweep progress from 0 to 1 and check the scale never drops below its previous value.
    let previous = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      const scale = loadedBalloonScale(p);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });
});
