// Scoring: each level is worth more than the last, scaled by how quickly the maze was escaped.
import { DIFFICULTY_SETTINGS, type Difficulty } from './difficulty';

export const LEVEL_BASE_POINTS = 1000;
export const LEVEL_BASE_STEP = 250; // extra base points for each level after the first

/** Par time allowed per step of the solution route, floored so small mazes still get a fair window. */
export const PAR_MS_PER_STEP = 1000;
export const MIN_PAR_MS = 10_000;

export const MAX_TIME_BONUS = 0.5; // an instant escape earns 1.5x
export const MIN_TIME_FACTOR = 0.2; // however slow, a cleared level keeps at least 20% of its base

/** The escape time a steady runner should manage for a route of `solutionSteps` steps. */
export const parTimeMs = (solutionSteps: number): number => Math.max(MIN_PAR_MS, solutionSteps * PAR_MS_PER_STEP);

/**
 * Speed multiplier: 1.5 for an instant escape, falling to 1 at par, then fading as 1 / (time ratio) down to a floor.
 * It never rises with elapsed time, so a quicker escape always scores at least as much.
 */
export function timeFactor(elapsedMs: number, parMs: number): number {
  const ratio = Math.max(0, elapsedMs) / parMs;
  if (ratio <= 1) return 1 + MAX_TIME_BONUS * (1 - ratio);
  return Math.max(MIN_TIME_FACTOR, 1 / ratio);
}

export interface LevelScore {
  /** Points the level is worth before any multiplier. */
  base: number;
  timeFactor: number;
  difficultyMultiplier: number;
  /** Final rounded score for the level: base x time factor x difficulty multiplier. */
  points: number;
}

export function levelScore(level: number, elapsedMs: number, parMs: number, difficulty: Difficulty): LevelScore {
  const base = LEVEL_BASE_POINTS + LEVEL_BASE_STEP * (level - 1);
  const factor = timeFactor(elapsedMs, parMs);
  const difficultyMultiplier = DIFFICULTY_SETTINGS[difficulty].scoreMultiplier;
  return { base, timeFactor: factor, difficultyMultiplier, points: Math.round(base * factor * difficultyMultiplier) };
}

/** Clock text as m:ss.t, e.g. 1:05.3. */
export function formatTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}

/** Whole number with thousands separators, e.g. 12,450. Done by hand so the output never depends on the locale. */
export const formatScore = (score: number): string => String(Math.round(score)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
