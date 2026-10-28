/**
 * State that carries from one level to the next within a single attempt.
 */
import type { Difficulty } from './difficulty';
import { LEVEL_COUNT } from './levels';
import { createRng, randomSeed, type Random } from './rng';
import type { LevelScore } from './score';
import { themeSchedule, type ThemeId } from './themes';

/** Players in a run: one, or two for the versus mode. */
export type PlayerCount = 1 | 2;

/** How one cleared level went; the level-complete screen shows it. */
export interface LevelResult {
  level: number; // 1-based number of the level that was cleared
  elapsedMs: number; // time the escape took on the level clock, in ms (time lost to traps included)
  parMs: number; // par time of the level's maze, in ms
  score: LevelScore; // the score breakdown the level earned
}

/** Progress of one attempt: the chosen mode, the level about to be played, and the points each player has banked so far. */
export interface RunState {
  difficulty: Difficulty; // mode picked on the menu; fixed for the whole run
  playerCount: PlayerCount; // 1, or 2 when two players race each other; fixed for the whole run
  /** 1-based level about to be played; LEVEL_COUNT + 1 once every maze is cleared. */
  level: number;
  totals: readonly number[]; // per player, the sum of the points of every level cleared so far
  themes: readonly ThemeId[]; // the look of each level, level 1 first; every theme comes up equally often
}

/**
 * Starts a new attempt.
 *
 * @param difficulty - The mode chosen on the menu.
 * @param playerCount - 1 for a solo run, 2 for versus; defaults to 1.
 * @param random - Random source that orders the level themes; defaults to a fresh one.
 * @returns A run at level 1 with no points yet.
 */
export const startRun = (difficulty: Difficulty, playerCount: PlayerCount = 1, random: Random = createRng(randomSeed())): RunState => ({
  difficulty,
  playerCount,
  level: 1,
  totals: Array.from({ length: playerCount }, () => 0),
  themes: themeSchedule(random, LEVEL_COUNT),
});

/**
 * The theme of a level.
 *
 * @param run - The run the level belongs to.
 * @param level - 1-based level number, 1 to `LEVEL_COUNT`.
 * @returns That level's theme.
 */
export const themeOfLevel = (run: RunState, level: number): ThemeId => run.themes[level - 1];

/**
 * The run with points added to each player's total, still on the same level. A match that ends part-way through a level
 * uses it to keep the points of a player who had already escaped.
 *
 * @param run - The run state before; it is not modified.
 * @param points - The points to add for each player, in player order.
 * @returns A new run state with the same level and the totals increased.
 */
export const bankPoints = (run: RunState, points: readonly number[]): RunState => ({
  ...run,
  totals: run.totals.map((total, player) => total + (points[player] ?? 0)),
});

/**
 * The run after clearing the current level.
 *
 * @param run - The run state before the level was cleared; it is not modified.
 * @param points - The final score each player earned on the level, in player order.
 * @returns A new run state on the next level, with each player's points added to their total.
 */
export const completeLevel = (run: RunState, points: readonly number[]): RunState => ({
  ...bankPoints(run, points),
  level: run.level + 1,
});

/**
 * Whether every level has been cleared.
 *
 * @param run - The run state to check.
 * @returns True once the level counter has moved past `LEVEL_COUNT`.
 */
export const isRunComplete = (run: RunState): boolean => run.level > LEVEL_COUNT;
