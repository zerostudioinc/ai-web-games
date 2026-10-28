/**
 * Tests for fitting a maze onto the screen: every level's maze must fit its area, sit centred and stay clear of the touch pad.
 * Also covers the split of the screen between two versus players and the layout of the touch pads.
 */
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, PLAY_AREA, TOUCH_PAD, VERSUS } from '../config';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';
import { MIN_CELL_SIZE, boardAreas, cellCenter, crossPadLayout, mazeLayout, rowPadLayout, touchPadLayout } from './layout';

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

// A solo player has the whole screen with the pad beside the maze; versus players get a half each, below the status bar.
describe('boardAreas', () => {
  it('gives a solo player the play area, and the whole screen to frame', () => {
    const [area] = boardAreas(1, true);
    expect(area.maze).toEqual(PLAY_AREA);
    expect(area.frame).toEqual({ x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT });
  });

  it('splits a versus screen into two halves, player one on the left', () => {
    const [left, right] = boardAreas(2, false).map((area) => area.frame);
    expect(left.x).toBe(0);
    expect(right.x).toBe(GAME_WIDTH / 2);
    expect(left.width + right.width).toBe(GAME_WIDTH); // together they cover the screen width, with no overlap
  });

  it('keeps each versus maze inside its own half, below the status bar and its strip', () => {
    for (const touch of [false, true]) {
      for (const { maze, frame } of boardAreas(2, touch)) {
        expect(maze.x).toBeGreaterThanOrEqual(frame.x);
        expect(maze.x + maze.width).toBeLessThanOrEqual(frame.x + frame.width);
        expect(maze.y).toBeGreaterThanOrEqual(HUD_HEIGHT);
        expect(maze.y).toBe(VERSUS.top);
        expect(maze.y + maze.height).toBeLessThanOrEqual(GAME_HEIGHT);
      }
    }
  });

  it('keeps a strip free under each versus maze for the touch pad on touch devices only', () => {
    const [plain] = boardAreas(2, false);
    const [touch] = boardAreas(2, true);
    expect(plain.maze.y + plain.maze.height).toBe(GAME_HEIGHT); // no pad, so the maze may run to the bottom edge
    expect(touch.maze.y + touch.maze.height).toBe(GAME_HEIGHT - VERSUS.padStrip);
  });
});

// Every level's maze must also fit into a versus half, with one spare cell on every side, with or without the touch strip.
describe('mazeLayout in a versus half', () => {
  it('fits every level into each half with one spare cell all round', () => {
    for (const touch of [false, true]) {
      for (const { maze: area } of boardAreas(2, touch)) {
        for (const size of SIZES) {
          const { cellSize, bounds } = mazeLayout(size, size, area);
          expect(bounds.x - cellSize).toBeGreaterThanOrEqual(area.x);
          expect(bounds.y - cellSize).toBeGreaterThanOrEqual(area.y);
          expect(bounds.x + bounds.width + cellSize).toBeLessThanOrEqual(area.x + area.width);
          expect(bounds.y + bounds.height + cellSize).toBeLessThanOrEqual(area.y + area.height);
        }
      }
    }
  });

  it('keeps the cells readable on the biggest maze even with the touch strip', () => {
    const [{ maze }] = boardAreas(2, true);
    expect(mazeLayout(mazeSizeForLevel(LEVEL_COUNT), mazeSizeForLevel(LEVEL_COUNT), maze).cellSize).toBeGreaterThanOrEqual(15);
  });

  it('gives both players the same cell size, so the same maze looks the same on both sides', () => {
    const [left, right] = boardAreas(2, true);
    for (const size of SIZES) {
      expect(mazeLayout(size, size, left.maze).cellSize).toBe(mazeLayout(size, size, right.maze).cellSize);
    }
  });
});

// The cross has up above the centre and down below it; the row runs left, up, down, right and sits inside the bottom strip of a half.
describe('touch pad layouts', () => {
  it('puts the four keys of a cross one step from the centre', () => {
    const { centers } = crossPadLayout({ x: 100, y: 200 }, 50, 10);
    expect(centers.up).toEqual({ x: 100, y: 140 }); // one step is a key (50) plus the gap (10)
    expect(centers.down).toEqual({ x: 100, y: 260 });
    expect(centers.left).toEqual({ x: 40, y: 200 });
    expect(centers.right).toEqual({ x: 160, y: 200 });
  });

  it('lines the keys of a row up left to right as left, up, down, right, centred on the middle', () => {
    const { centers } = rowPadLayout({ x: 300, y: 50 }, 40, 10);
    expect([centers.left.x, centers.up.x, centers.down.x, centers.right.x]).toEqual([225, 275, 325, 375]); // steps of 50 either side of 300
    for (const direction of ['left', 'up', 'down', 'right'] as const) expect(centers[direction].y).toBe(50);
  });

  it('uses the cross at the touch pad position for a solo player', () => {
    const layout = touchPadLayout(1, boardAreas(1, true)[0]);
    expect(layout.keySize).toBe(TOUCH_PAD.buttonSize);
    expect(layout.centers.up).toEqual({ x: TOUCH_PAD.x, y: TOUCH_PAD.y - (TOUCH_PAD.buttonSize + TOUCH_PAD.gap) });
  });

  it('keeps each versus pad inside its own half and in the strip under its maze', () => {
    for (const area of boardAreas(2, true)) {
      const { keySize, centers } = touchPadLayout(2, area);
      for (const { x, y } of Object.values(centers)) {
        expect(x - keySize / 2).toBeGreaterThanOrEqual(area.frame.x);
        expect(x + keySize / 2).toBeLessThanOrEqual(area.frame.x + area.frame.width);
        expect(y - keySize / 2).toBeGreaterThanOrEqual(area.maze.y + area.maze.height); // clear of the maze area
        expect(y + keySize / 2).toBeLessThanOrEqual(GAME_HEIGHT);
      }
    }
  });

  it('never lets two keys of a versus pad overlap', () => {
    const { keySize, centers } = touchPadLayout(2, boardAreas(2, true)[0]);
    const xs = Object.values(centers).map((point) => point.x).sort((a, b) => a - b);
    xs.forEach((x, index) => {
      if (index > 0) expect(x - xs[index - 1]).toBeGreaterThanOrEqual(keySize); // neighbouring key centres are at least a key apart
    });
  });
});
