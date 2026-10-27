import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from './difficulty';
import { POINTS_PER_BOMB, bestScore, loadTopScores, recordScore, topScoresKey, type ScoreStorage } from './score';

const memoryStorage = (initial: Record<string, string> = {}): ScoreStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

describe('top scores', () => {
  it('is empty when nothing is stored or the value is junk', () => {
    expect(loadTopScores('normal', memoryStorage())).toEqual([]);
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: 'abc' }))).toEqual([]);
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '{"a":1}' }))).toEqual([]);
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '[5,"x",-2,null]' }))).toEqual([5]);
  });

  it('keeps the best three, highest first', () => {
    const storage = memoryStorage();
    for (const score of [10, 40, 25, 30, 5]) recordScore('hard', score, storage);
    expect(loadTopScores('hard', storage)).toEqual([40, 30, 25]);
    expect(bestScore('hard', storage)).toBe(40);
  });

  it('reports the rank a score earned, or null when it misses the top three', () => {
    const storage = memoryStorage();
    expect(recordScore('easy', 20, storage).rank).toBe(0);
    expect(recordScore('easy', 30, storage).rank).toBe(0);
    expect(recordScore('easy', 25, storage).rank).toBe(1);
    expect(recordScore('easy', 10, storage).rank).toBeNull();
    expect(recordScore('easy', 22, storage).rank).toBe(2);
    expect(loadTopScores('easy', storage)).toEqual([30, 25, 22]);
  });

  it('ranks a tie below the existing equal score and ignores a score of 0', () => {
    const storage = memoryStorage();
    recordScore('normal', 20, storage);
    expect(recordScore('normal', 20, storage).rank).toBe(1);
    expect(recordScore('normal', 0, storage)).toEqual({ top: [20, 20], rank: null });
  });

  it('keeps each difficulty separate', () => {
    const storage = memoryStorage();
    recordScore('veryEasy', 50, storage);
    recordScore('hard', 7, storage);
    expect(loadTopScores('veryEasy', storage)).toEqual([50]);
    expect(loadTopScores('hard', storage)).toEqual([7]);
    for (const difficulty of DIFFICULTIES.filter((d) => d !== 'veryEasy' && d !== 'hard')) {
      expect(loadTopScores(difficulty, storage)).toEqual([]);
    }
  });

  it('survives storage that throws', () => {
    const broken: ScoreStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadTopScores('normal', broken)).toEqual([]);
    expect(recordScore('normal', 120, broken).top).toEqual([120]);
  });
});

describe('scoring', () => {
  it('awards 1 point per bomb', () => {
    expect(POINTS_PER_BOMB).toBe(1);
  });
});
