// Maze model: generation, solution route, dead-end depth and wall geometry. Pure logic, no Phaser.
import { pick, type Random } from './rng';

export type Direction = 'up' | 'right' | 'down' | 'left';

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

export const OPPOSITE: Record<Direction, Direction> = { up: 'down', right: 'left', down: 'up', left: 'right' };

export interface Cell {
  col: number;
  row: number;
}

/** An open gap in the wall on one side of a cell. */
export interface Passage {
  cell: Cell;
  direction: Direction;
}

/** The only gap in the outer wall: leaving `cell` through its `side` escapes the maze. */
export interface MazeExit {
  cell: Cell;
  side: Direction;
}

/**
 * A straight stretch of wall. Horizontal runs sit on a row line and vertical runs on a column line;
 * `from` (inclusive) and `to` (exclusive) are grid-line coordinates along the run.
 */
export interface WallRun {
  horizontal: boolean;
  line: number;
  from: number;
  to: number;
}

/** Share of carving steps that continue from the newest cell: higher gives longer, windier corridors. */
const NEWEST_BIAS = 0.75;

// Grid offset of one step (rows grow downward) and the bit that marks that side of a cell as open.
const OFFSET: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  right: { col: 1, row: 0 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
};
const OPEN_BIT: Record<Direction, number> = { up: 1, right: 2, down: 4, left: 8 };

/** The cell one step away; it may lie outside the grid (that is how the exit works). */
export const stepCell = (cell: Cell, direction: Direction): Cell => ({
  col: cell.col + OFFSET[direction].col,
  row: cell.row + OFFSET[direction].row,
});

/** Turns a list of passages into one open-side bit mask per cell, marking both cells of every passage. */
function buildOpen(cols: number, rows: number, passages: readonly Passage[]): Uint8Array {
  const open = new Uint8Array(cols * rows);
  for (const { cell, direction } of passages) {
    const next = stepCell(cell, direction);
    open[cell.row * cols + cell.col] |= OPEN_BIT[direction];
    open[next.row * cols + next.col] |= OPEN_BIT[OPPOSITE[direction]];
  }
  return open;
}

/**
 * Breadth-first search over open passages from one or more source cells.
 * Gives every reachable cell its step distance (-1 if unreachable) and the cell it was reached from.
 */
function flood(cols: number, rows: number, open: Uint8Array, sources: readonly Cell[]): { distance: Int16Array; parent: Int32Array } {
  const distance = new Int16Array(cols * rows).fill(-1);
  const parent = new Int32Array(cols * rows).fill(-1);
  const queue: number[] = [];
  for (const source of sources) {
    const index = source.row * cols + source.col;
    distance[index] = 0;
    queue.push(index);
  }

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const cell = { col: index % cols, row: Math.floor(index / cols) };
    for (const direction of DIRECTIONS) {
      if ((open[index] & OPEN_BIT[direction]) === 0) continue;
      const next = stepCell(cell, direction);
      // The exit gap leads outside the grid, which is not part of the search.
      if (next.col < 0 || next.col >= cols || next.row < 0 || next.row >= rows) continue;
      const nextIndex = next.row * cols + next.col;
      if (distance[nextIndex] >= 0) continue;
      distance[nextIndex] = distance[index] + 1;
      parent[nextIndex] = index;
      queue.push(nextIndex);
    }
  }
  return { distance, parent };
}

/** Follows parent links back from `end`, returning the route from the search source to `end`. */
function tracePath(cols: number, parent: Int32Array, end: Cell): Cell[] {
  const path: Cell[] = [];
  for (let index = end.row * cols + end.col; index >= 0; index = parent[index]) {
    path.push({ col: index % cols, row: Math.floor(index / cols) });
  }
  return path.reverse();
}

/**
 * Carves a perfect maze (every cell reachable, exactly one route between any two) with the growing-tree method.
 * Mixing "newest cell" and "random cell" picks gives long corridors with plenty of junctions and dead ends.
 */
function carve(cols: number, rows: number, start: Cell, random: Random): Passage[] {
  const visited = new Uint8Array(cols * rows);
  const isFree = (cell: Cell): boolean =>
    cell.col >= 0 && cell.col < cols && cell.row >= 0 && cell.row < rows && visited[cell.row * cols + cell.col] === 0;

  const passages: Passage[] = [];
  const active: Cell[] = [start];
  visited[start.row * cols + start.col] = 1;

  while (active.length > 0) {
    const at = random() < NEWEST_BIAS ? active.length - 1 : Math.floor(random() * active.length);
    const cell = active[at];
    const free = DIRECTIONS.filter((direction) => isFree(stepCell(cell, direction)));
    if (free.length === 0) {
      // Nothing left to carve from here.
      active.splice(at, 1);
      continue;
    }
    const direction = pick(random, free);
    const next = stepCell(cell, direction);
    visited[next.row * cols + next.col] = 1;
    passages.push({ cell, direction });
    active.push(next);
  }
  return passages;
}

/** Picks a random gap on the outer wall, favouring the farther half of the perimeter so the exit is never a short dash. */
function chooseExit(cols: number, rows: number, distance: Int16Array, random: Random): MazeExit {
  const candidates: { exit: MazeExit; steps: number }[] = [];
  const add = (cell: Cell, side: Direction): void => {
    candidates.push({ exit: { cell, side }, steps: distance[cell.row * cols + cell.col] });
  };
  for (let col = 0; col < cols; col++) {
    add({ col, row: 0 }, 'up');
    add({ col, row: rows - 1 }, 'down');
  }
  for (let row = 0; row < rows; row++) {
    add({ col: 0, row }, 'left');
    add({ col: cols - 1, row }, 'right');
  }
  candidates.sort((a, b) => b.steps - a.steps);
  return pick(random, candidates.slice(0, Math.ceil(candidates.length / 2))).exit;
}

export class Maze {
  /** The one route from the start to the exit cell, both ends included. */
  readonly solution: readonly Cell[];
  private readonly open: Uint8Array;
  /** Steps from each cell to the solution route (0 on the route itself); drives the dead-end rule. */
  private readonly depths: Int16Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
    passages: readonly Passage[],
    readonly start: Cell,
    readonly exit: MazeExit,
  ) {
    this.open = buildOpen(cols, rows, passages);
    // The exit is a gap in the outer wall, so only its own side opens.
    this.open[exit.cell.row * cols + exit.cell.col] |= OPEN_BIT[exit.side];
    this.solution = tracePath(cols, flood(cols, rows, this.open, [start]).parent, exit.cell);
    this.depths = flood(cols, rows, this.open, this.solution).distance;
  }

  contains(cell: Cell): boolean {
    return cell.col >= 0 && cell.col < this.cols && cell.row >= 0 && cell.row < this.rows;
  }

  /** True when the wall on that side of `cell` is open. Only the exit cell is open to the outside. */
  canMove(cell: Cell, direction: Direction): boolean {
    return this.contains(cell) && (this.open[this.index(cell)] & OPEN_BIT[direction]) !== 0;
  }

  /** How many steps `cell` lies from the solution route; 0 means the runner is on the right track. */
  depthAt(cell: Cell): number {
    return this.depths[this.index(cell)];
  }

  /** Walls off one side of `cell` and the matching side of its neighbour, as when a dead end collapses. */
  seal(cell: Cell, direction: Direction): void {
    this.open[this.index(cell)] &= ~OPEN_BIT[direction];
    const next = stepCell(cell, direction);
    if (this.contains(next)) this.open[this.index(next)] &= ~OPEN_BIT[OPPOSITE[direction]];
  }

  /** Merges neighbouring wall edges into long runs so the maze can be drawn with far fewer shapes. */
  wallRuns(): WallRun[] {
    const runs: WallRun[] = [];
    for (const horizontal of [true, false]) {
      // Horizontal walls lie on row lines 0..rows; vertical walls on column lines 0..cols.
      const lines = (horizontal ? this.rows : this.cols) + 1;
      const length = horizontal ? this.cols : this.rows;
      for (let line = 0; line < lines; line++) {
        let from = -1;
        for (let index = 0; index <= length; index++) {
          // The extra iteration past the end closes a run that reaches the edge.
          const walled = index < length && this.isWalled(horizontal, line, index);
          if (walled && from < 0) from = index;
          if (!walled && from >= 0) {
            runs.push({ horizontal, line, from, to: index });
            from = -1;
          }
        }
      }
    }
    return runs;
  }

  private index(cell: Cell): number {
    return cell.row * this.cols + cell.col;
  }

  /** Is the grid edge at position `index` along `line` closed? */
  private isWalled(horizontal: boolean, line: number, index: number): boolean {
    if (horizontal) {
      // Row line `line` is the top of row `line`, or the bottom of the last row.
      return line < this.rows
        ? !this.canMove({ col: index, row: line }, 'up')
        : !this.canMove({ col: index, row: this.rows - 1 }, 'down');
    }
    return line < this.cols
      ? !this.canMove({ col: line, row: index }, 'left')
      : !this.canMove({ col: this.cols - 1, row: index }, 'right');
  }
}

/** Builds a random maze with the runner's start in the middle and a single exit somewhere on the outer wall. */
export function generateMaze(cols: number, rows: number, random: Random): Maze {
  const start = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  const passages = carve(cols, rows, start, random);
  const { distance } = flood(cols, rows, buildOpen(cols, rows, passages), [start]);
  return new Maze(cols, rows, passages, start, chooseExit(cols, rows, distance, random));
}
