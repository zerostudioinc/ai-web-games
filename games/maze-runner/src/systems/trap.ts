/**
 * The dead-end rule: walk far enough into a branch that leads nowhere and the way back collapses.
 */
import type { DifficultySettings } from './difficulty';
import { DIRECTIONS, stepCell, type Cell, type Maze } from './maze';

/**
 * True once the runner is `limit` steps (or more) into a dead end, which seals the path behind them.
 *
 * @param depth - Steps the runner's cell lies from the solution route, from `Maze.depthAt` (0 on the route).
 * @param limit - The difficulty's `trapDepth`: how deep into a dead end the runner may go before the trap springs.
 * @returns Whether the trap springs.
 */
export const isTrapped = (depth: number, limit: number): boolean => depth >= limit;

/**
 * True when one more step deeper into a dead end would spring the trap, so the scene can warn the player.
 * It stays quiet at the end of a short dead end, where no deeper step exists.
 *
 * @param maze - The maze being played, including any passages already sealed.
 * @param cell - The runner's current cell, inside the grid.
 * @param limit - The difficulty's `trapDepth`.
 * @returns Whether a warning should be shown for this cell.
 */
export function isTrapImminent(maze: Maze, cell: Cell, limit: number): boolean {
  const depth = maze.depthAt(cell);
  // Only the cell one step short of the limit can warn, and the route itself (depth 0) never does.
  if (depth === 0 || depth !== limit - 1) return false;

  // The warning needs an open way that leads deeper; a dead end's last cell has none, so it stays quiet.
  return DIRECTIONS.some((direction) => {
    const next = stepCell(cell, direction);
    return maze.canMove(cell, direction) && maze.contains(next) && maze.depthAt(next) > depth;
  });
}

/**
 * True when the player should be warned that one more step would spring the trap: only on a difficulty that warns
 * (Easy), and only when the trap really is one step away. The other modes never warn, however close the trap is.
 *
 * @param maze - The maze being played, including any passages already sealed.
 * @param cell - The runner's current cell, inside the grid.
 * @param settings - Rules of the chosen difficulty: its trap depth and whether it warns at all.
 * @returns Whether the warning (a message and a red screen frame) should show for this cell.
 */
export function shouldWarn(maze: Maze, cell: Cell, settings: DifficultySettings): boolean {
  return settings.warnsBeforeSeal && isTrapImminent(maze, cell, settings.trapDepth);
}
