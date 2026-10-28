/**
 * Top-5 score tables, one per difficulty, kept in localStorage.
 */
import type { Difficulty } from './difficulty';

/** How many high scores are kept per difficulty. */
export const TOP_SCORE_COUNT = 5;

/**
 * Storage key under which one difficulty's top scores are saved.
 *
 * @param difficulty - The difficulty whose table is addressed.
 * @returns The localStorage key.
 */
export const topScoresKey = (difficulty: Difficulty): string => `maze-runner:top-scores:${difficulty}`;

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
 * Loads a difficulty's saved top scores. Anything unreadable or malformed is ignored.
 *
 * @param difficulty - Which difficulty's table to load.
 * @param storage - Where to read from; defaults to the browser's localStorage.
 * @returns Valid scores, highest first, at most `TOP_SCORE_COUNT` entries (empty when nothing usable is saved).
 */
export function loadTopScores(difficulty: Difficulty, storage: ScoreStorage | undefined = browserStorage()): number[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(topScoresKey(difficulty)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Keep only positive finite numbers so junk in storage cannot break the table.
    return parsed
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .sort((a, b) => b - a)
      .slice(0, TOP_SCORE_COUNT);
  } catch {
    // Corrupt JSON or storage that refuses to be read: treat it as an empty table.
    return [];
  }
}

/**
 * The highest saved score for a difficulty.
 *
 * @param difficulty - Which difficulty's table to read.
 * @param storage - Where to read from; undefined falls back to the browser's localStorage.
 * @returns The best score, or 0 when none is saved.
 */
export const bestScore = (difficulty: Difficulty, storage?: ScoreStorage): number => loadTopScores(difficulty, storage)[0] ?? 0;

/** Outcome of recording a finished run's score. */
export interface RecordedScore {
  /** The table after recording, highest first. */
  top: number[];
  /** 0-based position in the top list, or null if the score did not make it. */
  rank: number | null;
}

/**
 * Slots `score` into a table without saving anything. A tie ranks below the existing equal scores.
 *
 * @param top - The table so far, highest first; it is left unchanged.
 * @param score - The score to add; 0 or less never qualifies.
 * @returns The table after adding the score, and the rank earned (null when the score did not make the table).
 */
export function insertScore(top: readonly number[], score: number): RecordedScore {
  if (score <= 0) return { top: [...top], rank: null };

  // The new score slots in above the first entry it strictly beats, so ties rank below equal scores.
  let rank = top.findIndex((existing) => score > existing);
  // It beat nobody: it only qualifies if there is still room at the end of the table.
  if (rank === -1) rank = top.length;
  if (rank >= TOP_SCORE_COUNT) return { top: [...top], rank: null };

  // Insert at `rank` and drop whatever falls off the end of the table.
  return { top: [...top.slice(0, rank), score, ...top.slice(rank)].slice(0, TOP_SCORE_COUNT), rank };
}

/**
 * Saves a difficulty's table. Saving is best-effort: a storage that refuses (quota exceeded, blocked) is ignored.
 *
 * @param difficulty - Which difficulty's table to save.
 * @param top - The table to save, highest first.
 * @param storage - Where to save it; undefined saves nothing.
 */
function saveTopScores(difficulty: Difficulty, top: readonly number[], storage: ScoreStorage | undefined): void {
  try {
    storage?.setItem(topScoresKey(difficulty), JSON.stringify(top));
  } catch {
    // The result still counts for this session.
  }
}

/**
 * Adds `score` to the difficulty's table if it qualifies. A tie ranks below the existing equal scores.
 *
 * @param difficulty - Which difficulty's table to update.
 * @param score - The finished run's total score; 0 or less never qualifies.
 * @param storage - Where to read and save the table; defaults to the browser's localStorage.
 * @returns The resulting table and the rank earned (null when the score did not make the table).
 */
export function recordScore(difficulty: Difficulty, score: number, storage: ScoreStorage | undefined = browserStorage()): RecordedScore {
  const recorded = insertScore(loadTopScores(difficulty, storage), score);
  if (recorded.rank !== null) saveTopScores(difficulty, recorded.top, storage);
  return recorded;
}

/**
 * Adds several scores to the difficulty's table in one go, for the players of a versus match. The best score goes in first, so
 * the rank reported for each is the place it finally holds, whatever the other scores do to the table afterwards; equal scores
 * keep their player order. The table is kept in memory between the scores, so they rank against each other even when saving fails.
 *
 * @param difficulty - Which difficulty's table to update.
 * @param scores - The finished runs' total scores, one per player, in player order.
 * @param storage - Where to read and save the table; defaults to the browser's localStorage.
 * @returns The outcome for each score, in the same order as `scores`; each `top` is the table right after that score went in.
 */
export function recordScores(difficulty: Difficulty, scores: readonly number[], storage: ScoreStorage | undefined = browserStorage()): RecordedScore[] {
  let top = loadTopScores(difficulty, storage);
  // Positions in `scores`, from the highest score to the lowest.
  const order = scores.map((_, index) => index).sort((a, b) => scores[b] - scores[a]);
  const recorded: RecordedScore[] = [];
  for (const index of order) {
    recorded[index] = insertScore(top, scores[index]);
    top = recorded[index].top;
  }
  // Nothing to write when nobody made the table.
  if (recorded.some((entry) => entry.rank !== null)) saveTopScores(difficulty, top, storage);
  return recorded;
}
