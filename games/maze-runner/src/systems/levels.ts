/**
 * Level progression: a run has `LEVEL_COUNT` levels, and their mazes grow from small to large.
 */

/** Number of levels in a run; clearing all of them wins the game. */
export const LEVEL_COUNT = 10;

/** Cells along each side of the level 1 maze, and how many each later level adds. */
export const FIRST_MAZE_SIZE = 10; // cells per side on level 1
export const MAZE_SIZE_STEP = 2; // extra cells per side for each later level

/**
 * Cells per side for a 1-based level: `FIRST_MAZE_SIZE` on level 1, then `MAZE_SIZE_STEP` more with each level.
 *
 * @param level - 1-based level number (1 to `LEVEL_COUNT`).
 * @returns The number of cells along each side of that level's square maze.
 */
export const mazeSizeForLevel = (level: number): number => FIRST_MAZE_SIZE + (level - 1) * MAZE_SIZE_STEP;
