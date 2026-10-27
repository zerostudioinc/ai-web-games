/**
 * Tests for the maze model: generation, the solution route, dead-end depth, sealing a passage and merging walls into runs.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';
import { DIRECTIONS, Maze, generateMaze, stepCell, type Cell, type Direction, type Passage } from './maze';
import { createRng } from './rng';

// Cells per side of the square maze on each level, from the first to the last.
const SIZES = Array.from({ length: LEVEL_COUNT }, (_, index) => mazeSizeForLevel(index + 1));
// Seeds for the random source; every size is built from each one, so many different mazes get checked.
const SEEDS = [1, 7, 42, 1234, 987654];

/**
 * Every maze size the game uses, each built from several seeds.
 *
 * @returns One maze per size and seed pair: one size per level, each built from every seed in `SEEDS`.
 */
const allMazes = (): Maze[] => SIZES.flatMap((size) => SEEDS.map((seed) => generateMaze(size, size, createRng(seed))));

/**
 * Walks every cell of a maze's grid, row by row from the top-left.
 *
 * @param maze - The maze whose cells are listed.
 * @returns A generator of 0-based cells: left to right within a row, rows from the top.
 */
function* cellsOf(maze: Maze): Generator<Cell> {
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) yield { col, row };
  }
}

/**
 * Passages between two cells of the grid, each counted once (the exit gap leads outside, so it is skipped).
 *
 * @param maze - The maze to count in.
 * @returns The number of open walls between neighbouring cells; a connected maze without loops has `cols * rows - 1`.
 */
function countPassages(maze: Maze): number {
  let count = 0;
  for (const cell of cellsOf(maze)) {
    for (const direction of ['right', 'down'] as const) {
      // Looking only right and down visits each shared wall once instead of twice.
      if (maze.canMove(cell, direction) && maze.contains(stepCell(cell, direction))) count++;
    }
  }
  return count;
}

/**
 * Total length of the maze's wall runs, which is the number of closed cell edges (the outer wall included).
 *
 * @param maze - The maze to measure.
 * @returns The sum of `to - from` over every run from `wallRuns()`, in cell edges.
 */
const wallLength = (maze: Maze): number => maze.wallRuns().reduce((sum, run) => sum + run.to - run.from, 0);

/**
 * Shorthand for an open gap on one side of a cell.
 *
 * @param col - 0-based column of the cell.
 * @param row - 0-based row of the cell.
 * @param direction - Which side of that cell is open; the neighbour on that side is open back.
 * @returns The passage description that the `Maze` constructor takes.
 */
const passage = (col: number, row: number, direction: Direction): Passage => ({ cell: { col, row }, direction });

/**
 * Hand-built 5x2 maze. S is the start, E the exit gap on the right of the bottom row,
 * and the top row is a dead-end branch that hangs off the bottom row at its second cell:
 *
 *   a - b - c - d - e
 *       |
 *   f - g - S - h - E
 *
 * Letters name cells: a to e are columns 0 to 4 of the top row (row 0), f to E columns 0 to 4 of the bottom row (row 1).
 *
 * @returns The maze, with the start at col 2, row 1 and the exit gap on the right side of col 4, row 1.
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

// Every generated maze is perfect, starts in the middle, has a single exit gap, and is reproducible from its seed.
describe('generateMaze', () => {
  it('carves a perfect maze: every cell is reachable and there are no loops', () => {
    for (const maze of allMazes()) {
      // A connected grid with exactly cells - 1 passages is a tree.
      expect(countPassages(maze)).toBe(maze.cols * maze.rows - 1);
      // depthAt is -1 for a cell nothing leads to, so >= 0 for every cell shows the whole grid is connected.
      for (const cell of cellsOf(maze)) expect(maze.depthAt(cell)).toBeGreaterThanOrEqual(0);
    }
  });

  it('starts the runner in the middle of the grid', () => {
    for (const maze of allMazes()) {
      // The 0-based middle cell; for an even size such as 10 that is column 5, row 5.
      expect(maze.start).toEqual({ col: Math.floor(maze.cols / 2), row: Math.floor(maze.rows / 2) });
    }
  });

  it('opens exactly one gap in the outer wall, and it is the exit', () => {
    for (const maze of allMazes()) {
      let gaps = 0;
      for (const cell of cellsOf(maze)) {
        for (const direction of DIRECTIONS) {
          // An open side whose neighbour lies outside the grid is a gap in the outer wall.
          if (maze.canMove(cell, direction) && !maze.contains(stepCell(cell, direction))) gaps++;
        }
      }
      expect(gaps).toBe(1);
      // That one gap must be the recorded exit: open, and leading out of the grid.
      expect(maze.canMove(maze.exit.cell, maze.exit.side)).toBe(true);
      expect(maze.contains(stepCell(maze.exit.cell, maze.exit.side))).toBe(false);
    }
  });

  it('never places the exit closer than a straight walk from the centre to the edge', () => {
    for (const maze of allMazes()) {
      // `solution` lists cells, so its length minus 1 is the number of steps. All sizes here are even, and the nearest
      // edge cell to the start is then cols / 2 - 1 steps away (4 on a 10 x 10 maze: column 5 to column 9).
      expect(maze.solution.length - 1).toBeGreaterThanOrEqual(maze.cols / 2 - 1);
    }
  });

  it('repeats for the same seed and differs for another', () => {
    const first = generateMaze(12, 12, createRng(5));
    const same = generateMaze(12, 12, createRng(5)); // same seed as `first`
    const other = generateMaze(12, 12, createRng(6)); // a different seed
    expect(same.exit).toEqual(first.exit);
    expect(same.solution).toEqual(first.solution);
    expect(other.solution).not.toEqual(first.solution);
  });

  it('uses every edge of the maze for the exit across many seeds', () => {
    const sides = new Set<Direction>();
    // Record which outer side the exit lands on for 60 different seeds; all four sides must turn up.
    for (let seed = 0; seed < 60; seed++) sides.add(generateMaze(10, 10, createRng(seed)).exit.side);
    expect(sides.size).toBe(4);
  });
});

// The solution is the single route from the start to the exit, walking only through open passages.
describe('Maze.solution', () => {
  it('runs from the start to the exit cell through open passages', () => {
    for (const maze of allMazes()) {
      const route = maze.solution;
      expect(route[0]).toEqual(maze.start); // begins at the start...
      expect(route[route.length - 1]).toEqual(maze.exit.cell); // ...and ends in the exit cell
      for (let i = 1; i < route.length; i++) {
        // The direction that steps from the previous route cell to this one; undefined if the two are not neighbours.
        const direction = DIRECTIONS.find((candidate) => {
          const next = stepCell(route[i - 1], candidate);
          return next.col === route[i].col && next.row === route[i].row;
        });
        // Consecutive route cells must be neighbours with an open wall between them.
        expect(direction !== undefined && maze.canMove(route[i - 1], direction)).toBe(true);
      }
    }
  });

  it('is the short route in a hand-built maze', () => {
    // S (col 2, row 1), then h (col 3, row 1), then E (col 4, row 1); the top-row branch is not on the route.
    expect(branchMaze().solution).toEqual([
      { col: 2, row: 1 },
      { col: 3, row: 1 },
      { col: 4, row: 1 },
    ]);
  });
});

// depthAt counts the steps from the solution route: 0 on the route, rising along a dead-end branch.
describe('Maze.depthAt', () => {
  it('is 0 along the solution and changes by at most one step across any passage', () => {
    for (const maze of allMazes()) {
      for (const cell of maze.solution) expect(maze.depthAt(cell)).toBe(0);
      for (const cell of cellsOf(maze)) {
        for (const direction of ['right', 'down'] as const) {
          // Right and down only, so each passage is checked once; the two cells it joins are at most 1 step apart in depth.
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
    /**
     * Depth of every cell in one row of the hand-built maze.
     *
     * @param index - 0-based row: 0 is the top row (a to e), 1 the bottom row (f to E).
     * @returns The depth of each cell, columns 0 to 4 from the left.
     */
    const row = (index: number): number[] => [0, 1, 2, 3, 4].map((col) => maze.depthAt({ col, row: index }));
    // Bottom row f g S h E: S, h and E are on the route, g is 1 step from S and f is 2.
    expect(row(1)).toEqual([2, 1, 0, 0, 0]);
    // Top row a b c d e: the branch joins the bottom row through b-g, so b is 2 steps from S and the depth then counts up
    // along the branch (a 3, c 3, d 4, e 5). c sits right above S, but no passage joins them.
    expect(row(0)).toEqual([3, 2, 3, 4, 5]);
  });
});

// Sealing closes a passage from both of its sides, as when a dead end collapses: it adds one unit of wall and leaves other routes open.
describe('Maze.seal', () => {
  it('closes the wall from both sides and leaves the route to the exit open', () => {
    const maze = branchMaze();
    maze.seal({ col: 1, row: 0 }, 'right'); // wall off the gap between b and c on the top row
    expect(maze.canMove({ col: 1, row: 0 }, 'right')).toBe(false); // closed on b's side
    expect(maze.canMove({ col: 2, row: 0 }, 'left')).toBe(false); // and on c's side
    expect(maze.canMove({ col: 2, row: 1 }, 'right')).toBe(true); // S can still step towards the exit
  });

  it('adds one unit of wall', () => {
    const maze = branchMaze();
    const before = wallLength(maze);
    maze.seal({ col: 3, row: 0 }, 'right'); // wall off the gap between d and e
    expect(wallLength(maze)).toBe(before + 1); // that closes exactly one more cell edge
  });
});

// Wall runs cover every closed cell edge, merged into long straight runs.
describe('Maze.wallRuns', () => {
  it('accounts for every closed edge of the grid', () => {
    for (const maze of allMazes()) {
      const { cols, rows } = maze;
      const edges = (cols - 1) * rows + cols * (rows - 1) + 2 * (cols + rows); // inner edges (cols - 1 per row, rows - 1 per column) plus the outer wall
      const open = cols * rows - 1 + 1; // the tree's passages plus the exit gap
      expect(wallLength(maze)).toBe(edges - open); // closed edges = all edges - open edges
    }
  });

  it('merges neighbouring edges into single runs', () => {
    const runs = branchMaze().wallRuns();
    // The top edge of the 5-wide grid is one unbroken run, not five separate edges.
    expect(runs).toContainEqual({ horizontal: true, line: 0, from: 0, to: 5 }); // row line 0 is the top outer wall, columns 0 to 5 (end exclusive)
  });
});
