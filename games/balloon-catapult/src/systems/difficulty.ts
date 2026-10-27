/**
 * Difficulty levels and the bomb behaviour each one tunes: starting speed, speed growth per wave and lane choice.
 */

/** Identifier of a difficulty level. */
export type Difficulty = 'veryEasy' | 'easy' | 'normal' | 'hard';

/** Every difficulty, ordered from easiest to hardest (also the order menus list them in). */
export const DIFFICULTIES: readonly Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard'];

/** The tunable numbers behind one difficulty level. */
export interface DifficultySettings {
  label: string; // name shown to the player
  startSpeed: number; // bomb speed in wave 1, px per second
  speedStep: number; // added each wave, px per second
  middleLanesOnly: boolean; // bombs only walk the middle lane(s)
}

/** Settings for every difficulty, keyed by difficulty id. */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  veryEasy: { label: 'Very Easy', startSpeed: 24, speedStep: 6, middleLanesOnly: true },
  easy: { label: 'Easy', startSpeed: 36, speedStep: 12, middleLanesOnly: false },
  normal: { label: 'Normal', startSpeed: 60, speedStep: 18, middleLanesOnly: false },
  hard: { label: 'Hard', startSpeed: 84, speedStep: 24, middleLanesOnly: false },
};

/**
 * Lanes bombs may walk down: all of them, except on Very Easy where only the middle lane
 * (3 lanes) or the two middle lanes (4 lanes) are used.
 *
 * @param difficulty - The selected difficulty.
 * @param laneCount - Total lanes on the field (3 or 4).
 * @returns 0-based lane indices bombs may spawn in.
 */
export function bombLanes(difficulty: Difficulty, laneCount: number): number[] {
  const all = Array.from({ length: laneCount }, (_, lane) => lane);
  if (!DIFFICULTY_SETTINGS[difficulty].middleLanesOnly) return all;
  // With an odd count there is one centre lane; with an even count the centre is the pair (middle, middle + 1).
  const middle = Math.floor((laneCount - 1) / 2);
  return laneCount % 2 === 1 ? [middle] : [middle, middle + 1];
}

/**
 * Type guard that checks an untrusted value (e.g. scene data) is a known difficulty id.
 *
 * @param value - The value to test.
 * @returns True when `value` is one of `DIFFICULTIES`.
 */
export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);

/**
 * Walking speed of bombs in a given wave.
 *
 * @param difficulty - The selected difficulty.
 * @param wave - 1-based wave number.
 * @returns Bomb speed in px per second.
 */
export const bombSpeed = (difficulty: Difficulty, wave: number): number => {
  const { startSpeed, speedStep } = DIFFICULTY_SETTINGS[difficulty];
  // Wave 1 runs at startSpeed; each later wave adds one speedStep.
  return startSpeed + speedStep * (wave - 1);
};
