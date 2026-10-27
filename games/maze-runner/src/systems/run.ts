/**
 * State that carries from one level to the next within a single attempt.
 */
import type { Difficulty } from './difficulty';
import { LEVEL_COUNT } from './levels';
import type { LevelScore } from './score';

/** How one cleared level went; the level-complete screen shows it. */
export interface LevelResult {
  level: number; // 1-based number of the level that was cleared
  elapsedMs: number; // time the escape took on the level clock, in ms (time lost to traps included)
  parMs: number; // par time of the level's maze, in ms
  score: LevelScore; // the score breakdown the level earned
}

/** Progress of one attempt: the chosen mode, the level about to be played, and the points banked so far. */
export interface RunState {
  difficulty: Difficulty; // mode picked on the menu; fixed for the whole run
  /** 1-based level about to be played; LEVEL_COUNT + 1 once every maze is cleared. */
  level: number;
  totalScore: number; // sum of the points of every level cleared so far
}

/**
 * Starts a new attempt.
 *
 * @param difficulty - The mode chosen on the menu.
 * @returns A run at level 1 with no points yet.
 */
export const startRun = (difficulty: Difficulty): RunState => ({ difficulty, level: 1, totalScore: 0 });

/**
 * The run after clearing the current level for `points`.
 *
 * @param run - The run state before the level was cleared; it is not modified.
 * @param points - The final score the cleared level earned.
 * @returns A new run state on the next level, with `points` added to the total.
 */
export const completeLevel = (run: RunState, points: number): RunState => ({
  ...run,
  level: run.level + 1,
  totalScore: run.totalScore + points,
});

/**
 * Whether every level has been cleared.
 *
 * @param run - The run state to check.
 * @returns True once the level counter has moved past `LEVEL_COUNT`.
 */
export const isRunComplete = (run: RunState): boolean => run.level > LEVEL_COUNT;
