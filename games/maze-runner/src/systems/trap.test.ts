/**
 * Tests for the dead-end rule: when the trap springs, when the one-step warning would apply, and which difficulties show it.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_SETTINGS } from './difficulty';
import { Maze, type Direction, type Passage } from './maze';
import { isTrapImminent, isTrapped, shouldWarn } from './trap';

/**
 * Shorthand for an open gap on one side of a cell.
 *
 * @param col - 0-based column of the cell.
 * @param row - 0-based row of the cell.
 * @param direction - Which side of that cell is open; the neighbour on that side is open back.
 * @returns The passage description that the `Maze` constructor takes.
 */
const passage = (col: number, row: number, direction: Direction): Passage => ({ cell: { col, row }, direction });

// Same hand-built 5x2 maze as in maze.test.ts: a bottom row to the exit and a dead-end branch along the top row.
//   a - b - c - d - e
//       |
//   f - g - S - h - E
// Letters name cells: a to e are columns 0 to 4 of the top row (row 0), f to E columns 0 to 4 of the bottom row (row 1).
// Depth from the solution route (S, h, E): bottom row f g S h E = 2 1 0 0 0, top row a b c d e = 3 2 3 4 5.
const maze = new Maze(
  5,
  2,
  [
    passage(0, 1, 'right'),
    passage(1, 1, 'right'),
    passage(2, 1, 'right'),
    passage(3, 1, 'right'),
    passage(0, 0, 'right'),
    passage(1, 0, 'right'),
    passage(2, 0, 'right'),
    passage(3, 0, 'right'),
    passage(1, 1, 'up'),
  ],
  { col: 2, row: 1 },
  { cell: { col: 4, row: 1 }, side: 'right' },
);

// The trap springs once the depth into a dead end reaches the difficulty's limit.
describe('isTrapped', () => {
  it('springs once the depth reaches the limit', () => {
    expect([5, 6, 7].map((depth) => isTrapped(depth, 6))).toEqual([false, true, true]); // Easy's limit of 6: depth 5 is safe, 6 and 7 are trapped
    expect([3, 4, 5].map((depth) => isTrapped(depth, 4))).toEqual([false, true, true]); // Normal's limit of 4: depth 3 is safe, 4 and 5 are trapped
    expect([1, 2].map((depth) => isTrapped(depth, 2))).toEqual([false, true]); // The limit of 2 on Hard and Very Hard: depth 1 is safe, 2 is trapped
  });

  it('never springs on the solution route', () => {
    expect(isTrapped(0, 2)).toBe(false); // depth 0 is on the route, below any limit
  });
});

// The warning shows one step before the limit, but only where a deeper step exists and never on the solution route.
describe('isTrapImminent', () => {
  it('warns one step before the limit when the branch goes deeper', () => {
    expect(isTrapImminent(maze, { col: 3, row: 0 }, 5)).toBe(true); // d: depth 4 is one short of the limit 5, and the cell beyond (e, depth 5) is deeper
    expect(isTrapImminent(maze, { col: 1, row: 1 }, 2)).toBe(true); // limit 2: g has depth 1, and the branch continues to f and b
  });

  it('stays quiet while further from the limit', () => {
    expect(isTrapImminent(maze, { col: 2, row: 0 }, 5)).toBe(false); // c: depth 3, two short of the limit 5 (a warning needs depth 4)
  });

  it('stays quiet at the end of a short dead end', () => {
    expect(isTrapImminent(maze, { col: 0, row: 1 }, 3)).toBe(false); // f: depth 2 = limit - 1, but nothing lies deeper (f is the tip of a short dead end)
  });

  it('stays quiet on the solution route', () => {
    expect(isTrapImminent(maze, { col: 2, row: 1 }, 2)).toBe(false); // S, the start: depth 0, on the route
    expect(isTrapImminent(maze, { col: 4, row: 1 }, 2)).toBe(false); // E, the exit cell, has an open gap but sits on the route
  });
});

/**
 * A long dead end for testing the real difficulty settings. The bottom row is the route from the start (S) to the exit (E);
 * the top row is a dead-end corridor leaving from the start, so the top-row cell in column c has depth c + 1.
 *
 *   0 - 1 - 2 - 3 - 4 - 5 - 6 - 7      top row: depth 1 to 8
 *   |
 *   S - . - . - . - . - . - . - E      bottom row: the route, depth 0
 */
const longMaze = new Maze(
  8,
  2,
  [
    ...Array.from({ length: 7 }, (_, col) => passage(col, 1, 'right')), // along the route
    ...Array.from({ length: 7 }, (_, col) => passage(col, 0, 'right')), // along the dead end
    passage(0, 1, 'up'), // from the start into the dead end
  ],
  { col: 0, row: 1 },
  { cell: { col: 7, row: 1 }, side: 'right' },
);

// Only a difficulty that warns shows the warning, and only one step before the trap; the others stay silent however close it is.
describe('shouldWarn', () => {
  it('warns one step before the trap on Easy, whose limit is 6', () => {
    expect(shouldWarn(longMaze, { col: 4, row: 0 }, DIFFICULTY_SETTINGS.easy)).toBe(true); // depth 5, and the next cell (depth 6) is deeper
    expect(shouldWarn(longMaze, { col: 3, row: 0 }, DIFFICULTY_SETTINGS.easy)).toBe(false); // depth 4: still two steps short
  });

  it('stays silent on Normal one step before its limit of 4, although the trap really is there', () => {
    const cell = { col: 2, row: 0 }; // depth 3
    expect(isTrapImminent(longMaze, cell, DIFFICULTY_SETTINGS.normal.trapDepth)).toBe(true);
    expect(shouldWarn(longMaze, cell, DIFFICULTY_SETTINGS.normal)).toBe(false);
  });

  it('stays silent on Hard one step before its limit of 2, although the trap really is there', () => {
    const cell = { col: 0, row: 0 }; // depth 1
    expect(isTrapImminent(longMaze, cell, DIFFICULTY_SETTINGS.hard.trapDepth)).toBe(true);
    expect(shouldWarn(longMaze, cell, DIFFICULTY_SETTINGS.hard)).toBe(false);
  });

  it('never warns anywhere in the maze on Normal, Hard or Very Hard', () => {
    for (const settings of [DIFFICULTY_SETTINGS.normal, DIFFICULTY_SETTINGS.hard, DIFFICULTY_SETTINGS.veryHard]) {
      for (let col = 0; col < 8; col++) {
        for (const row of [0, 1]) expect(shouldWarn(longMaze, { col, row }, settings)).toBe(false);
      }
    }
  });
});
