import { describe, expect, it } from 'vitest';
import {
  ARM_LOWERED_ANGLE,
  ARM_READY_ANGLE,
  ARM_RELEASE_ANGLE,
  armAngle,
  loadedBalloonScale,
  reloadProgress,
} from './reload';

describe('reloadProgress', () => {
  it('runs from 0 (just fired) to 1 (ready)', () => {
    expect(reloadProgress(700, 700)).toBe(0);
    expect(reloadProgress(350, 700)).toBeCloseTo(0.5);
    expect(reloadProgress(0, 700)).toBe(1);
  });

  it('clamps out-of-range cooldowns', () => {
    expect(reloadProgress(900, 700)).toBe(0);
    expect(reloadProgress(-10, 700)).toBe(1);
    expect(reloadProgress(10, 0)).toBe(1);
  });
});

describe('armAngle', () => {
  it('flings up on release, drops to lowered, and ends ready', () => {
    expect(armAngle(0)).toBeCloseTo(ARM_RELEASE_ANGLE);
    expect(armAngle(0.5)).toBe(ARM_LOWERED_ANGLE);
    expect(armAngle(1)).toBeCloseTo(ARM_READY_ANGLE);
  });

  it('has no jumps at the phase boundaries', () => {
    for (const boundary of [0.15, 0.85]) {
      expect(Math.abs(armAngle(boundary + 1e-6) - armAngle(boundary - 1e-6))).toBeLessThan(1e-3);
    }
  });
});

describe('loadedBalloonScale', () => {
  it('is empty after firing and full when ready', () => {
    expect(loadedBalloonScale(0)).toBe(0);
    expect(loadedBalloonScale(1)).toBe(1);
  });

  it('never shrinks while reloading', () => {
    let previous = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      const scale = loadedBalloonScale(p);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });
});
