import { describe, expect, it } from 'vitest';
import { TOP_SCORE_COUNT, bestScore, loadTopScores, recordScore, topScoresKey, type ScoreStorage } from './highScores';

/** In-memory stand-in for localStorage. */
function memoryStorage(initial: Record<string, string> = {}): ScoreStorage {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('loadTopScores', () => {
  it('is empty before anything is saved', () => {
    expect(loadTopScores('normal', memoryStorage())).toEqual([]);
  });

  it('ignores corrupt or malformed data', () => {
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '{not json' }))).toEqual([]);
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '{"a":1}' }))).toEqual([]);
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '[5,"x",null,-3,400]' }))).toEqual([400, 5]);
  });
});

describe('recordScore', () => {
  it('keeps scores sorted highest first and reports the rank', () => {
    const storage = memoryStorage();
    expect(recordScore('normal', 500, storage).rank).toBe(0);
    expect(recordScore('normal', 900, storage).rank).toBe(0);
    expect(recordScore('normal', 700, storage).rank).toBe(1);
    expect(loadTopScores('normal', storage)).toEqual([900, 700, 500]);
  });

  it('keeps only the top five and drops the lowest', () => {
    const storage = memoryStorage();
    for (const score of [100, 200, 300, 400, 500]) recordScore('hard', score, storage);

    const beaten = recordScore('hard', 350, storage);
    expect(beaten.rank).toBe(2);
    expect(beaten.top).toEqual([500, 400, 350, 300, 200]);
    expect(beaten.top).toHaveLength(TOP_SCORE_COUNT);
  });

  it('does not rank a score that misses the table', () => {
    const storage = memoryStorage();
    for (const score of [100, 200, 300, 400, 500]) recordScore('hard', score, storage);

    const missed = recordScore('hard', 50, storage);
    expect(missed.rank).toBeNull();
    expect(loadTopScores('hard', storage)).toEqual([500, 400, 300, 200, 100]);
  });

  it('ranks a tie below the existing equal score', () => {
    const storage = memoryStorage();
    recordScore('normal', 600, storage);
    expect(recordScore('normal', 600, storage).rank).toBe(1);
  });

  it('ignores zero and negative scores', () => {
    const storage = memoryStorage();
    expect(recordScore('normal', 0, storage).rank).toBeNull();
    expect(recordScore('normal', -10, storage).rank).toBeNull();
    expect(loadTopScores('normal', storage)).toEqual([]);
  });

  it('keeps a separate table for each difficulty', () => {
    const storage = memoryStorage();
    recordScore('normal', 800, storage);
    recordScore('hard', 300, storage);
    expect(bestScore('normal', storage)).toBe(800);
    expect(bestScore('hard', storage)).toBe(300);
  });

  it('still reports the result when saving fails', () => {
    const failing: ScoreStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(recordScore('normal', 250, failing)).toEqual({ top: [250], rank: 0 });
  });
});

describe('bestScore', () => {
  it('is 0 when there are no scores', () => {
    expect(bestScore('normal', memoryStorage())).toBe(0);
  });
});
