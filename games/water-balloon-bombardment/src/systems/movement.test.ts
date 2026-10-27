import { describe, expect, it } from 'vitest';
import { clampToBounds, stepReticle } from './movement';

const bounds = { left: 0, top: 0, right: 100, bottom: 100 };

describe('stepReticle', () => {
  it('moves by speed * delta', () => {
    const next = stepReticle({ x: 50, y: 50 }, { x: 1, y: 0 }, 100, 100, bounds);
    expect(next).toEqual({ x: 60, y: 50 });
  });

  it('does not move faster diagonally', () => {
    const next = stepReticle({ x: 50, y: 50 }, { x: 1, y: 1 }, 100, 1000, { ...bounds, right: 500, bottom: 500 });
    expect(Math.hypot(next.x - 50, next.y - 50)).toBeCloseTo(100);
  });

  it('keeps partial stick input proportional', () => {
    const next = stepReticle({ x: 50, y: 50 }, { x: 0.5, y: 0 }, 100, 1000, { ...bounds, right: 500 });
    expect(next.x).toBeCloseTo(100);
  });

  it('clamps to bounds', () => {
    expect(stepReticle({ x: 99, y: 1 }, { x: 1, y: -1 }, 1000, 1000, bounds)).toEqual({ x: 100, y: 0 });
  });
});

describe('clampToBounds', () => {
  it('pulls outside points to the nearest edge', () => {
    expect(clampToBounds({ x: -5, y: 250 }, bounds)).toEqual({ x: 0, y: 100 });
  });
});
