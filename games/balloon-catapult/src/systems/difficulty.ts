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
  soloLanes: readonly number[] | null; // 0-based lanes bombs are limited to in a one-player game; null means every lane
}

/** Settings for every difficulty, keyed by difficulty id. */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  // A solo game has 3 lanes with the catapult in lane 2, so Very Easy keeps its bombs to lanes 2 and 3 (0-based 1 and 2).
  veryEasy: { label: 'Very Easy', startSpeed: 24, speedStep: 6, soloLanes: [1, 2] },
  easy: { label: 'Easy', startSpeed: 36, speedStep: 12, soloLanes: null },
  normal: { label: 'Normal', startSpeed: 60, speedStep: 18, soloLanes: null },
  hard: { label: 'Hard', startSpeed: 84, speedStep: 24, soloLanes: null },
};

/**
 * Lanes bombs may walk down: all of them, except in a one-player Very Easy game where bombs only use
 * lanes 2 and 3 (0-based 1 and 2). With two or more players every lane is used, so it is not too easy for them.
 *
 * @param difficulty - The selected difficulty.
 * @param playerCount - Number of players in the game (1 to 4).
 * @param laneCount - Total lanes on the field (3 or 4), as given by `laneCountFor(playerCount)`.
 * @returns 0-based lane indices bombs may spawn in.
 */
export function bombLanes(difficulty: Difficulty, playerCount: number, laneCount: number): number[] {
  const { soloLanes } = DIFFICULTY_SETTINGS[difficulty];
  // The restriction is only for a solo game; any larger group faces every lane.
  if (soloLanes === null || playerCount > 1) return Array.from({ length: laneCount }, (_, lane) => lane);
  // Hand back a copy so a caller can never modify the shared settings table.
  return [...soloLanes];
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
