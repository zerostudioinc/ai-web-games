export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface DifficultySettings {
  label: string;
  startSpeed: number; // bomb speed in wave 1, px per second
  speedStep: number; // added each wave, px per second
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { label: 'Easy', startSpeed: 36, speedStep: 12 },
  normal: { label: 'Normal', startSpeed: 60, speedStep: 18 },
  hard: { label: 'Hard', startSpeed: 84, speedStep: 24 },
};

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);

export const bombSpeed = (difficulty: Difficulty, wave: number): number => {
  const { startSpeed, speedStep } = DIFFICULTY_SETTINGS[difficulty];
  return startSpeed + speedStep * (wave - 1);
};
