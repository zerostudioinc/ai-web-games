// Draws a maze: bakes the floor and walls into one texture, adds the exit portal, and drops stone slabs where dead ends collapse.
import type Phaser from 'phaser';
import type { Gfx } from '../assets/bake';
import { SEAL_POP_MS, TextureKey } from '../config';
import { COLOR, shade } from '../style';
import { easeOutBack } from '../systems/ease';
import type { Point } from '../systems/geometry';
import { cellCenter, type MazeLayout } from '../systems/layout';
import { stepCell, type Cell, type Direction, type Maze, type MazeExit } from '../systems/maze';
import type { Random } from '../systems/rng';
import type { ThemePalette, WallStyle } from '../systems/themes';

const TEXTURE_KEY = 'maze-layer';

/** Rotation that turns the portal's right-pointing arrow toward the way out. */
const PORTAL_ANGLE: Record<Direction, number> = { right: 0, down: 90, left: 180, up: 270 };

/** One run of wall as a pixel rectangle in the baked texture. */
interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
  horizontal: boolean;
}

type WallDrawer = (g: Gfx, rect: WallRect, palette: ThemePalette, random: Random, cellSize: number) => void;

const thickness = (rect: WallRect): number => Math.min(rect.w, rect.h);
const longSide = (rect: WallRect): number => Math.max(rect.w, rect.h);

/** Turns the maze's wall runs into pixel rectangles, `pad` pixels in from the texture edge. */
function wallRects(maze: Maze, layout: MazeLayout, pad: number): WallRect[] {
  const { cellSize, wallThickness } = layout;
  return maze.wallRuns().map((run) => {
    // Each run overhangs by half a wall at both ends so corners and junctions meet cleanly.
    const along = (run.to - run.from) * cellSize + wallThickness;
    const start = pad + run.from * cellSize - wallThickness / 2;
    const across = pad + run.line * cellSize - wallThickness / 2;
    return run.horizontal
      ? { x: start, y: across, w: along, h: wallThickness, horizontal: true }
      : { x: across, y: start, w: wallThickness, h: along, horizontal: false };
  });
}

/** A thin bright strip along the lit (top or left) edge of a wall. */
function edgeLight(g: Gfx, rect: WallRect, palette: ThemePalette): void {
  const t = thickness(rect);
  const inset = t * 0.3;
  const size = Math.max(1, t * 0.18);
  g.fillStyle(palette.wallLight, 0.8);
  if (rect.horizontal) g.fillRect(rect.x + inset, rect.y + t * 0.12, rect.w - inset * 2, size);
  else g.fillRect(rect.x + t * 0.12, rect.y + inset, size, rect.h - inset * 2);
}

/** Grassland: a hedge built from overlapping leafy blobs along the wall line. */
function drawHedge(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random): void {
  const t = thickness(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t / 2);
  const length = longSide(rect);
  const blobs = Math.max(1, Math.floor(length / Math.max(t * 0.7, 3.5)));
  for (let i = 0; i <= blobs; i++) {
    const along = t / 2 + ((length - t) * i) / blobs;
    const wobble = (random() - 0.5) * t * 0.35; // pushes some blobs off the centre line for a ragged edge
    const cx = rect.horizontal ? rect.x + along : rect.x + t / 2 + wobble;
    const cy = rect.horizontal ? rect.y + t / 2 + wobble : rect.y + along;
    g.fillStyle(random() < 0.5 ? palette.wall : shade(palette.wall, 0.82)).fillCircle(cx, cy, t * (0.42 + random() * 0.14));
    if (random() < 0.45) g.fillStyle(palette.wallLight, 0.85).fillCircle(cx - t * 0.12, cy - t * 0.14, t * 0.17);
  }
}

/** Desert: sandstone with a block joint every half cell and a scatter of grit. */
function drawSandstone(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random, cellSize: number): void {
  const t = thickness(rect);
  const length = longSide(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.3);
  edgeLight(g, rect, palette);

  g.lineStyle(1, palette.wallShadow, 0.55);
  for (let d = cellSize / 2; d < length - t / 2; d += cellSize / 2) {
    if (rect.horizontal) g.lineBetween(rect.x + d, rect.y + 1, rect.x + d, rect.y + rect.h - 1);
    else g.lineBetween(rect.x + 1, rect.y + d, rect.x + rect.w - 1, rect.y + d);
  }
  for (let i = 0; i < length / 7; i++) {
    const gx = rect.x + random() * rect.w;
    const gy = rect.y + random() * rect.h;
    g.fillStyle(random() < 0.5 ? palette.wallShadow : palette.wallLight, 0.45).fillRect(gx, gy, 1, 1);
  }
}

/** Dungeon: stone bricks in staggered courses, with the odd patch of moss. */
function drawBrick(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random): void {
  const t = thickness(rect);
  const length = longSide(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.2);
  edgeLight(g, rect, palette);

  // Thick walls get two courses of bricks, offset by half a brick; thin walls get one.
  const brick = Math.max(6, t * 1.7);
  const courses = t >= 8 ? 2 : 1;
  g.lineStyle(1, palette.wallShadow, 0.7);
  for (let course = 0; course < courses; course++) {
    const from = (course * t) / courses;
    const to = ((course + 1) * t) / courses;
    for (let d = brick + (course * brick) / 2; d < length - 2; d += brick) {
      if (rect.horizontal) g.lineBetween(rect.x + d, rect.y + from, rect.x + d, rect.y + to);
      else g.lineBetween(rect.x + from, rect.y + d, rect.x + to, rect.y + d);
    }
  }
  if (courses === 2) {
    if (rect.horizontal) g.lineBetween(rect.x + 2, rect.y + t / 2, rect.x + rect.w - 2, rect.y + t / 2);
    else g.lineBetween(rect.x + t / 2, rect.y + 2, rect.x + t / 2, rect.y + rect.h - 2);
  }
  if (random() < 0.12) {
    const along = random() * length;
    const mossX = rect.horizontal ? rect.x + along : rect.x + t / 2;
    const mossY = rect.horizontal ? rect.y + t / 2 : rect.y + along;
    g.fillStyle(0x4caf50, 0.55).fillCircle(mossX, mossY, t * 0.45);
  }
}

/** Spaceship: a steel bulkhead with a glowing neon strip down the middle and rivets at the ends. */
function drawPanel(g: Gfx, rect: WallRect, palette: ThemePalette): void {
  const t = thickness(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.25);

  const x1 = rect.x + t / 2;
  const y1 = rect.y + t / 2;
  const x2 = rect.horizontal ? rect.x + rect.w - t / 2 : x1;
  const y2 = rect.horizontal ? y1 : rect.y + rect.h - t / 2;
  g.lineStyle(t * 0.55, palette.accent, 0.18).lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, t * 0.16), palette.accent, 0.95).lineBetween(x1, y1, x2, y2);
  g.fillStyle(palette.wallLight).fillCircle(x1, y1, t * 0.16).fillCircle(x2, y2, t * 0.16);
}

const WALL_DRAWERS: Record<WallStyle, WallDrawer> = {
  hedge: drawHedge,
  sandstone: drawSandstone,
  brick: drawBrick,
  panel: drawPanel,
};

/** The two grid-line corners either side of the exit gap, in grid units. */
function gateCorners(exit: MazeExit): [Point, Point] {
  const { col, row } = exit.cell;
  switch (exit.side) {
    case 'up':
      return [{ x: col, y: row }, { x: col + 1, y: row }];
    case 'down':
      return [{ x: col, y: row + 1 }, { x: col + 1, y: row + 1 }];
    case 'left':
      return [{ x: col, y: row }, { x: col, y: row + 1 }];
    case 'right':
      return [{ x: col + 1, y: row }, { x: col + 1, y: row + 1 }];
  }
}

function drawMaze(g: Gfx, maze: Maze, layout: MazeLayout, palette: ThemePalette, pad: number, random: Random): void {
  const { cellSize, wallThickness } = layout;

  // Floor tint with a light speckle so the corridors do not look flat.
  const floorWidth = maze.cols * cellSize;
  const floorHeight = maze.rows * cellSize;
  g.fillStyle(palette.floor, palette.floorAlpha).fillRect(pad, pad, floorWidth, floorHeight);
  for (let i = 0; i < maze.cols * maze.rows; i++) {
    g.fillStyle(random() < 0.5 ? 0x000000 : 0xffffff, 0.04 + random() * 0.05).fillRect(
      pad + random() * floorWidth,
      pad + random() * floorHeight,
      1 + random() * 2,
      1 + random() * 2,
    );
  }

  const rects = wallRects(maze, layout, pad);

  // Soft shadows first, so every wall casts onto the floor but never onto another wall.
  const shadowOffset = Math.max(2, wallThickness * 0.4);
  g.fillStyle(0x000000, 0.35);
  for (const rect of rects) g.fillRoundedRect(rect.x + shadowOffset, rect.y + shadowOffset, rect.w, rect.h, thickness(rect) / 2);

  const drawWall = WALL_DRAWERS[palette.wallStyle];
  for (const rect of rects) drawWall(g, rect, palette, random, cellSize);

  // Glowing posts either side of the exit gap make it easy to spot.
  for (const corner of gateCorners(maze.exit)) {
    const x = pad + corner.x * cellSize;
    const y = pad + corner.y * cellSize;
    g.fillStyle(palette.accent).fillCircle(x, y, wallThickness * 0.85);
    g.fillStyle(0xffffff, 0.7).fillCircle(x - wallThickness * 0.2, y - wallThickness * 0.2, wallThickness * 0.25);
  }
}

export class MazeView {
  private readonly layer: Phaser.GameObjects.Image;
  private readonly marker: Phaser.GameObjects.Image;
  private readonly markerScale: number;
  private readonly slabs: { container: Phaser.GameObjects.Container; ageMs: number }[] = [];
  private pulseMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    maze: Maze,
    private readonly layout: MazeLayout,
    palette: ThemePalette,
    random: Random,
  ) {
    // Room around the grid for wall overhang, shadows and the gate posts.
    const pad = Math.ceil(layout.wallThickness) + 3;
    const width = maze.cols * layout.cellSize + pad * 2;
    const height = maze.rows * layout.cellSize + pad * 2;

    // The floor and walls are baked into one texture: redrawing thousands of shapes every frame would be wasteful.
    if (scene.textures.exists(TEXTURE_KEY)) scene.textures.remove(TEXTURE_KEY);
    const g = scene.make.graphics({}, false);
    drawMaze(g, maze, layout, palette, pad, random);
    g.generateTexture(TEXTURE_KEY, width, height);
    g.destroy();
    this.layer = scene.add.image(layout.bounds.x - pad, layout.bounds.y - pad, TEXTURE_KEY).setOrigin(0).setDepth(5);

    // The portal sits in the spare cell just outside the exit gap.
    const outside = cellCenter(layout, stepCell(maze.exit.cell, maze.exit.side));
    this.marker = scene.add
      .image(outside.x, outside.y, TextureKey.Portal)
      .setAngle(PORTAL_ANGLE[maze.exit.side])
      .setTint(palette.accent)
      .setDepth(7);
    this.markerScale = (layout.cellSize * 1.3) / this.marker.width;
    this.marker.setScale(this.markerScale);
  }

  /** Centre of the exit portal on screen. */
  get exitPosition(): Point {
    return { x: this.marker.x, y: this.marker.y };
  }

  /** Drops a stone slab into the gap on `direction` of `cell`, where the maze has just been sealed. */
  sealPassage(cell: Cell, direction: Direction): void {
    const { cellSize, wallThickness } = this.layout;
    const center = cellCenter(this.layout, cell);
    const toward = stepCell({ col: 0, row: 0 }, direction);
    const horizontal = toward.row !== 0;
    // Thicker than an ordinary wall so it reads as a rockfall rather than a wall.
    const along = cellSize + wallThickness;
    const across = wallThickness * 1.9;
    const w = horizontal ? along : across;
    const h = horizontal ? across : along;

    const glow = this.scene.add.rectangle(0, 0, w + 6, h + 6, COLOR.red, 0.45);
    const stone = this.scene.add.rectangle(0, 0, w, h, 0x8d6e63).setStrokeStyle(2, 0x3e2723);
    const container = this.scene.add
      .container(center.x + (toward.col * cellSize) / 2, center.y + (toward.row * cellSize) / 2, [glow, stone])
      .setDepth(6)
      .setScale(0);
    this.slabs.push({ container, ageMs: 0 });
  }

  update(deltaMs: number): void {
    this.pulseMs += deltaMs;
    const beat = Math.sin(this.pulseMs * 0.005);
    this.marker.setScale(this.markerScale * (1 + 0.1 * beat)).setAlpha(0.88 + 0.12 * beat);

    // Slabs pop in with a little overshoot, then stay put.
    for (const slab of this.slabs) {
      if (slab.ageMs >= SEAL_POP_MS) continue;
      slab.ageMs += deltaMs;
      slab.container.setScale(easeOutBack(slab.ageMs / SEAL_POP_MS));
    }
  }

  /** Removes everything the view added, including the baked texture. */
  destroy(): void {
    this.layer.destroy();
    this.marker.destroy();
    for (const slab of this.slabs) slab.container.destroy();
    this.scene.textures.remove(TEXTURE_KEY);
  }
}
