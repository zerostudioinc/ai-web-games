/**
 * Tests for level scoring and its display: par time, speed multiplier, level points per difficulty, and the clock and score formats.
 */
import { describe, expect, it } from 'vitest';
import { MIN_PAR_MS, MIN_TIME_FACTOR, formatScore, formatTime, levelScore, parTimeMs, timeFactor } from './score';

// Par time is 1 s per step of the route, but never below MIN_PAR_MS (10 s).
describe('parTimeMs', () => {
  it('grows with the length of the route but never drops below the floor', () => {
    expect(parTimeMs(1)).toBe(MIN_PAR_MS); // 1 step would be 1 s, so the 10 s floor applies
    expect(parTimeMs(120)).toBeGreaterThan(parTimeMs(60)); // 120 s against 60 s, both above the floor
  });
});

// The speed multiplier is 1.5x for an instant escape, 1x at par, then fades as 1 / (time ratio) down to MIN_TIME_FACTOR (0.2).
describe('timeFactor', () => {
  it('is 1.5 for an instant escape, 1 at par and fades after that', () => {
    // Par is 60 s in these cases.
    expect(timeFactor(0, 60_000)).toBeCloseTo(1.5); // instant escape: 1 + 0.5 x (1 - 0) = 1.5
    expect(timeFactor(30_000, 60_000)).toBeCloseTo(1.25); // half of par: 1 + 0.5 x (1 - 0.5) = 1.25
    expect(timeFactor(60_000, 60_000)).toBeCloseTo(1); // exactly par: no bonus
    expect(timeFactor(120_000, 60_000)).toBeCloseTo(0.5); // twice par: 1 / 2 = 0.5
  });

  it('never drops below the floor', () => {
    expect(timeFactor(60_000_000, 60_000)).toBe(MIN_TIME_FACTOR); // 1000 x par would give 1 / 1000, so the floor applies
  });

  it('never rises as the escape takes longer', () => {
    // Sweep 0 to 10 minutes in 5 s steps (par is 60 s). That spans the bonus, the 1 / ratio fade and the floor,
    // which is reached at 5 x par (300 s).
    let previous = Infinity;
    for (let ms = 0; ms <= 600_000; ms += 5_000) {
      const factor = timeFactor(ms, 60_000);
      expect(factor).toBeLessThanOrEqual(previous);
      previous = factor;
    }
  });
});

// Level points = base x speed factor x difficulty multiplier, rounded; the base is 1000 plus 250 for each level after the first.
describe('levelScore', () => {
  it('pays the base value at par on Normal', () => {
    expect(levelScore(1, 60_000, 60_000, 'normal').points).toBe(1000); // base 1000 x factor 1 x multiplier 1
    expect(levelScore(10, 60_000, 60_000, 'normal').points).toBe(3250); // base 1000 + 9 x 250 = 3250
  });

  it('scores a quicker escape higher', () => {
    const slow = levelScore(3, 120_000, 60_000, 'normal').points; // twice par: base 1500 x 0.5 = 750
    const quick = levelScore(3, 30_000, 60_000, 'normal').points; // half of par: base 1500 x 1.25 = 1875
    expect(quick).toBeGreaterThan(slow);
  });

  it('applies the Hard multiplier', () => {
    const normal = levelScore(4, 60_000, 60_000, 'normal'); // level 4 at par: base 1750 x 1 = 1750 points
    const hard = levelScore(4, 60_000, 60_000, 'hard'); // the same run on Hard
    expect(hard.difficultyMultiplier).toBe(1.5);
    expect(hard.points).toBe(Math.round(normal.points * 1.5)); // 1750 x 1.5 = 2625
  });

  it('rounds to whole points and reports the breakdown', () => {
    const result = levelScore(2, 70_001, 60_000, 'normal'); // just past par (ratio about 1.167), so the factor is a long fraction
    expect(Number.isInteger(result.points)).toBe(true);
    expect(result.base).toBe(1250); // level 2: 1000 + 250
    expect(result.points).toBe(Math.round(result.base * result.timeFactor * result.difficultyMultiplier)); // the product, rounded
  });
});

// Clock text is m:ss.t: minutes, zero-padded seconds and tenths of a second.
describe('formatTime', () => {
  it('formats as m:ss.t', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(65_300)).toBe('1:05.3'); // 65.3 s = 1 min 5.3 s
    expect(formatTime(600_000)).toBe('10:00.0'); // 10 minutes: the minutes part grows past one digit
  });

  it('treats negative time as zero', () => {
    expect(formatTime(-50)).toBe('0:00.0');
  });
});

// Scores are shown as whole numbers with a comma between each group of three digits.
describe('formatScore', () => {
  it('adds thousands separators', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(12_450)).toBe('12,450');
    expect(formatScore(1_234_567)).toBe('1,234,567');
  });
});
