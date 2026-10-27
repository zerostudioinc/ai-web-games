export type Difficulty = 'veryEasy' | 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard'];

export interface DifficultySettings {
  label: string;
  startSpeed: number; // bomb speed in wave 1, px per second
  speedStep: number; // added each wave, px per second
  lanes: readonly number[]; // lanes (0-based) bombs may walk down
}

const ALL_LANES = [0, 1, 2, 3] as const;

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  veryEasy: { label: 'Very Easy', startSpeed: 24, speedStep: 6, lanes: [1, 2] }, // the two middle lanes, 2 and 3
  easy: { label: 'Easy', startSpeed: 36, speedStep: 12, lanes: ALL_LANES },
  normal: { label: 'Normal', startSpeed: 60, speedStep: 18, lanes: ALL_LANES },
  hard: { label: 'Hard', startSpeed: 84, speedStep: 24, lanes: ALL_LANES },
};

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);

export const bombSpeed = (difficulty: Difficulty, wave: number): number => {
  const { startSpeed, speedStep } = DIFFICULTY_SETTINGS[difficulty];
  return startSpeed + speedStep * (wave - 1);
};
