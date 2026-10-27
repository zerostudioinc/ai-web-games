export const POINTS_PER_BOMB = 1;

export const HIGH_SCORE_KEY = 'water-balloon-bombardment:high-score';

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

export function loadHighScore(storage: ScoreStorage | undefined = browserStorage()): number {
  try {
    const value = Number.parseInt(storage?.getItem(HIGH_SCORE_KEY) ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Saves `score` if it beats the stored best and returns the resulting high score. */
export function recordScore(score: number, storage: ScoreStorage | undefined = browserStorage()): number {
  const best = loadHighScore(storage);
  if (score <= best) return best;
  try {
    storage?.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Persisting is best-effort; the in-memory score still counts for this session.
  }
  return score;
}
