// The dead-end rule: walk far enough into a branch that leads nowhere and the way back collapses.
import { DIRECTIONS, stepCell, type Cell, type Maze } from './maze';

/** True once the runner is `limit` steps (or more) into a dead end, which seals the path behind them. */
export const isTrapped = (depth: number, limit: number): boolean => depth >= limit;

/**
 * True when one more step deeper into a dead end would spring the trap, so the scene can warn the player.
 * It stays quiet at the end of a short dead end, where no deeper step exists.
 */
export function isTrapImminent(maze: Maze, cell: Cell, limit: number): boolean {
  const depth = maze.depthAt(cell);
  if (depth === 0 || depth !== limit - 1) return false;

  return DIRECTIONS.some((direction) => {
    const next = stepCell(cell, direction);
    return maze.canMove(cell, direction) && maze.contains(next) && maze.depthAt(next) > depth;
  });
}
