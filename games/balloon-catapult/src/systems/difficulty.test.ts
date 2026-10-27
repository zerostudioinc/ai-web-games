import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_SETTINGS, bombSpeed, isDifficulty } from './difficulty';

describe('bombSpeed', () => {
  it('starts at 24, 36, 60 and 84 px/s in wave 1', () => {
    expect(bombSpeed('veryEasy', 1)).toBe(24);
    expect(bombSpeed('easy', 1)).toBe(36);
    expect(bombSpeed('normal', 1)).toBe(60);
    expect(bombSpeed('hard', 1)).toBe(84);
  });

  it('adds 6, 12, 18 and 24 px/s each wave', () => {
    expect(bombSpeed('veryEasy', 2) - bombSpeed('veryEasy', 1)).toBe(6);
    expect(bombSpeed('easy', 3) - bombSpeed('easy', 2)).toBe(12);
    expect(bombSpeed('normal', 5) - bombSpeed('normal', 4)).toBe(18);
    expect(bombSpeed('hard', 3) - bombSpeed('hard', 2)).toBe(24);
  });

  it('orders difficulties from slowest to fastest in every wave', () => {
    for (let wave = 1; wave <= 5; wave++) {
      for (let i = 1; i < DIFFICULTIES.length; i++) {
        expect(bombSpeed(DIFFICULTIES[i - 1], wave)).toBeLessThan(bombSpeed(DIFFICULTIES[i], wave));
      }
    }
  });
});

describe('lanes', () => {
  it('sends very easy bombs down the middle lanes (2 and 3) only', () => {
    expect(DIFFICULTY_SETTINGS.veryEasy.lanes).toEqual([1, 2]);
  });

  it('uses all four lanes on every other difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(DIFFICULTY_SETTINGS[difficulty].lanes).toEqual([0, 1, 2, 3]);
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
