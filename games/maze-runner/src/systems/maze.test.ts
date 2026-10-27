import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';
import { DIRECTIONS, Maze, generateMaze, stepCell, type Cell, type Direction, type Passage } from './maze';
import { createRng } from './rng';

const SIZES = Array.from({ length: LEVEL_COUNT }, (_, index) => mazeSizeForLevel(index + 1));
const SEEDS = [1, 7, 42, 1234, 987654];

/** Every maze size the game uses, each built from several seeds. */
const allMazes = (): Maze[] => SIZES.flatMap((size) => SEEDS.map((seed) => generateMaze(size, size, createRng(seed))));

function* cellsOf(maze: Maze): Generator<Cell> {
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) yield { col, row };
  }
}

/** Passages between two cells of the grid, each counted once (the exit gap leads outside, so it is skipped). */
function countPassages(maze: Maze): number {
  let count = 0;
  for (const cell of cellsOf(maze)) {
    for (const direction of ['right', 'down'] as const) {
      if (maze.canMove(cell, direction) && maze.contains(stepCell(cell, direction))) count++;
    }
  }
  return count;
}

const wallLength = (maze: Maze): number => maze.wallRuns().reduce((sum, run) => sum + run.to - run.from, 0);

const passage = (col: number, row: number, direction: Direction): Passage => ({ cell: { col, row }, direction });

/**
 * Hand-built 5x2 maze. S is the start, E the exit gap on the right of the bottom row,
 * and the top row is a dead-end branch that hangs off the bottom row at its second cell:
 *
 *   a - b - c - d - e
 *       |
 *   f - g - S - h - E
 */
function branchMaze(): Maze {
  const passages = [
    passage(0, 1, 'right'),
    passage(1, 1, 'right'),
    passage(2, 1, 'right'),
    passage(3, 1, 'right'),
    passage(0, 0, 'right'),
    passage(1, 0, 'right'),
    passage(2, 0, 'right'),
    passage(3, 0, 'right'),
    passage(1, 1, 'up'),
  ];
  return new Maze(5, 2, passages, { col: 2, row: 1 }, { cell: { col: 4, row: 1 }, side: 'right' });
}

describe('generateMaze', () => {
  it('carves a perfect maze: every cell is reachable and there are no loops', () => {
    for (const maze of allMazes()) {
      // A connected grid with exactly cells - 1 passages is a tree.
      expect(countPassages(maze)).toBe(maze.cols * maze.rows - 1);
      for (const cell of cellsOf(maze)) expect(maze.depthAt(cell)).toBeGreaterThanOrEqual(0);
    }
  });

  it('starts the runner in the middle of the grid', () => {
    for (const maze of allMazes()) {
      expect(maze.start).toEqual({ col: Math.floor(maze.cols / 2), row: Math.floor(maze.rows / 2) });
    }
  });

  it('opens exactly one gap in the outer wall, and it is the exit', () => {
    for (const maze of allMazes()) {
      let gaps = 0;
      for (const cell of cellsOf(maze)) {
        for (const direction of DIRECTIONS) {
          if (maze.canMove(cell, direction) && !maze.contains(stepCell(cell, direction))) gaps++;
        }
      }
      expect(gaps).toBe(1);
      expect(maze.canMove(maze.exit.cell, maze.exit.side)).toBe(true);
      expect(maze.contains(stepCell(maze.exit.cell, maze.exit.side))).toBe(false);
    }
  });

  it('never places the exit closer than a straight walk from the centre to the edge', () => {
    for (const maze of allMazes()) {
      expect(maze.solution.length - 1).toBeGreaterThanOrEqual(maze.cols / 2 - 1);
    }
  });

  it('repeats for the same seed and differs for another', () => {
    const first = generateMaze(12, 12, createRng(5));
    const same = generateMaze(12, 12, createRng(5));
    const other = generateMaze(12, 12, createRng(6));
    expect(same.exit).toEqual(first.exit);
    expect(same.solution).toEqual(first.solution);
    expect(other.solution).not.toEqual(first.solution);
  });

  it('uses every edge of the maze for the exit across many seeds', () => {
    const sides = new Set<Direction>();
    for (let seed = 0; seed < 60; seed++) sides.add(generateMaze(10, 10, createRng(seed)).exit.side);
    expect(sides.size).toBe(4);
  });
});

describe('Maze.solution', () => {
  it('runs from the start to the exit cell through open passages', () => {
    for (const maze of allMazes()) {
      const route = maze.solution;
      expect(route[0]).toEqual(maze.start);
      expect(route[route.length - 1]).toEqual(maze.exit.cell);
      for (let i = 1; i < route.length; i++) {
        const direction = DIRECTIONS.find((candidate) => {
          const next = stepCell(route[i - 1], candidate);
          return next.col === route[i].col && next.row === route[i].row;
        });
        expect(direction !== undefined && maze.canMove(route[i - 1], direction)).toBe(true);
      }
    }
  });

  it('is the short route in a hand-built maze', () => {
    expect(branchMaze().solution).toEqual([
      { col: 2, row: 1 },
      { col: 3, row: 1 },
      { col: 4, row: 1 },
    ]);
  });
});

describe('Maze.depthAt', () => {
  it('is 0 along the solution and changes by at most one step across any passage', () => {
    for (const maze of allMazes()) {
      for (const cell of maze.solution) expect(maze.depthAt(cell)).toBe(0);
      for (const cell of cellsOf(maze)) {
        for (const direction of ['right', 'down'] as const) {
          const next = stepCell(cell, direction);
          if (maze.canMove(cell, direction) && maze.contains(next)) {
            expect(Math.abs(maze.depthAt(cell) - maze.depthAt(next))).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('counts steps away from the solution in a hand-built maze', () => {
    const maze = branchMaze();
    const row = (index: number): number[] => [0, 1, 2, 3, 4].map((col) => maze.depthAt({ col, row: index }));
    expect(row(1)).toEqual([2, 1, 0, 0, 0]);
    expect(row(0)).toEqual([3, 2, 3, 4, 5]);
  });
});

describe('Maze.seal', () => {
  it('closes the wall from both sides and leaves the route to the exit open', () => {
    const maze = branchMaze();
    maze.seal({ col: 1, row: 0 }, 'right');
    expect(maze.canMove({ col: 1, row: 0 }, 'right')).toBe(false);
    expect(maze.canMove({ col: 2, row: 0 }, 'left')).toBe(false);
    expect(maze.canMove({ col: 2, row: 1 }, 'right')).toBe(true);
  });

  it('adds one unit of wall', () => {
    const maze = branchMaze();
    const before = wallLength(maze);
    maze.seal({ col: 3, row: 0 }, 'right');
    expect(wallLength(maze)).toBe(before + 1);
  });
});

describe('Maze.wallRuns', () => {
  it('accounts for every closed edge of the grid', () => {
    for (const maze of allMazes()) {
      const { cols, rows } = maze;
      const edges = (cols - 1) * rows + cols * (rows - 1) + 2 * (cols + rows); // inner edges plus the outer wall
      const open = cols * rows - 1 + 1; // the tree's passages plus the exit gap
      expect(wallLength(maze)).toBe(edges - open);
    }
  });

  it('merges neighbouring edges into single runs', () => {
    const runs = branchMaze().wallRuns();
    // The top edge of the 5-wide grid is one unbroken run, not five separate edges.
    expect(runs).toContainEqual({ horizontal: true, line: 0, from: 0, to: 5 });
  });
});
