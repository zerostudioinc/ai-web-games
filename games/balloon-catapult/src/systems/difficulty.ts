export type Difficulty = 'veryEasy' | 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard'];

export interface DifficultySettings {
  label: string;
  startSpeed: number; // bomb speed in wave 1, px per second
  speedStep: number; // added each wave, px per second
  middleLanesOnly: boolean; // bombs only walk the middle lane(s)
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  veryEasy: { label: 'Very Easy', startSpeed: 24, speedStep: 6, middleLanesOnly: true },
  easy: { label: 'Easy', startSpeed: 36, speedStep: 12, middleLanesOnly: false },
  normal: { label: 'Normal', startSpeed: 60, speedStep: 18, middleLanesOnly: false },
  hard: { label: 'Hard', startSpeed: 84, speedStep: 24, middleLanesOnly: false },
};

/** 0-based lanes bombs may walk down: the middle lane (3 lanes) or two middle lanes (4 lanes) on Very Easy, else all. */
export function bombLanes(difficulty: Difficulty, laneCount: number): number[] {
  const all = Array.from({ length: laneCount }, (_, lane) => lane);
  if (!DIFFICULTY_SETTINGS[difficulty].middleLanesOnly) return all;
  const middle = Math.floor((laneCount - 1) / 2);
  return laneCount % 2 === 1 ? [middle] : [middle, middle + 1];
}

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);

export const bombSpeed = (difficulty: Difficulty, wave: number): number => {
  const { startSpeed, speedStep } = DIFFICULTY_SETTINGS[difficulty];
  return startSpeed + speedStep * (wave - 1);
};
