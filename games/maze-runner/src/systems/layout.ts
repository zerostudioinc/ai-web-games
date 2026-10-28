/**
 * Fits a maze onto the screen: cell size, wall thickness and where each cell sits. Also splits the screen between the
 * players and places the touch pads.
 */
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, PLAY_AREA, TOUCH_PAD, VERSUS } from '../config';
import type { Point, Rect } from './geometry';
import type { Cell, Direction } from './maze';
import type { PlayerCount } from './run';

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
 * Largest whole-pixel cells that fit, centred in `area` with one spare cell of margin on every side.
 *
 * @param cols - Maze width in cells.
 * @param rows - Maze height in cells.
 * @param area - Screen rectangle (px) the maze is fitted into; defaults to the play area of a one-player game.
 * @returns The cell size, wall thickness and screen rectangle of the grid, in px.
 */
export function mazeLayout(cols: number, rows: number, area: Rect = PLAY_AREA): MazeLayout {
  // The spare cell leaves room for the exit marker and for the runner stepping out through the gap.
  const fit = Math.min(area.width / (cols + 2), area.height / (rows + 2));
  // Round down so the grid never overflows the area, then keep the size within the allowed range.
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(fit)));
  const width = cols * cellSize;
  const height = rows * cellSize;
  return {
    cellSize,
    // About a fifth of a cell, but never thinner than 3 px.
    wallThickness: Math.max(3, Math.round(cellSize * 0.2)),
    bounds: {
      // Centre the grid in the area, on whole pixels.
      x: Math.round(area.x + (area.width - width) / 2),
      y: Math.round(area.y + (area.height - height) / 2),
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

/** The part of the screen that belongs to one player. */
export interface BoardArea {
  maze: Rect; // where the player's maze is fitted, px
  frame: Rect; // the player's whole share of the screen, px: all of it when solo, the part below the status bar in versus; their warning frame outlines it
}

/**
 * Splits the screen between the players: one board in the centre for a solo game, or a left and a right half for versus.
 *
 * @param playerCount - Players in the game, 1 or 2.
 * @param touch - Whether the device has a touch screen; on versus boards that keeps a strip free under each maze for its touch pad.
 * @returns One area per player, player one first (on the left).
 */
export function boardAreas(playerCount: PlayerCount, touch: boolean): BoardArea[] {
  // A solo player has the whole screen, with the touch pad in the free strip beside the maze.
  if (playerCount === 1) return [{ maze: PLAY_AREA, frame: { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT } }];
  const width = GAME_WIDTH / playerCount; // width of one player's half, px
  const padStrip = touch ? VERSUS.padStrip : 0; // height kept free under the maze for the touch pad, px
  return Array.from({ length: playerCount }, (_, player) => ({
    maze: { x: player * width, y: VERSUS.top, width, height: GAME_HEIGHT - VERSUS.top - padStrip },
    frame: { x: player * width, y: HUD_HEIGHT, width, height: GAME_HEIGHT - HUD_HEIGHT },
  }));
}

/** Where the four arrow keys of a touch pad sit. */
export interface PadLayout {
  keySize: number; // edge of one square key, px
  centers: Record<Direction, Point>; // centre of each key, px
}

/**
 * Four keys in a cross: up above the centre, down below it, left and right either side.
 *
 * @param center - Centre of the cross, px.
 * @param keySize - Edge of one key, px.
 * @param gap - Space between neighbouring keys, px.
 * @returns The layout of the pad.
 */
export function crossPadLayout(center: Point, keySize: number, gap: number): PadLayout {
  // Distance between neighbouring key centres: one key plus the gap.
  const step = keySize + gap;
  return {
    keySize,
    centers: {
      up: { x: center.x, y: center.y - step },
      right: { x: center.x + step, y: center.y },
      down: { x: center.x, y: center.y + step },
      left: { x: center.x - step, y: center.y },
    },
  };
}

/**
 * Four keys in a single row, left to right: left, up, down, right. It needs little height, which suits a split screen.
 *
 * @param center - Centre of the row, px.
 * @param keySize - Edge of one key, px.
 * @param gap - Space between neighbouring keys, px.
 * @returns The layout of the pad.
 */
export function rowPadLayout(center: Point, keySize: number, gap: number): PadLayout {
  const step = keySize + gap;
  // The keys' centres are spaced one step apart, symmetric about the centre: -1.5, -0.5, 0.5 and 1.5 steps from it.
  /**
   * Centre of one key of the row.
   *
   * @param slot - Position in the row, 0 (leftmost) to 3.
   * @returns The key's centre, px.
   */
  const at = (slot: number): Point => ({ x: center.x + (slot - 1.5) * step, y: center.y });
  return { keySize, centers: { left: at(0), up: at(1), down: at(2), right: at(3) } };
}

/**
 * Where a player's touch pad goes: the cross beside the maze in a solo game, or a row along the bottom of the player's half in versus.
 *
 * @param playerCount - Players in the game, 1 or 2.
 * @param area - The player's area from `boardAreas`.
 * @returns The layout of that player's pad.
 */
export function touchPadLayout(playerCount: PlayerCount, area: BoardArea): PadLayout {
  if (playerCount === 1) return crossPadLayout({ x: TOUCH_PAD.x, y: TOUCH_PAD.y }, TOUCH_PAD.buttonSize, TOUCH_PAD.gap);
  // The row is centred in the half, in the strip at the very bottom of the screen.
  const center = { x: area.frame.x + area.frame.width / 2, y: GAME_HEIGHT - VERSUS.padStrip / 2 };
  return rowPadLayout(center, VERSUS.padKey, VERSUS.padGap);
}
