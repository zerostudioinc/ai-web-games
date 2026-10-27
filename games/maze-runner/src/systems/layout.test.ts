import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, PLAY_AREA, TOUCH_PAD } from '../config';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';
import { MIN_CELL_SIZE, cellCenter, mazeLayout } from './layout';

const SIZES = Array.from({ length: LEVEL_COUNT }, (_, index) => mazeSizeForLevel(index + 1));

describe('mazeLayout', () => {
  it('leaves one spare cell inside the play area on every side for every level', () => {
    for (const size of SIZES) {
      const { cellSize, bounds } = mazeLayout(size, size);
      expect(bounds.x - cellSize).toBeGreaterThanOrEqual(PLAY_AREA.x);
      expect(bounds.y - cellSize).toBeGreaterThanOrEqual(PLAY_AREA.y);
      expect(bounds.x + bounds.width + cellSize).toBeLessThanOrEqual(PLAY_AREA.x + PLAY_AREA.width);
      expect(bounds.y + bounds.height + cellSize).toBeLessThanOrEqual(PLAY_AREA.y + PLAY_AREA.height);
    }
  });

  it('centres the maze in the play area', () => {
    for (const size of SIZES) {
      const { bounds } = mazeLayout(size, size);
      const left = bounds.x - PLAY_AREA.x;
      const right = PLAY_AREA.x + PLAY_AREA.width - (bounds.x + bounds.width);
      const top = bounds.y - PLAY_AREA.y;
      const bottom = PLAY_AREA.y + PLAY_AREA.height - (bounds.y + bounds.height);
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
      expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    }
  });

  it('shrinks cells as the maze grows but keeps them readable', () => {
    let previous = Infinity;
    for (const size of SIZES) {
      const { cellSize } = mazeLayout(size, size);
      expect(cellSize).toBeLessThanOrEqual(previous);
      expect(cellSize).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
      previous = cellSize;
    }
  });

  it('keeps every maze clear of the touch pad and the pad on screen', () => {
    const padLeft = TOUCH_PAD.x - (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    const padRight = TOUCH_PAD.x + (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    const padBottom = TOUCH_PAD.y + (1.5 * TOUCH_PAD.buttonSize + TOUCH_PAD.gap);
    expect(padRight).toBeLessThanOrEqual(GAME_WIDTH);
    expect(padBottom).toBeLessThanOrEqual(GAME_HEIGHT);
    for (const size of SIZES) {
      const { bounds } = mazeLayout(size, size);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(padLeft);
    }
  });

  it('uses thicker walls for bigger cells', () => {
    expect(mazeLayout(10, 10).wallThickness).toBeGreaterThan(mazeLayout(28, 28).wallThickness);
  });
});

describe('cellCenter', () => {
  it('places cell centres one cell apart, including cells just outside the grid', () => {
    const layout = mazeLayout(10, 10);
    const origin = cellCenter(layout, { col: 0, row: 0 });
    expect(origin.x).toBe(layout.bounds.x + layout.cellSize / 2);
    expect(origin.y).toBe(layout.bounds.y + layout.cellSize / 2);
    expect(cellCenter(layout, { col: 3, row: 0 }).x - origin.x).toBe(3 * layout.cellSize);
    expect(origin.x - cellCenter(layout, { col: -1, row: 0 }).x).toBe(layout.cellSize);
  });
});
