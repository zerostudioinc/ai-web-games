/**
 * Maze model: generation, solution route, dead-end depth and wall geometry. Pure logic, no Phaser.
 */
import { pick, type Random } from './rng';

/** A side of a cell, or a direction of travel. */
export type Direction = 'up' | 'right' | 'down' | 'left';

/** All four directions in a fixed order; seeded random picks index into it, and input tie-breaks favour later entries. */
export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

/** The direction that faces the other way; it names the matching side of a neighbouring cell. */
export const OPPOSITE: Record<Direction, Direction> = { up: 'down', right: 'left', down: 'up', left: 'right' };

/** One square of the maze grid. */
export interface Cell {
  col: number; // 0-based column, counted from the left
  row: number; // 0-based row, counted from the top
}

/** An open gap in the wall on one side of a cell. */
export interface Passage {
  cell: Cell; // the cell the gap belongs to
  direction: Direction; // which side of `cell` is open; the neighbour on that side is open back
}

/** The only gap in the outer wall: leaving `cell` through its `side` escapes the maze. */
export interface MazeExit {
  cell: Cell; // the edge cell that holds the gap
  side: Direction; // which side of `cell` faces out of the grid
}

/**
 * A straight stretch of wall. Horizontal runs sit on a row line and vertical runs on a column line;
 * `from` (inclusive) and `to` (exclusive) are grid-line coordinates along the run.
 */
export interface WallRun {
  horizontal: boolean; // true for a run along a row line (left to right), false for one along a column line (top to bottom)
  line: number; // which grid line the run sits on: 0..rows for horizontal runs, 0..cols for vertical runs
  from: number; // where the run starts along the line, in cells from the top-left (inclusive)
  to: number; // where the run ends along the line, in cells from the top-left (exclusive)
}

/** Share of carving steps that continue from the newest cell: higher gives longer, windier corridors. */
const NEWEST_BIAS = 0.75;

/** Grid offset of one step in each direction (rows grow downward). */
const OFFSET: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  right: { col: 1, row: 0 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
};

/** The bit that marks each side of a cell as open in that cell's mask. */
const OPEN_BIT: Record<Direction, number> = { up: 1, right: 2, down: 4, left: 8 };

/**
 * The cell one step away; it may lie outside the grid (that is how the exit works).
 *
 * @param cell - The cell to step from.
 * @param direction - Which way to step.
 * @returns The neighbouring cell on that side, as a new object.
 */
export const stepCell = (cell: Cell, direction: Direction): Cell => ({
  col: cell.col + OFFSET[direction].col,
  row: cell.row + OFFSET[direction].row,
});

/**
 * Turns a list of passages into one open-side bit mask per cell, marking both cells of every passage.
 *
 * @param cols - Grid width in cells.
 * @param rows - Grid height in cells.
 * @param passages - Open gaps between neighbouring cells; each must join two cells inside the grid.
 * @returns Row-major masks (index `row * cols + col`) of `OPEN_BIT` flags for each cell.
 */
function buildOpen(cols: number, rows: number, passages: readonly Passage[]): Uint8Array {
  const open = new Uint8Array(cols * rows);
  for (const { cell, direction } of passages) {
    const next = stepCell(cell, direction);
    // Open the side facing the neighbour here, and the side facing back on the neighbour.
    open[cell.row * cols + cell.col] |= OPEN_BIT[direction];
    open[next.row * cols + next.col] |= OPEN_BIT[OPPOSITE[direction]];
  }
  return open;
}

/**
 * Breadth-first search over open passages from one or more source cells.
 * Gives every reachable cell its step distance (-1 if unreachable) and the cell it was reached from.
 *
 * @param cols - Grid width in cells.
 * @param rows - Grid height in cells.
 * @param open - Per-cell open-side masks, as built by `buildOpen`.
 * @param sources - Cells the search starts from, all at distance 0; with several, the search spreads from all of them at once.
 * @returns `distance`: steps from the nearest source (-1 if unreachable). `parent`: flat index of the cell each cell was
 *   reached from (-1 for sources and unreachable cells). Both arrays are row-major.
 */
function flood(cols: number, rows: number, open: Uint8Array, sources: readonly Cell[]): { distance: Int16Array; parent: Int32Array } {
  const distance = new Int16Array(cols * rows).fill(-1);
  const parent = new Int32Array(cols * rows).fill(-1);
  // Flat cell indices still to expand; `head` walks along it, so nothing is ever shifted out.
  const queue: number[] = [];
  for (const source of sources) {
    const index = source.row * cols + source.col;
    distance[index] = 0;
    queue.push(index);
  }

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    // Convert the flat index back into a column and row.
    const cell = { col: index % cols, row: Math.floor(index / cols) };
    for (const direction of DIRECTIONS) {
      if ((open[index] & OPEN_BIT[direction]) === 0) continue;
      const next = stepCell(cell, direction);
      // The exit gap leads outside the grid, which is not part of the search.
      if (next.col < 0 || next.col >= cols || next.row < 0 || next.row >= rows) continue;
      const nextIndex = next.row * cols + next.col;
      // Already reached; breadth-first order means the first visit was the shortest.
      if (distance[nextIndex] >= 0) continue;
      distance[nextIndex] = distance[index] + 1;
      parent[nextIndex] = index;
      queue.push(nextIndex);
    }
  }
  return { distance, parent };
}

/**
 * Follows parent links back from `end`, returning the route from the search source to `end`.
 *
 * @param cols - Grid width in cells.
 * @param parent - Parent table from `flood`; -1 marks a source, where the walk back stops.
 * @param end - The cell the route finishes at.
 * @returns The route's cells in walking order, search source first and `end` last.
 */
function tracePath(cols: number, parent: Int32Array, end: Cell): Cell[] {
  const path: Cell[] = [];
  // Walk from the end back to the source, then flip the list into walking order.
  for (let index = end.row * cols + end.col; index >= 0; index = parent[index]) {
    path.push({ col: index % cols, row: Math.floor(index / cols) });
  }
  return path.reverse();
}

/**
 * Carves a perfect maze (every cell reachable, exactly one route between any two) with the growing-tree method.
 * Mixing "newest cell" and "random cell" picks gives long corridors with plenty of junctions and dead ends.
 *
 * @param cols - Grid width in cells.
 * @param rows - Grid height in cells.
 * @param start - Cell the carving begins from (the runner's start).
 * @param random - Random source returning [0, 1); the same sequence carves the same maze.
 * @returns The passages that were opened, which together join every cell without loops.
 */
function carve(cols: number, rows: number, start: Cell, random: Random): Passage[] {
  const visited = new Uint8Array(cols * rows); // row-major flags: 1 once a cell has been carved into
  /**
   * Whether a cell is inside the grid and has not been carved into yet.
   *
   * @param cell - The cell to test.
   * @returns True when the cell can still be opened up.
   */
  const isFree = (cell: Cell): boolean =>
    cell.col >= 0 && cell.col < cols && cell.row >= 0 && cell.row < rows && visited[cell.row * cols + cell.col] === 0;

  const passages: Passage[] = [];
  // Cells that may still have uncarved neighbours; the last entry is the newest.
  const active: Cell[] = [start];
  visited[start.row * cols + start.col] = 1;

  while (active.length > 0) {
    // Mostly continue from the newest cell (long corridors), sometimes from a random one (new branches).
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

/**
 * Picks a random gap on the outer wall, favouring the farther half of the perimeter so the exit is never a short dash.
 *
 * @param cols - Grid width in cells.
 * @param rows - Grid height in cells.
 * @param distance - Steps from the start to every cell, from `flood` (row-major).
 * @param random - Random source returning [0, 1).
 * @returns The chosen exit: an edge cell and the outward-facing side that gets the gap.
 */
function chooseExit(cols: number, rows: number, distance: Int16Array, random: Random): MazeExit {
  const candidates: { exit: MazeExit; steps: number }[] = [];
  /**
   * Records one outer-wall gap as a candidate, along with how far its cell is from the start.
   *
   * @param cell - The edge cell that would hold the gap.
   * @param side - The side of `cell` that faces out of the grid.
   */
  const add = (cell: Cell, side: Direction): void => {
    candidates.push({ exit: { cell, side }, steps: distance[cell.row * cols + cell.col] });
  };
  // Every outer-wall position is a candidate; a corner cell is listed twice, once for each outward side.
  for (let col = 0; col < cols; col++) {
    add({ col, row: 0 }, 'up');
    add({ col, row: rows - 1 }, 'down');
  }
  for (let row = 0; row < rows; row++) {
    add({ col: 0, row }, 'left');
    add({ col: cols - 1, row }, 'right');
  }
  // Farthest first, then pick at random from the farther half.
  candidates.sort((a, b) => b.steps - a.steps);
  return pick(random, candidates.slice(0, Math.ceil(candidates.length / 2))).exit;
}

/**
 * A finished maze: which sides of every cell are open, the one route from the start to the exit, and how far each
 * cell lies from that route. Walls can still be added while playing with `seal`.
 */
export class Maze {
  /** The one route from the start to the exit cell, both ends included. */
  readonly solution: readonly Cell[];
  private readonly open: Uint8Array; // per-cell masks of open sides (`OPEN_BIT`), row-major
  /**
   * Steps from each cell to the solution route (0 on the route itself); drives the dead-end rule.
   * Row-major, and measured once at construction, so `seal` does not change it.
   */
  private readonly depths: Int16Array;

  /**
   * Builds a maze from its passages, then works out the solution route and every cell's dead-end depth.
   *
   * @param cols - Grid width in cells.
   * @param rows - Grid height in cells.
   * @param passages - Open gaps between neighbouring cells; together they must join every cell.
   * @param start - The cell the runner starts in.
   * @param exit - The single gap in the outer wall.
   */
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
    // The only route from the start to the exit, read off a search that began at the start.
    this.solution = tracePath(cols, flood(cols, rows, this.open, [start]).parent, exit.cell);
    // A search that starts on every route cell at once gives each cell's distance from the route.
    this.depths = flood(cols, rows, this.open, this.solution).distance;
  }

  /**
   * Whether a cell lies inside the grid.
   *
   * @param cell - The cell to test.
   * @returns True when its column and row are both within the grid.
   */
  contains(cell: Cell): boolean {
    return cell.col >= 0 && cell.col < this.cols && cell.row >= 0 && cell.row < this.rows;
  }

  /**
   * True when the wall on that side of `cell` is open. Only the exit cell is open to the outside.
   *
   * @param cell - The cell to move from; a cell outside the grid always gives false.
   * @param direction - Which side of `cell` to test.
   * @returns Whether the runner can step through that side.
   */
  canMove(cell: Cell, direction: Direction): boolean {
    return this.contains(cell) && (this.open[this.index(cell)] & OPEN_BIT[direction]) !== 0;
  }

  /**
   * How many steps `cell` lies from the solution route; 0 means the runner is on the right track.
   *
   * @param cell - A cell inside the grid.
   * @returns Steps to the nearest cell of the solution route (0 on the route itself).
   */
  depthAt(cell: Cell): number {
    return this.depths[this.index(cell)];
  }

  /**
   * Walls off one side of `cell` and the matching side of its neighbour, as when a dead end collapses.
   *
   * @param cell - The cell whose side is closed.
   * @param direction - Which side of `cell` to wall off.
   */
  seal(cell: Cell, direction: Direction): void {
    this.open[this.index(cell)] &= ~OPEN_BIT[direction];
    const next = stepCell(cell, direction);
    // Close the neighbour's matching side too; there is no neighbour when the gap led out of the grid.
    if (this.contains(next)) this.open[this.index(next)] &= ~OPEN_BIT[OPPOSITE[direction]];
  }

  /**
   * Merges neighbouring wall edges into long runs so the maze can be drawn with far fewer shapes.
   *
   * @returns Every wall run, horizontal runs first and then vertical ones, each scanned line by line.
   */
  wallRuns(): WallRun[] {
    const runs: WallRun[] = [];
    for (const horizontal of [true, false]) {
      // Horizontal walls lie on row lines 0..rows; vertical walls on column lines 0..cols.
      const lines = (horizontal ? this.rows : this.cols) + 1;
      const length = horizontal ? this.cols : this.rows;
      for (let line = 0; line < lines; line++) {
        // Where the run being built started, or -1 while the scan is not inside a run.
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

  /**
   * Position of a cell in the flat per-cell arrays.
   *
   * @param cell - A cell inside the grid.
   * @returns The row-major index, `row * cols + col`.
   */
  private index(cell: Cell): number {
    return cell.row * this.cols + cell.col;
  }

  /**
   * Is the grid edge at position `index` along `line` closed?
   *
   * @param horizontal - True to test an edge on a row line, false for one on a column line.
   * @param line - Grid-line number: 0..rows for horizontal edges, 0..cols for vertical ones.
   * @param index - Position along the line: the column of a horizontal edge, or the row of a vertical edge.
   * @returns True when a wall stands on that edge.
   */
  private isWalled(horizontal: boolean, line: number, index: number): boolean {
    if (horizontal) {
      // Row line `line` is the top of row `line`, or the bottom of the last row.
      return line < this.rows
        ? !this.canMove({ col: index, row: line }, 'up')
        : !this.canMove({ col: index, row: this.rows - 1 }, 'down');
    }
    // Likewise, column line `line` is the left side of column `line`, or the right side of the last column.
    return line < this.cols
      ? !this.canMove({ col: line, row: index }, 'left')
      : !this.canMove({ col: this.cols - 1, row: index }, 'right');
  }
}

/**
 * Builds a random maze with the runner's start in the middle and a single exit somewhere on the outer wall.
 *
 * @param cols - Grid width in cells.
 * @param rows - Grid height in cells.
 * @param random - Random source returning [0, 1); the same sequence gives the same maze.
 * @returns The finished maze.
 */
export function generateMaze(cols: number, rows: number, random: Random): Maze {
  const start = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  const passages = carve(cols, rows, start, random);
  // Distances come from the plain carved maze, before the exit gap exists, and show which edge cells are far from the start.
  const { distance } = flood(cols, rows, buildOpen(cols, rows, passages), [start]);
  return new Maze(cols, rows, passages, start, chooseExit(cols, rows, distance, random));
}
