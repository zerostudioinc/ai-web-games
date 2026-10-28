/**
 * Tests for the difficulty table: bomb speeds, lane choice and the difficulty type guard.
 */
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, laneCountFor, playerLane } from '../config';
import { DIFFICULTIES, bombLanes, bombSpeed, isDifficulty, type Difficulty } from './difficulty';
import { INTERMISSION_MS, WaveDirector, bombsInWave, spawnIntervalMs } from './waves';

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

// Lanes (0-based) that very easy bombs use for each player count: lanes 2 and 3 when solo, every lane otherwise.
const VERY_EASY_LANES: Record<number, number[]> = {
  1: [1, 2],
  2: [0, 1, 2, 3],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
};

/**
 * Bomb lanes for a game, with the field size derived from the player count the way PlayScene does.
 *
 * @param difficulty - The selected difficulty.
 * @param players - Number of players (1 to 4).
 * @returns 0-based lane indices bombs may spawn in.
 */
const lanesFor = (difficulty: Difficulty, players: number): number[] => bombLanes(difficulty, players, laneCountFor(players));

// Only a one-player Very Easy game restricts which lanes bombs walk down; everyone else faces every lane.
describe('bombLanes', () => {
  it('sends solo very easy bombs down lanes 2 and 3 only, which includes the catapult lane', () => {
    expect(lanesFor('veryEasy', 1)).toEqual([1, 2]);
    expect(lanesFor('veryEasy', 1)).toContain(playerLane(0, 1));
  });

  it('uses every lane on very easy once there are two or more players', () => {
    expect(lanesFor('veryEasy', 2)).toEqual([0, 1, 2, 3]);
    expect(lanesFor('veryEasy', 3)).toEqual([0, 1, 2]);
    expect(lanesFor('veryEasy', 4)).toEqual([0, 1, 2, 3]);
  });

  it('uses every lane on every other difficulty, whatever the player count', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(lanesFor(difficulty, 1)).toEqual([0, 1, 2]);
      expect(lanesFor(difficulty, 2)).toEqual([0, 1, 2, 3]);
      expect(lanesFor(difficulty, 3)).toEqual([0, 1, 2]);
      expect(lanesFor(difficulty, 4)).toEqual([0, 1, 2, 3]);
    }
  });

  it('tells a solo game from a three-player game even though both have 3 lanes', () => {
    expect(bombLanes('veryEasy', 1, 3)).toEqual([1, 2]);
    expect(bombLanes('veryEasy', 3, 3)).toEqual([0, 1, 2]);
  });

  it('only returns lanes that exist on the field', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let players = 1; players <= MAX_PLAYERS; players++) {
        const laneCount = laneCountFor(players);
        for (const lane of lanesFor(difficulty, players)) {
          expect(lane).toBeGreaterThanOrEqual(0);
          expect(lane).toBeLessThan(laneCount);
        }
      }
    }
  });

  it('returns a copy, so callers cannot change the difficulty table', () => {
    lanesFor('veryEasy', 1).push(0);
    expect(lanesFor('veryEasy', 1)).toEqual([1, 2]);
  });
});

// The lanes feed the wave director exactly as PlayScene wires them, so a whole wave must really use them.
describe('very easy wave', () => {
  it('spawns bombs only in the lanes allowed for the player count, and uses all of them', () => {
    for (let players = 1; players <= MAX_PLAYERS; players++) {
      let roll = 0;
      // A fake rng that steps through varied values in [0, 1), so every allowed lane gets picked.
      const director = new WaveDirector(lanesFor('veryEasy', players), () => {
        roll = (roll + 0.37) % 1;
        return roll;
      });
      director.update(INTERMISSION_MS, 0);

      const lanes: number[] = [];
      for (let i = 0; i < 1000 && director.phase === 'spawning'; i++) {
        lanes.push(...director.update(spawnIntervalMs(1), 0).spawnLanes);
      }

      expect(lanes).toHaveLength(bombsInWave(1));
      expect([...new Set(lanes)].sort((a, b) => a - b)).toEqual(VERY_EASY_LANES[players]);
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
