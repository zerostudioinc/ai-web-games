/**
 * Tests for the saved top-five score tables: loading, ranking, trimming and coping with bad storage.
 */
import { describe, expect, it } from 'vitest';
import { TOP_SCORE_COUNT, bestScore, insertScore, loadTopScores, recordScore, recordScores, topScoresKey, type ScoreStorage } from './highScores';

/**
 * In-memory stand-in for localStorage.
 *
 * @param initial - Key/value pairs the storage starts with, keyed the way the game saves them.
 * @returns A `ScoreStorage` backed by a copy of `initial`, so a test never touches the real browser storage.
 */
function memoryStorage(initial: Record<string, string> = {}): ScoreStorage {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

// Loading returns only valid positive scores, highest first, and treats unreadable data as an empty table.
describe('loadTopScores', () => {
  it('is empty before anything is saved', () => {
    expect(loadTopScores('normal', memoryStorage())).toEqual([]);
  });

  it('ignores corrupt or malformed data', () => {
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '{not json' }))).toEqual([]); // not valid JSON
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '{"a":1}' }))).toEqual([]); // valid JSON, but an object rather than an array
    expect(loadTopScores('normal', memoryStorage({ [topScoresKey('normal')]: '[5,"x",null,-3,400]' }))).toEqual([400, 5]); // only the positive numbers survive, highest first
  });
});

// Recording a score slots it in by rank, keeps at most five per difficulty, and still reports the result if saving fails.
describe('recordScore', () => {
  it('keeps scores sorted highest first and reports the rank', () => {
    const storage = memoryStorage();
    expect(recordScore('normal', 500, storage).rank).toBe(0); // the first score takes first place (rank is 0-based)
    expect(recordScore('normal', 900, storage).rank).toBe(0); // beats 500
    expect(recordScore('normal', 700, storage).rank).toBe(1); // lands between 900 and 500
    expect(loadTopScores('normal', storage)).toEqual([900, 700, 500]);
  });

  it('keeps only the top five and drops the lowest', () => {
    const storage = memoryStorage();
    for (const score of [100, 200, 300, 400, 500]) recordScore('hard', score, storage);

    // The table is full: 500, 400, 300, 200, 100. A 350 beats 300 and below, so it ranks third and pushes 100 off.
    const beaten = recordScore('hard', 350, storage);
    expect(beaten.rank).toBe(2);
    expect(beaten.top).toEqual([500, 400, 350, 300, 200]);
    expect(beaten.top).toHaveLength(TOP_SCORE_COUNT);
  });

  it('does not rank a score that misses the table', () => {
    const storage = memoryStorage();
    for (const score of [100, 200, 300, 400, 500]) recordScore('hard', score, storage);

    // The table is full and 50 is below its lowest score (100), so it does not make the table.
    const missed = recordScore('hard', 50, storage);
    expect(missed.rank).toBeNull();
    expect(loadTopScores('hard', storage)).toEqual([500, 400, 300, 200, 100]);
  });

  it('ranks a tie below the existing equal score', () => {
    const storage = memoryStorage();
    recordScore('normal', 600, storage);
    expect(recordScore('normal', 600, storage).rank).toBe(1); // the earlier 600 keeps first place
  });

  it('ignores zero and negative scores', () => {
    const storage = memoryStorage();
    expect(recordScore('normal', 0, storage).rank).toBeNull();
    expect(recordScore('normal', -10, storage).rank).toBeNull();
    expect(loadTopScores('normal', storage)).toEqual([]);
  });

  it('keeps a separate table for each difficulty', () => {
    const storage = memoryStorage();
    recordScore('easy', 500, storage);
    recordScore('normal', 800, storage);
    recordScore('hard', 300, storage);
    recordScore('veryHard', 200, storage);
    expect(bestScore('easy', storage)).toBe(500);
    expect(bestScore('normal', storage)).toBe(800);
    expect(bestScore('hard', storage)).toBe(300);
    expect(bestScore('veryHard', storage)).toBe(200);
  });

  it('still reports the result when saving fails', () => {
    // Empty storage that refuses every save, as when the quota is exceeded.
    const failing: ScoreStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(recordScore('normal', 250, failing)).toEqual({ top: [250], rank: 0 }); // the score still counts for this session
  });
});

// The best score is the highest saved score, or 0 when nothing is saved.
describe('bestScore', () => {
  it('is 0 when there are no scores', () => {
    expect(bestScore('normal', memoryStorage())).toBe(0);
  });
});

// Inserting works on a table in memory: it ranks the score and returns the new table without touching the old one or any storage.
describe('insertScore', () => {
  it('slots the score in by rank and leaves the old table unchanged', () => {
    const table = [900, 500];
    expect(insertScore(table, 700)).toEqual({ top: [900, 700, 500], rank: 1 });
    expect(table).toEqual([900, 500]);
  });

  it('ranks a tie below the equal score, and drops the lowest of a full table', () => {
    expect(insertScore([600], 600)).toEqual({ top: [600, 600], rank: 1 });
    expect(insertScore([500, 400, 300, 200, 100], 250)).toEqual({ top: [500, 400, 300, 250, 200], rank: 3 });
  });

  it('does not rank a score that misses the table', () => {
    expect(insertScore([500, 400, 300, 200, 100], 100).rank).toBeNull(); // ties the last place, which the earlier score keeps
    expect(insertScore([], 0).rank).toBeNull();
  });
});

// Both players of a versus match are recorded together; the better score goes in first so each rank reported is final.
describe('recordScores', () => {
  it('reports each rank as the place it finally holds when both scores qualify', () => {
    const storage = memoryStorage();
    recordScore('normal', 1000, storage);
    recordScore('normal', 500, storage);
    // Player two's 900 beats player one's 700, whatever the order they are given in.
    const [one, two] = recordScores('normal', [700, 900], storage);
    expect(two.rank).toBe(1);
    expect(one.rank).toBe(2);
    expect(loadTopScores('normal', storage)).toEqual([1000, 900, 700, 500]);
  });

  it('ranks equal scores in player order', () => {
    const [one, two] = recordScores('hard', [800, 800], memoryStorage());
    expect(one.rank).toBe(0);
    expect(two.rank).toBe(1);
  });

  it('records only the score that makes a full table, and pushes the lowest entries out', () => {
    const storage = memoryStorage();
    for (const score of [500, 400, 300, 200, 100]) recordScore('easy', score, storage);
    const [one, two] = recordScores('easy', [450, 50], storage);
    expect(one.rank).toBe(1);
    expect(two.rank).toBeNull(); // below the lowest score that is left
    expect(loadTopScores('easy', storage)).toEqual([500, 450, 400, 300, 200]);

    const [first, second] = recordScores('easy', [600, 550], storage);
    expect([first.rank, second.rank]).toEqual([0, 1]);
    expect(loadTopScores('easy', storage)).toEqual([600, 550, 500, 450, 400]);
  });

  it('writes nothing when nobody makes the table', () => {
    const storage = memoryStorage();
    const written: string[] = [];
    const spy: ScoreStorage = { getItem: (key) => storage.getItem(key), setItem: (key) => written.push(key) };
    expect(recordScores('normal', [0, -5], spy).map((entry) => entry.rank)).toEqual([null, null]);
    expect(written).toEqual([]);
  });

  it('still ranks the scores against each other when saving fails', () => {
    const failing: ScoreStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    const [one, two] = recordScores('normal', [10, 20], failing);
    expect(two.rank).toBe(0);
    expect(one.rank).toBe(1); // a second read of the unsaved table would have said 0 for both
  });
});
