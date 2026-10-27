/**
 * Tests for the dead-end rule: when the trap springs, and when the one-step warning appears.
 */
import { describe, expect, it } from 'vitest';
import { Maze, type Direction, type Passage } from './maze';
import { isTrapImminent, isTrapped } from './trap';

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
    expect([4, 5, 6].map((depth) => isTrapped(depth, 5))).toEqual([false, true, true]); // Normal's limit of 5: depth 4 is safe, 5 and 6 are trapped
    expect([1, 2].map((depth) => isTrapped(depth, 2))).toEqual([false, true]); // Hard's limit of 2: depth 1 is safe, 2 is trapped
  });

  it('never springs on the solution route', () => {
    expect(isTrapped(0, 2)).toBe(false); // depth 0 is on the route, below any limit
  });
});

// The warning shows one step before the limit, but only where a deeper step exists and never on the solution route.
describe('isTrapImminent', () => {
  it('warns one step before the limit when the branch goes deeper', () => {
    expect(isTrapImminent(maze, { col: 3, row: 0 }, 5)).toBe(true); // d: depth 4 is one short of the limit 5, and the cell beyond (e, depth 5) is deeper
    expect(isTrapImminent(maze, { col: 1, row: 1 }, 2)).toBe(true); // Hard (limit 2): g has depth 1, and the branch continues to f and b
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
