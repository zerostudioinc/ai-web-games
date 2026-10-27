import { describe, expect, it } from 'vitest';
import { MIN_PAR_MS, MIN_TIME_FACTOR, formatScore, formatTime, levelScore, parTimeMs, timeFactor } from './score';

describe('parTimeMs', () => {
  it('grows with the length of the route but never drops below the floor', () => {
    expect(parTimeMs(1)).toBe(MIN_PAR_MS);
    expect(parTimeMs(120)).toBeGreaterThan(parTimeMs(60));
  });
});

describe('timeFactor', () => {
  it('is 1.5 for an instant escape, 1 at par and fades after that', () => {
    expect(timeFactor(0, 60_000)).toBeCloseTo(1.5);
    expect(timeFactor(30_000, 60_000)).toBeCloseTo(1.25);
    expect(timeFactor(60_000, 60_000)).toBeCloseTo(1);
    expect(timeFactor(120_000, 60_000)).toBeCloseTo(0.5);
  });

  it('never drops below the floor', () => {
    expect(timeFactor(60_000_000, 60_000)).toBe(MIN_TIME_FACTOR);
  });

  it('never rises as the escape takes longer', () => {
    let previous = Infinity;
    for (let ms = 0; ms <= 600_000; ms += 5_000) {
      const factor = timeFactor(ms, 60_000);
      expect(factor).toBeLessThanOrEqual(previous);
      previous = factor;
    }
  });
});

describe('levelScore', () => {
  it('pays the base value at par on Normal', () => {
    expect(levelScore(1, 60_000, 60_000, 'normal').points).toBe(1000);
    expect(levelScore(10, 60_000, 60_000, 'normal').points).toBe(3250);
  });

  it('scores a quicker escape higher', () => {
    const slow = levelScore(3, 120_000, 60_000, 'normal').points;
    const quick = levelScore(3, 30_000, 60_000, 'normal').points;
    expect(quick).toBeGreaterThan(slow);
  });

  it('applies the Hard multiplier', () => {
    const normal = levelScore(4, 60_000, 60_000, 'normal');
    const hard = levelScore(4, 60_000, 60_000, 'hard');
    expect(hard.difficultyMultiplier).toBe(1.5);
    expect(hard.points).toBe(Math.round(normal.points * 1.5));
  });

  it('rounds to whole points and reports the breakdown', () => {
    const result = levelScore(2, 70_001, 60_000, 'normal');
    expect(Number.isInteger(result.points)).toBe(true);
    expect(result.base).toBe(1250);
    expect(result.points).toBe(Math.round(result.base * result.timeFactor * result.difficultyMultiplier));
  });
});

describe('formatTime', () => {
  it('formats as m:ss.t', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(65_300)).toBe('1:05.3');
    expect(formatTime(600_000)).toBe('10:00.0');
  });

  it('treats negative time as zero', () => {
    expect(formatTime(-50)).toBe('0:00.0');
  });
});

describe('formatScore', () => {
  it('adds thousands separators', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(12_450)).toBe('12,450');
    expect(formatScore(1_234_567)).toBe('1,234,567');
  });
});
