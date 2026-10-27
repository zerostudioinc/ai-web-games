/**
 * Scoring rules and the saved top-three high-score list kept per difficulty.
 */
import type { Difficulty } from './difficulty';

/** Points awarded for each bomb destroyed by a balloon. */
export const POINTS_PER_BOMB = 1;
/** How many high scores are kept per difficulty. */
export const TOP_SCORE_COUNT = 3;

/**
 * Storage key under which one difficulty's top scores are saved.
 *
 * @param difficulty - The difficulty whose list is addressed.
 * @returns The localStorage key.
 */
export const topScoresKey = (difficulty: Difficulty): string => `balloon-catapult:top-scores:${difficulty}`;

/** The part of the Web Storage API used here, so tests can pass an in-memory fake. */
export interface ScoreStorage {
  getItem(key: string): string | null; // the stored text for `key`, or null when nothing is saved
  setItem(key: string, value: string): void; // saves `value` under `key`; may throw (e.g. quota exceeded)
}

/**
 * Gets the browser's localStorage. It can throw (blocked cookies, private mode), so reaching for it is guarded.
 *
 * @returns The storage, or undefined when it is unavailable.
 */
function browserStorage(): ScoreStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Loads a difficulty's saved top scores, ignoring missing, corrupt or inaccessible storage.
 *
 * @param difficulty - Which difficulty's list to load.
 * @param storage - Where to read from; defaults to the browser's localStorage.
 * @returns Valid scores, highest first, at most `TOP_SCORE_COUNT` entries (empty when nothing usable is saved).
 */
export function loadTopScores(difficulty: Difficulty, storage: ScoreStorage | undefined = browserStorage()): number[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(topScoresKey(difficulty)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Keep only positive finite numbers so junk in storage cannot break the list.
    return parsed
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .sort((a, b) => b - a)
      .slice(0, TOP_SCORE_COUNT);
  } catch {
    return [];
  }
}

/**
 * The highest saved score for a difficulty.
 *
 * @param difficulty - Which difficulty's list to read.
 * @param storage - Where to read from; undefined falls back to the browser's localStorage.
 * @returns The best score, or 0 when none is saved.
 */
export const bestScore = (difficulty: Difficulty, storage?: ScoreStorage): number => loadTopScores(difficulty, storage)[0] ?? 0;

/** Outcome of recording a finished game's score. */
export interface RecordedScore {
  top: number[]; // the top list after recording, highest first
  rank: number | null; // 0-based position in the top list, or null if it did not make it
}

/**
 * Adds `score` to the difficulty's top list if it qualifies. A tie ranks below existing equal scores.
 *
 * @param difficulty - Which difficulty's list to update.
 * @param score - The finished game's score; 0 or less never qualifies.
 * @param storage - Where to read and save the list; defaults to the browser's localStorage.
 * @returns The resulting top list and the rank earned (null when the score did not make the list).
 */
export function recordScore(difficulty: Difficulty, score: number, storage: ScoreStorage | undefined = browserStorage()): RecordedScore {
  const top = loadTopScores(difficulty, storage);
  if (score <= 0) return { top, rank: null };

  // The new score slots in above the first entry it strictly beats, so ties rank below equal scores.
  let rank = top.findIndex((existing) => score > existing);
  // It beat nobody: it only qualifies if there is still room at the end of the list.
  if (rank === -1) rank = top.length;
  if (rank >= TOP_SCORE_COUNT) return { top, rank: null };

  // Insert at `rank` and drop whatever falls off the end of the list.
  const updated = [...top.slice(0, rank), score, ...top.slice(rank)].slice(0, TOP_SCORE_COUNT);
  try {
    storage?.setItem(topScoresKey(difficulty), JSON.stringify(updated));
  } catch {
    // Persisting is best-effort; the in-memory result still counts for this session.
  }
  return { top: updated, rank };
}
