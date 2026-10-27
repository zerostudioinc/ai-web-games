// Fits a maze onto the screen: cell size, wall thickness and where each cell sits.
import { PLAY_AREA } from '../config';
import type { Point, Rect } from './geometry';
import type { Cell } from './maze';

export const MAX_CELL_SIZE = 52;
export const MIN_CELL_SIZE = 8;

export interface MazeLayout {
  cellSize: number;
  wallThickness: number;
  /** Screen rectangle covered by the grid; wall centre lines run along its edges. */
  bounds: Rect;
}

/** Largest whole-pixel cells that fit, centred in the play area with one spare cell of margin on every side. */
export function mazeLayout(cols: number, rows: number): MazeLayout {
  // The spare cell leaves room for the exit marker and for the runner stepping out through the gap.
  const fit = Math.min(PLAY_AREA.width / (cols + 2), PLAY_AREA.height / (rows + 2));
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(fit)));
  const width = cols * cellSize;
  const height = rows * cellSize;
  return {
    cellSize,
    wallThickness: Math.max(3, Math.round(cellSize * 0.2)),
    bounds: {
      x: Math.round(PLAY_AREA.x + (PLAY_AREA.width - width) / 2),
      y: Math.round(PLAY_AREA.y + (PLAY_AREA.height - height) / 2),
      width,
      height,
    },
  };
}

/** Screen position of a cell's centre. Cells just outside the grid work too, which the exit walk relies on. */
export const cellCenter = (layout: MazeLayout, cell: Cell): Point => ({
  x: layout.bounds.x + (cell.col + 0.5) * layout.cellSize,
  y: layout.bounds.y + (cell.row + 0.5) * layout.cellSize,
});
