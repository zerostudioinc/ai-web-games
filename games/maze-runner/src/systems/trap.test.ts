import { describe, expect, it } from 'vitest';
import { Maze, type Direction, type Passage } from './maze';
import { isTrapImminent, isTrapped } from './trap';

const passage = (col: number, row: number, direction: Direction): Passage => ({ cell: { col, row }, direction });

// Same hand-built 5x2 maze as in maze.test.ts: a bottom row to the exit and a dead-end branch along the top row.
//   a - b - c - d - e
//       |
//   f - g - S - h - E
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

describe('isTrapped', () => {
  it('springs once the depth reaches the limit', () => {
    expect([4, 5, 6].map((depth) => isTrapped(depth, 5))).toEqual([false, true, true]);
    expect([1, 2].map((depth) => isTrapped(depth, 2))).toEqual([false, true]);
  });

  it('never springs on the solution route', () => {
    expect(isTrapped(0, 2)).toBe(false);
  });
});

describe('isTrapImminent', () => {
  it('warns one step before the limit when the branch goes deeper', () => {
    expect(isTrapImminent(maze, { col: 3, row: 0 }, 5)).toBe(true); // depth 4, and the cell beyond is deeper
    expect(isTrapImminent(maze, { col: 1, row: 1 }, 2)).toBe(true); // Hard: depth 1, the branch continues
  });

  it('stays quiet while further from the limit', () => {
    expect(isTrapImminent(maze, { col: 2, row: 0 }, 5)).toBe(false); // depth 3
  });

  it('stays quiet at the end of a short dead end', () => {
    expect(isTrapImminent(maze, { col: 0, row: 1 }, 3)).toBe(false); // depth 2 = limit - 1, but nothing lies deeper
  });

  it('stays quiet on the solution route', () => {
    expect(isTrapImminent(maze, { col: 2, row: 1 }, 2)).toBe(false);
    expect(isTrapImminent(maze, { col: 4, row: 1 }, 2)).toBe(false); // the exit cell has an open gap but sits on the route
  });
});
