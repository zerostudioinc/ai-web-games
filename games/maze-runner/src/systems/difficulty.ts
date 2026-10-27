/**
 * Difficulty modes. They differ in how deep into a dead end the runner may walk before the path seals behind them.
 */

/** The selectable modes. */
export type Difficulty = 'normal' | 'hard';

/** Every mode, in the order the menu lists them (left to right). */
export const DIFFICULTIES: readonly Difficulty[] = ['normal', 'hard'];

/** The rules that change with the difficulty. */
export interface DifficultySettings {
  label: string; // name shown to the player
  /** Steps into a dead end at which the path behind the runner seals and a life is lost. */
  trapDepth: number;
  /** Applied to every level score, so the harder mode pays more. */
  scoreMultiplier: number;
}

/** Settings of each mode: Normal seals the path 5 steps into a dead end, Hard only 2 steps in but pays 1.5x. */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  normal: { label: 'Normal', trapDepth: 5, scoreMultiplier: 1 },
  hard: { label: 'Hard', trapDepth: 2, scoreMultiplier: 1.5 },
};
