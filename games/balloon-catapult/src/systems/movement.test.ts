/**
 * Tests for the reticle movement step and point clamping.
 */
import { describe, expect, it } from 'vitest';
import { clampToBounds, stepReticle } from './movement';

const bounds = { left: 0, top: 0, right: 100, bottom: 100 }; // a 100 x 100 play area

// The reticle moves by speed * frame time, normalised for diagonals and limited to the play area.
describe('stepReticle', () => {
  it('moves by speed * delta', () => {
    // 100 px/s for 100 ms is 10 px.
    const next = stepReticle({ x: 50, y: 50 }, { x: 1, y: 0 }, 100, 100, bounds);
    expect(next).toEqual({ x: 60, y: 50 });
  });

  it('does not move faster diagonally', () => {
    // The bounds are widened so nothing is clamped; a full second at 100 px/s must cover exactly 100 px.
    const next = stepReticle({ x: 50, y: 50 }, { x: 1, y: 1 }, 100, 1000, { ...bounds, right: 500, bottom: 500 });
    expect(Math.hypot(next.x - 50, next.y - 50)).toBeCloseTo(100);
  });

  it('keeps partial stick input proportional', () => {
    // Half deflection travels half the distance: 50 + 0.5 * 100 = 100.
    const next = stepReticle({ x: 50, y: 50 }, { x: 0.5, y: 0 }, 100, 1000, { ...bounds, right: 500 });
    expect(next.x).toBeCloseTo(100);
  });

  it('clamps to bounds', () => {
    // Heading up and right from near the top-right corner would leave the area, so it stops at the corner.
    expect(stepReticle({ x: 99, y: 1 }, { x: 1, y: -1 }, 1000, 1000, bounds)).toEqual({ x: 100, y: 0 });
  });
});

// Points outside the rectangle are pulled to its nearest edge.
describe('clampToBounds', () => {
  it('pulls outside points to the nearest edge', () => {
    expect(clampToBounds({ x: -5, y: 250 }, bounds)).toEqual({ x: 0, y: 100 });
  });
});
