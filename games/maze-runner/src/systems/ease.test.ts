import { describe, expect, it } from 'vitest';
import { easeOutBack } from './ease';

describe('easeOutBack', () => {
  it('runs from 0 to 1', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  it('overshoots past 1 on the way', () => {
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
  });

  it('clamps input outside 0..1', () => {
    expect(easeOutBack(-3)).toBeCloseTo(0);
    expect(easeOutBack(5)).toBeCloseTo(1);
  });
});
