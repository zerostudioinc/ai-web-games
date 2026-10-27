/**
 * Tests for fitting a maze onto the screen: every level's maze must fit the play area, sit centred and stay clear of the touch pad.
 */
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, PLAY_AREA, TOUCH_PAD } from '../config';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';
import { MIN_CELL_SIZE, cellCenter, mazeLayout } from './layout';

// Cells per side of the square maze on each level, from the first to the last.
const SIZES = Array.from({ length: LEVEL_COUNT }, (_, index) => mazeSizeForLevel(index + 1));

// The grid fits the play area with a one-cell margin, is centred, stays clear of the touch pad, and uses smaller cells and thinner walls as mazes grow.
describe('mazeLayout', () => {
  it('leaves one spare cell inside the play area on every side for every level', () => {
    for (const size of SIZES) {
      const { cellSize, bounds } = mazeLayout(size, size);
      // Moving one cell outwards from each grid edge must still land inside the play area (left, top, right, bottom).
      expect(bounds.x - cellSize).toBeGreaterThanOrEqual(PLAY_AREA.x);
      expect(bounds.y - cellSize).toBeGreaterThanOrEqual(PLAY_AREA.y);
      expect(bounds.x + bounds.width + cellSize).toBeLessThanOrEqual(PLAY_AREA.x + PLAY_AREA.width);
      expect(bounds.y + bounds.height + cellSize).toBeLessThanOrEqual(PLAY_AREA.y + PLAY_AREA.height);
    }
  });

  it('centres the maze in the play area', () => {
    for (const size of SIZES) {
      const { bounds } = mazeLayout(size, size);
      // Free space, in px, between the grid and each edge of the play area.
      const left = bounds.x - PLAY_AREA.x;
      const right = PLAY_AREA.x + PLAY_AREA.width - (bounds.x + bounds.width);
      const top = bounds.y - PLAY_AREA.y;
      const bottom = PLAY_AREA.y + PLAY_AREA.height - (bounds.y + bounds.height);
      // Opposite margins may differ by 1 px, because the grid position is rounded to whole pixels.
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
      expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    }
  });

  it('shrinks cells as the maze grows but keeps them readable', () => {
    // Levels run from the smallest maze to the largest: a cell is never bigger than on the level before, nor below the minimum.
    let previous = Infinity;
    for (const size of SIZES) {
      const { cellSize } = mazeLayout(size, size);
      expect(cellSize).toBeLessThanOrEqual(previous);
      expect(cellSize).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
      previous = cellSize;
    }
  });

  it('keeps every maze clear of the touch pad and the pad on screen', () => {
    // Outer edges of the pad's cross, in px. An arrow key's centre is one button plus one gap from the pad centre,
    // and its outer edge is half a button further.
    const padLeft = TOUCH_PAD.x - (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    const padRight = TOUCH_PAD.x + (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    const padBottom = TOUCH_PAD.y + (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    // The whole pad must be on screen...
    expect(padRight).toBeLessThanOrEqual(GAME_WIDTH);
    expect(padBottom).toBeLessThanOrEqual(GAME_HEIGHT);
    for (const size of SIZES) {
      const { bounds } = mazeLayout(size, size);
      // ...and every maze must end before the pad's left edge.
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(padLeft);
    }
  });

  it('uses thicker walls for bigger cells', () => {
    expect(mazeLayout(10, 10).wallThickness).toBeGreaterThan(mazeLayout(28, 28).wallThickness); // 52 px cells give 10 px walls; 21 px cells give 4 px walls
  });
});

// A cell's centre is half a cell in from the grid's top-left corner, and neighbouring centres are one cell apart.
describe('cellCenter', () => {
  it('places cell centres one cell apart, including cells just outside the grid', () => {
    const layout = mazeLayout(10, 10);
    const origin = cellCenter(layout, { col: 0, row: 0 }); // centre of the top-left cell
    expect(origin.x).toBe(layout.bounds.x + layout.cellSize / 2); // half a cell in from the left edge of the grid
    expect(origin.y).toBe(layout.bounds.y + layout.cellSize / 2); // half a cell down from the top edge of the grid
    expect(cellCenter(layout, { col: 3, row: 0 }).x - origin.x).toBe(3 * layout.cellSize); // three cells to the right
    expect(origin.x - cellCenter(layout, { col: -1, row: 0 }).x).toBe(layout.cellSize); // col -1 lies one cell outside the grid, to the left
  });
});
