// Difficulty modes. They differ in how deep into a dead end the runner may walk before the path seals behind them.

export type Difficulty = 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['normal', 'hard'];

export interface DifficultySettings {
  label: string;
  /** Steps into a dead end at which the path behind the runner seals and a life is lost. */
  trapDepth: number;
  /** Applied to every level score, so the harder mode pays more. */
  scoreMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  normal: { label: 'Normal', trapDepth: 5, scoreMultiplier: 1 },
  hard: { label: 'Hard', trapDepth: 2, scoreMultiplier: 1.5 },
};
