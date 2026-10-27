/**
 * Tests for the ease-out-back curve used by pop-in animations: its end points, its overshoot and its clamping.
 */
import { describe, expect, it } from 'vitest';
import { easeOutBack } from './ease';

// The curve runs from 0 to 1, overshoots 1 on the way for a springy pop, and clamps its input to 0..1.
describe('easeOutBack', () => {
  it('runs from 0 to 1', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  it('overshoots past 1 on the way', () => {
    expect(easeOutBack(0.7)).toBeGreaterThan(1); // about 1.08 here; the peak is about 1.1, near t = 0.58
  });

  it('clamps input outside 0..1', () => {
    expect(easeOutBack(-3)).toBeCloseTo(0); // below the range behaves like t = 0
    expect(easeOutBack(5)).toBeCloseTo(1); // above the range behaves like t = 1
  });
});
