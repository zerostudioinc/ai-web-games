// Top-5 score tables, one per difficulty, kept in localStorage.
import type { Difficulty } from './difficulty';

export const TOP_SCORE_COUNT = 5;

export const topScoresKey = (difficulty: Difficulty): string => `maze-runner:top-scores:${difficulty}`;

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

/** Highest first, at most TOP_SCORE_COUNT entries. Anything unreadable or malformed is ignored. */
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
  /** 0-based position in the top list, or null if the score did not make it. */
  rank: number | null;
}

/** Adds `score` to the difficulty's table if it qualifies. A tie ranks below the existing equal scores. */
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
    // Saving is best-effort; the result still counts for this session.
  }
  return { top: updated, rank };
}
