import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, bombSpeed, isDifficulty } from './difficulty';

describe('bombSpeed', () => {
  it('starts at 36, 60 and 84 px/s in wave 1', () => {
    expect(bombSpeed('easy', 1)).toBe(36);
    expect(bombSpeed('normal', 1)).toBe(60);
    expect(bombSpeed('hard', 1)).toBe(84);
  });

  it('adds 12, 18 and 24 px/s each wave', () => {
    expect(bombSpeed('easy', 2) - bombSpeed('easy', 1)).toBe(12);
    expect(bombSpeed('normal', 5) - bombSpeed('normal', 4)).toBe(18);
    expect(bombSpeed('hard', 3) - bombSpeed('hard', 2)).toBe(24);
  });

  it('orders difficulties from slowest to fastest in every wave', () => {
    for (let wave = 1; wave <= 5; wave++) {
      expect(bombSpeed('easy', wave)).toBeLessThan(bombSpeed('normal', wave));
      expect(bombSpeed('normal', wave)).toBeLessThan(bombSpeed('hard', wave));
    }
  });
});

describe('isDifficulty', () => {
  it('accepts only the known difficulties', () => {
    for (const difficulty of DIFFICULTIES) expect(isDifficulty(difficulty)).toBe(true);
    expect(isDifficulty('insane')).toBe(false);
    expect(isDifficulty(undefined)).toBe(false);
  });
});
