// State that carries from one level to the next within a single attempt.
import type { Difficulty } from './difficulty';
import { LEVEL_COUNT } from './levels';
import type { LevelScore } from './score';

/** How one cleared level went; the level-complete screen shows it. */
export interface LevelResult {
  level: number;
  elapsedMs: number;
  parMs: number;
  score: LevelScore;
}

export interface RunState {
  difficulty: Difficulty;
  /** 1-based level about to be played; LEVEL_COUNT + 1 once every maze is cleared. */
  level: number;
  totalScore: number;
}

export const startRun = (difficulty: Difficulty): RunState => ({ difficulty, level: 1, totalScore: 0 });

/** The run after clearing the current level for `points`. */
export const completeLevel = (run: RunState, points: number): RunState => ({
  ...run,
  level: run.level + 1,
  totalScore: run.totalScore + points,
});

export const isRunComplete = (run: RunState): boolean => run.level > LEVEL_COUNT;
