/**
 * Difficulty modes. They differ in how deep into a dead end the runner may walk before the path seals behind them,
 * whether the game warns the player one step before it seals, whether a sealed path stays blocked, and how much a
 * cleared level pays.
 */

/** The selectable modes. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard';

/** Every mode, in the order the menu lists them (left to right): the easiest first. */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'veryHard'];

/** The rules that change with the difficulty. */
export interface DifficultySettings {
  label: string; // name shown to the player
  /** Steps into a dead end at which the path behind the runner seals and a life is lost. */
  trapDepth: number;
  /** Whether the player is warned (a message and a red screen frame) when one more step would seal the path. */
  warnsBeforeSeal: boolean;
  /** Whether a sealed path stays blocked for the rest of the level; when false it reopens as the runner is sent back to the start. */
  sealsStayBlocked: boolean;
  /** Applied to every level score, so the harder modes pay more. */
  scoreMultiplier: number;
}

/**
 * Settings of each mode. Easy seals the path 6 steps into a dead end and warns first; Normal seals it 4 steps in, and Hard
 * and Very Hard only 2 steps in, none of them with a warning. A sealed path stays blocked on every mode except Very Hard,
 * where it reopens so the player has to remember the way. A cleared level pays 0.75x on Easy, 1x on Normal, 1.5x on Hard
 * and 2x on Very Hard.
 */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { label: 'Easy', trapDepth: 6, warnsBeforeSeal: true, sealsStayBlocked: true, scoreMultiplier: 0.75 },
  normal: { label: 'Normal', trapDepth: 4, warnsBeforeSeal: false, sealsStayBlocked: true, scoreMultiplier: 1 },
  hard: { label: 'Hard', trapDepth: 2, warnsBeforeSeal: false, sealsStayBlocked: true, scoreMultiplier: 1.5 },
  veryHard: { label: 'Very Hard', trapDepth: 2, warnsBeforeSeal: false, sealsStayBlocked: false, scoreMultiplier: 2 },
};
