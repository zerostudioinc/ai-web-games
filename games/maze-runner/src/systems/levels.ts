// Level progression: ten mazes that grow from small to large.

export const LEVEL_COUNT = 10;

/** Cells along each side of the level 1 maze, and how many each later level adds. */
export const FIRST_MAZE_SIZE = 10;
export const MAZE_SIZE_STEP = 2;

/** Cells per side for a 1-based level: 10x10 on level 1 growing to 28x28 on level 10. */
export const mazeSizeForLevel = (level: number): number => FIRST_MAZE_SIZE + (level - 1) * MAZE_SIZE_STEP;
