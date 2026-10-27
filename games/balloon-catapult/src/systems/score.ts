import type { Difficulty } from './difficulty';

export const POINTS_PER_BOMB = 1;
export const TOP_SCORE_COUNT = 3;

export const topScoresKey = (difficulty: Difficulty): string => `balloon-catapult:top-scores:${difficulty}`;

export interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// localStorage can throw (blocked cookies, private mode), so reaching for it is guarded.
function browserStorage(): ScoreStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Highest first, at most TOP_SCORE_COUNT entries. */
export function loadTopScores(difficulty: Difficulty, storage: ScoreStorage | undefined = browserStorage()): number[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(topScoresKey(difficulty)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .sort((a, b) => b - a)
      .slice(0, TOP_SCORE_COUNT);
  } catch {
    return [];
  }
}

export const bestScore = (difficulty: Difficulty, storage?: ScoreStorage): number => loadTopScores(difficulty, storage)[0] ?? 0;

export interface RecordedScore {
  top: number[];
  rank: number | null; // 0-based position in the top list, or null if it did not make it
}

/** Adds `score` to the difficulty's top list if it qualifies. A tie ranks below existing equal scores. */
export function recordScore(difficulty: Difficulty, score: number, storage: ScoreStorage | undefined = browserStorage()): RecordedScore {
  const top = loadTopScores(difficulty, storage);
  if (score <= 0) return { top, rank: null };

  let rank = top.findIndex((existing) => score > existing);
  if (rank === -1) rank = top.length;
  if (rank >= TOP_SCORE_COUNT) return { top, rank: null };

  const updated = [...top.slice(0, rank), score, ...top.slice(rank)].slice(0, TOP_SCORE_COUNT);
  try {
    storage?.setItem(topScoresKey(difficulty), JSON.stringify(updated));
  } catch {
    // Persisting is best-effort; the in-memory result still counts for this session.
  }
  return { top: updated, rank };
}
