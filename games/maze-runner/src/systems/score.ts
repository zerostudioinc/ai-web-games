/**
 * Scoring: each level is worth more than the last, scaled by how quickly the maze was escaped.
 */
import { DIFFICULTY_SETTINGS, type Difficulty } from './difficulty';

export const LEVEL_BASE_POINTS = 1000; // base points for level 1
export const LEVEL_BASE_STEP = 250; // extra base points for each level after the first

/** Par time allowed per step of the solution route, floored so small mazes still get a fair window. */
export const PAR_MS_PER_STEP = 1000; // ms allowed per step of the route
export const MIN_PAR_MS = 10_000; // ms; the shortest par time any level gets

export const MAX_TIME_BONUS = 0.5; // an instant escape earns 1.5x
export const MIN_TIME_FACTOR = 0.2; // however slow, a cleared level keeps at least 20% of its base

/**
 * The escape time a steady runner should manage for a route of `solutionSteps` steps.
 *
 * @param solutionSteps - Length of the maze's solution route, in steps.
 * @returns Par time in ms, never below `MIN_PAR_MS`.
 */
export const parTimeMs = (solutionSteps: number): number => Math.max(MIN_PAR_MS, solutionSteps * PAR_MS_PER_STEP);

/**
 * Speed multiplier: 1.5 for an instant escape, falling to 1 at par, then fading as 1 / (time ratio) down to a floor.
 * It never rises with elapsed time, so a quicker escape always scores at least as much.
 *
 * @param elapsedMs - Time taken to escape, in ms; negative values count as 0.
 * @param parMs - Par time for the level, in ms.
 * @returns The multiplier, from `MIN_TIME_FACTOR` up to 1 + `MAX_TIME_BONUS`.
 */
export function timeFactor(elapsedMs: number, parMs: number): number {
  const ratio = Math.max(0, elapsedMs) / parMs; // 1 means exactly par
  // At or under par the bonus shrinks linearly from the full bonus to nothing.
  if (ratio <= 1) return 1 + MAX_TIME_BONUS * (1 - ratio);
  // Over par the multiplier decays as 1 / ratio, but never below the floor.
  return Math.max(MIN_TIME_FACTOR, 1 / ratio);
}

/** Points breakdown for one cleared level. */
export interface LevelScore {
  /** Points the level is worth before any multiplier. */
  base: number;
  timeFactor: number; // speed multiplier, from `timeFactor`
  difficultyMultiplier: number; // multiplier set by the chosen difficulty
  /** Final rounded score for the level: base x time factor x difficulty multiplier. */
  points: number;
}

/**
 * Works out the score for a cleared level.
 *
 * @param level - 1-based level number; later levels are worth more.
 * @param elapsedMs - Time taken to escape, in ms.
 * @param parMs - Par time for the level, in ms.
 * @param difficulty - The chosen difficulty, which sets the score multiplier.
 * @returns The base points, both multipliers and the final rounded points.
 */
export function levelScore(level: number, elapsedMs: number, parMs: number, difficulty: Difficulty): LevelScore {
  const base = LEVEL_BASE_POINTS + LEVEL_BASE_STEP * (level - 1);
  const factor = timeFactor(elapsedMs, parMs);
  const difficultyMultiplier = DIFFICULTY_SETTINGS[difficulty].scoreMultiplier;
  return { base, timeFactor: factor, difficultyMultiplier, points: Math.round(base * factor * difficultyMultiplier) };
}

/**
 * Clock text as m:ss.t, e.g. 1:05.3.
 *
 * @param ms - Time in ms; negative values count as 0.
 * @returns The time formatted as minutes, seconds and tenths of a second.
 */
export function formatTime(ms: number): string {
  // Work in whole tenths of a second; 600 tenths make a minute.
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}

/**
 * Whole number with thousands separators, e.g. 12,450. Done by hand so the output never depends on the locale.
 *
 * @param score - The score to format; it is rounded to a whole number.
 * @returns The digits with a comma between each group of three.
 */
export const formatScore = (score: number): string => String(Math.round(score)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
