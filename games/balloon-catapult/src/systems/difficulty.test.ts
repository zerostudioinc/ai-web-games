/**
 * Tests for the difficulty table: bomb speeds, lane choice and the difficulty type guard.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, bombLanes, bombSpeed, isDifficulty } from './difficulty';

// Bomb speed starts at a difficulty-specific value and rises by a fixed step every wave.
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
    // Compare each difficulty with the next-harder one, for every wave of a game.
    for (let wave = 1; wave <= 5; wave++) {
      for (let i = 1; i < DIFFICULTIES.length; i++) {
        expect(bombSpeed(DIFFICULTIES[i - 1], wave)).toBeLessThan(bombSpeed(DIFFICULTIES[i], wave));
      }
    }
  });
});

// Only Very Easy restricts which lanes bombs walk down.
describe('bombLanes', () => {
  it('sends very easy bombs down only the middle lane(s)', () => {
    expect(bombLanes('veryEasy', 3)).toEqual([1]);
    expect(bombLanes('veryEasy', 4)).toEqual([1, 2]);
  });

  it('uses every lane on every other difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(bombLanes(difficulty, 3)).toEqual([0, 1, 2]);
      expect(bombLanes(difficulty, 4)).toEqual([0, 1, 2, 3]);
    }
  });
});

// The guard must reject anything that is not a known difficulty id.
describe('isDifficulty', () => {
  it('accepts only the known difficulties', () => {
    for (const difficulty of DIFFICULTIES) expect(isDifficulty(difficulty)).toBe(true);
    expect(isDifficulty('insane')).toBe(false);
    expect(isDifficulty(undefined)).toBe(false);
  });
});
