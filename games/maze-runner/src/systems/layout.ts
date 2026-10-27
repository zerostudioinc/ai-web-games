/**
 * Fits a maze onto the screen: cell size, wall thickness and where each cell sits.
 */
import { PLAY_AREA } from '../config';
import type { Point, Rect } from './geometry';
import type { Cell } from './maze';

/** Largest cell edge allowed, in px, so small mazes do not become huge. */
export const MAX_CELL_SIZE = 52;
/** Smallest cell edge allowed, in px, so cells never become unreadably small. */
export const MIN_CELL_SIZE = 8;

/** How a maze is sized and placed on the screen. */
export interface MazeLayout {
  cellSize: number; // edge of one square cell, px
  wallThickness: number; // thickness of the drawn walls, px
  /** Screen rectangle covered by the grid; wall centre lines run along its edges. */
  bounds: Rect;
}

/**
 * Largest whole-pixel cells that fit, centred in the play area with one spare cell of margin on every side.
 *
 * @param cols - Maze width in cells.
 * @param rows - Maze height in cells.
 * @returns The cell size, wall thickness and screen rectangle of the grid, in px.
 */
export function mazeLayout(cols: number, rows: number): MazeLayout {
  // The spare cell leaves room for the exit marker and for the runner stepping out through the gap.
  const fit = Math.min(PLAY_AREA.width / (cols + 2), PLAY_AREA.height / (rows + 2));
  // Round down so the grid never overflows the area, then keep the size within the allowed range.
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(fit)));
  const width = cols * cellSize;
  const height = rows * cellSize;
  return {
    cellSize,
    // About a fifth of a cell, but never thinner than 3 px.
    wallThickness: Math.max(3, Math.round(cellSize * 0.2)),
    bounds: {
      // Centre the grid in the play area, on whole pixels.
      x: Math.round(PLAY_AREA.x + (PLAY_AREA.width - width) / 2),
      y: Math.round(PLAY_AREA.y + (PLAY_AREA.height - height) / 2),
      width,
      height,
    },
  };
}

/**
 * Screen position of a cell's centre. Cells just outside the grid work too, which the exit walk relies on.
 *
 * @param layout - The maze layout from `mazeLayout`.
 * @param cell - The cell, 0-based; a column or row of -1, `cols` or `rows` lies one cell outside the grid.
 * @returns The centre of the cell, in screen px.
 */
export const cellCenter = (layout: MazeLayout, cell: Cell): Point => ({
  x: layout.bounds.x + (cell.col + 0.5) * layout.cellSize,
  y: layout.bounds.y + (cell.row + 0.5) * layout.cellSize,
});
