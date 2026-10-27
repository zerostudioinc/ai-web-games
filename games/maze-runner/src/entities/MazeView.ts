/**
 * Draws a maze: bakes the floor and walls into one texture, adds the exit portal, and drops stone slabs where dead ends collapse.
 */
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

const TEXTURE_KEY = 'maze-layer'; // key of the texture holding the baked floor and walls; it is replaced for every level

/** Rotation, in degrees clockwise on screen, that turns the portal's right-pointing arrow toward the way out. */
const PORTAL_ANGLE: Record<Direction, number> = { right: 0, down: 90, left: 180, up: 270 };

/** One run of wall as a pixel rectangle in the baked texture. */
interface WallRect {
  x: number; // left edge, px from the texture's left
  y: number; // top edge, px from the texture's top
  w: number; // width, px
  h: number; // height, px
  horizontal: boolean; // true for a run along a row line (wider than tall), false for one along a column line (taller than wide)
}

/**
 * Paints one wall run in a theme's style.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall run to paint.
 * @param palette - Theme colours for the walls.
 * @param random - Random source for decoration; the same sequence paints the same walls.
 * @param cellSize - Size of one maze cell, in px, for styles that space details by cell.
 */
type WallDrawer = (g: Gfx, rect: WallRect, palette: ThemePalette, random: Random, cellSize: number) => void;

/**
 * A wall's thickness, which is its shorter side.
 *
 * @param rect - The wall run.
 * @returns The smaller of its width and height, in px.
 */
const thickness = (rect: WallRect): number => Math.min(rect.w, rect.h);

/**
 * A wall's length, which is its longer side.
 *
 * @param rect - The wall run.
 * @returns The larger of its width and height, in px.
 */
const longSide = (rect: WallRect): number => Math.max(rect.w, rect.h);

/**
 * Turns the maze's wall runs into pixel rectangles, `pad` pixels in from the texture edge.
 *
 * @param maze - The maze whose wall runs are converted.
 * @param layout - Cell size and wall thickness, in px.
 * @param pad - Margin around the grid inside the texture, in px; grid line 0 lies `pad` px from the texture's top and left edges.
 * @returns One rectangle per wall run, in texture pixel coordinates.
 */
function wallRects(maze: Maze, layout: MazeLayout, pad: number): WallRect[] {
  const { cellSize, wallThickness } = layout;
  return maze.wallRuns().map((run) => {
    // Each run overhangs by half a wall at both ends so corners and junctions meet cleanly.
    const along = (run.to - run.from) * cellSize + wallThickness;
    // `start` is where the rectangle begins along the run; `across` is its position across the run, centred on the grid line.
    const start = pad + run.from * cellSize - wallThickness / 2;
    const across = pad + run.line * cellSize - wallThickness / 2;
    // Horizontal runs are long in x; vertical runs are long in y.
    return run.horizontal
      ? { x: start, y: across, w: along, h: wallThickness, horizontal: true }
      : { x: across, y: start, w: wallThickness, h: along, horizontal: false };
  });
}

/**
 * A thin bright strip along the lit (top or left) edge of a wall.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall to highlight.
 * @param palette - Theme colours; the strip uses `wallLight`.
 */
function edgeLight(g: Gfx, rect: WallRect, palette: ThemePalette): void {
  const t = thickness(rect);
  const inset = t * 0.3; // keeps the strip clear of the wall's rounded ends
  const size = Math.max(1, t * 0.18); // strip width, at least 1 px
  g.fillStyle(palette.wallLight, 0.8);
  // The strip sits 12% of the thickness in from the top edge (horizontal walls) or the left edge (vertical walls).
  if (rect.horizontal) g.fillRect(rect.x + inset, rect.y + t * 0.12, rect.w - inset * 2, size);
  else g.fillRect(rect.x + t * 0.12, rect.y + inset, size, rect.h - inset * 2);
}

/**
 * Grassland: a hedge built from overlapping leafy blobs along the wall line.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall run to paint.
 * @param palette - Theme colours: `wall` for the base and leaves, `wallLight` for highlights.
 * @param random - Random source for the blobs' size, shade and sideways wobble.
 */
function drawHedge(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random): void {
  const t = thickness(rect);
  // A solid rounded base under the leaves, so no gaps show through.
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t / 2);
  const length = longSide(rect);
  // Roughly one blob per 0.7 wall thicknesses along the run, but never closer than about 3.5 px.
  const blobs = Math.max(1, Math.floor(length / Math.max(t * 0.7, 3.5)));
  for (let i = 0; i <= blobs; i++) {
    // Blob centres run from half a wall in from one end to half a wall in from the other.
    const along = t / 2 + ((length - t) * i) / blobs;
    const wobble = (random() - 0.5) * t * 0.35; // pushes some blobs off the centre line for a ragged edge
    // Blob centre: `along` the run, pushed sideways by `wobble`.
    const cx = rect.horizontal ? rect.x + along : rect.x + t / 2 + wobble;
    const cy = rect.horizontal ? rect.y + t / 2 + wobble : rect.y + along;
    // Each blob is the base colour or a darker leaf tone, 42% to 56% of the wall thickness in radius.
    g.fillStyle(random() < 0.5 ? palette.wall : shade(palette.wall, 0.82)).fillCircle(cx, cy, t * (0.42 + random() * 0.14));
    // Some blobs (45%) get a small pale highlight toward the upper left, the lit side.
    if (random() < 0.45) g.fillStyle(palette.wallLight, 0.85).fillCircle(cx - t * 0.12, cy - t * 0.14, t * 0.17);
  }
}

/**
 * Desert: sandstone with a block joint every half cell and a scatter of grit.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall run to paint.
 * @param palette - Theme colours: `wall` for the body, `wallLight` and `wallShadow` for the highlight, joints and grit.
 * @param random - Random source for the grit's position and shade.
 * @param cellSize - Size of one maze cell in px; block joints are spaced half of it apart.
 */
function drawSandstone(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random, cellSize: number): void {
  const t = thickness(rect);
  const length = longSide(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.3);
  edgeLight(g, rect, palette);

  // Block joints: thin dark lines across the wall, one every half cell, stopping short of the far end.
  g.lineStyle(1, palette.wallShadow, 0.55);
  for (let d = cellSize / 2; d < length - t / 2; d += cellSize / 2) {
    if (rect.horizontal) g.lineBetween(rect.x + d, rect.y + 1, rect.x + d, rect.y + rect.h - 1);
    else g.lineBetween(rect.x + 1, rect.y + d, rect.x + rect.w - 1, rect.y + d);
  }
  // Grit: about one speck per 7 px of wall length, each a single pixel in a light or dark tone.
  for (let i = 0; i < length / 7; i++) {
    const gx = rect.x + random() * rect.w;
    const gy = rect.y + random() * rect.h;
    g.fillStyle(random() < 0.5 ? palette.wallShadow : palette.wallLight, 0.45).fillRect(gx, gy, 1, 1);
  }
}

/**
 * Dungeon: stone bricks in staggered courses, with the odd patch of moss.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall run to paint.
 * @param palette - Theme colours: `wall` for the stone, `wallLight` for the lit edge, `wallShadow` for the mortar lines.
 * @param random - Random source deciding whether, and where, the run gets moss.
 */
function drawBrick(g: Gfx, rect: WallRect, palette: ThemePalette, random: Random): void {
  const t = thickness(rect);
  const length = longSide(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.2);
  edgeLight(g, rect, palette);

  // Thick walls get two courses of bricks, offset by half a brick; thin walls get one.
  const brick = Math.max(6, t * 1.7); // brick length along the wall, px
  const courses = t >= 8 ? 2 : 1; // rows of bricks across the wall's thickness
  g.lineStyle(1, palette.wallShadow, 0.7);
  for (let course = 0; course < courses; course++) {
    // The band of the wall's thickness this course fills, measured from the wall's top or left edge.
    const from = (course * t) / courses;
    const to = ((course + 1) * t) / courses;
    // One joint per brick length across the band; the second course starts half a brick later, so the joints stagger.
    for (let d = brick + (course * brick) / 2; d < length - 2; d += brick) {
      if (rect.horizontal) g.lineBetween(rect.x + d, rect.y + from, rect.x + d, rect.y + to);
      else g.lineBetween(rect.x + from, rect.y + d, rect.x + to, rect.y + d);
    }
  }
  // A mortar line between the two courses, along the middle of the wall.
  if (courses === 2) {
    if (rect.horizontal) g.lineBetween(rect.x + 2, rect.y + t / 2, rect.x + rect.w - 2, rect.y + t / 2);
    else g.lineBetween(rect.x + t / 2, rect.y + 2, rect.x + t / 2, rect.y + rect.h - 2);
  }
  // 12% of wall runs get one round patch of moss at a random point along the run.
  if (random() < 0.12) {
    const along = random() * length;
    const mossX = rect.horizontal ? rect.x + along : rect.x + t / 2;
    const mossY = rect.horizontal ? rect.y + t / 2 : rect.y + along;
    g.fillStyle(0x4caf50, 0.55).fillCircle(mossX, mossY, t * 0.45);
  }
}

/**
 * Spaceship: a steel bulkhead with a glowing neon strip down the middle and rivets at the ends.
 *
 * @param g - Graphics object to draw on.
 * @param rect - The wall run to paint.
 * @param palette - Theme colours: `wall` for the steel, `accent` for the neon strip, `wallLight` for the rivets.
 */
function drawPanel(g: Gfx, rect: WallRect, palette: ThemePalette): void {
  const t = thickness(rect);
  g.fillStyle(palette.wall).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, t * 0.25);

  // The neon strip runs along the wall's centre line, from (x1, y1) half a wall in from one end to (x2, y2) half a wall in from the other.
  const x1 = rect.x + t / 2;
  const y1 = rect.y + t / 2;
  const x2 = rect.horizontal ? rect.x + rect.w - t / 2 : x1;
  const y2 = rect.horizontal ? y1 : rect.y + rect.h - t / 2;
  // A wide faint stroke for the glow, then a thin bright one for the strip itself.
  g.lineStyle(t * 0.55, palette.accent, 0.18).lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, t * 0.16), palette.accent, 0.95).lineBetween(x1, y1, x2, y2);
  // Rivets at both ends of the strip.
  g.fillStyle(palette.wallLight).fillCircle(x1, y1, t * 0.16).fillCircle(x2, y2, t * 0.16);
}

/** The drawing routine for each wall style. */
const WALL_DRAWERS: Record<WallStyle, WallDrawer> = {
  hedge: drawHedge,
  sandstone: drawSandstone,
  brick: drawBrick,
  panel: drawPanel,
};

/**
 * The two grid-line corners either side of the exit gap, in grid units.
 *
 * @param exit - The maze's exit: the edge cell that holds the gap and the side of it that faces out of the grid.
 * @returns The gap's two ends as grid-line coordinates counted in cells from the grid's top-left (not px);
 *   the top-left corner of cell (col, row) is the point (col, row).
 */
function gateCorners(exit: MazeExit): [Point, Point] {
  const { col, row } = exit.cell;
  // The gap spans the whole outer edge of the exit cell on that side, so its ends are two corners of that cell.
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

/**
 * Paints the whole maze layer: the floor tint, the wall shadows, the walls themselves and the glowing posts at the exit.
 *
 * @param g - Graphics object to draw on; the caller bakes the result into a texture.
 * @param maze - The maze to draw.
 * @param layout - Cell size and wall thickness, in px.
 * @param palette - Theme colours and wall style.
 * @param pad - Margin around the grid inside the texture, in px; the grid's top-left corner is drawn at (pad, pad).
 * @param random - Random source for the floor speckle and the wall decoration.
 */
function drawMaze(g: Gfx, maze: Maze, layout: MazeLayout, palette: ThemePalette, pad: number, random: Random): void {
  const { cellSize, wallThickness } = layout;

  // Floor tint with a light speckle so the corridors do not look flat.
  const floorWidth = maze.cols * cellSize; // size of the grid itself, px
  const floorHeight = maze.rows * cellSize;
  g.fillStyle(palette.floor, palette.floorAlpha).fillRect(pad, pad, floorWidth, floorHeight);
  // About one speck per cell: a 1-3 px dot, black or white, at 4-9% opacity, in a random spot on the floor.
  for (let i = 0; i < maze.cols * maze.rows; i++) {
    g.fillStyle(random() < 0.5 ? 0x000000 : 0xffffff, 0.04 + random() * 0.05).fillRect(
      pad + random() * floorWidth,
      pad + random() * floorHeight,
      1 + random() * 2,
      1 + random() * 2,
    );
  }

  // Every wall run as a pixel rectangle, used for both the shadows and the walls.
  const rects = wallRects(maze, layout, pad);

  // Soft shadows first, so every wall casts onto the floor but never onto another wall.
  const shadowOffset = Math.max(2, wallThickness * 0.4); // shadow shift down and to the right, px
  g.fillStyle(0x000000, 0.35);
  for (const rect of rects) g.fillRoundedRect(rect.x + shadowOffset, rect.y + shadowOffset, rect.w, rect.h, thickness(rect) / 2);

  // The theme's wall style picks the routine that paints each wall.
  const drawWall = WALL_DRAWERS[palette.wallStyle];
  for (const rect of rects) drawWall(g, rect, palette, random, cellSize);

  // Glowing posts either side of the exit gap make it easy to spot.
  for (const corner of gateCorners(maze.exit)) {
    // Convert the corner from grid units to texture px.
    const x = pad + corner.x * cellSize;
    const y = pad + corner.y * cellSize;
    // An accent-coloured post with a small white glint toward its upper left.
    g.fillStyle(palette.accent).fillCircle(x, y, wallThickness * 0.85);
    g.fillStyle(0xffffff, 0.7).fillCircle(x - wallThickness * 0.2, y - wallThickness * 0.2, wallThickness * 0.25);
  }
}

/**
 * On-screen look of one maze: the baked floor-and-wall layer, the pulsing exit portal and the slabs that mark sealed passages.
 * Create one per level, call `update` every frame and `destroy` when the level ends.
 */
export class MazeView {
  private readonly layer: Phaser.GameObjects.Image; // the baked floor and walls
  private readonly marker: Phaser.GameObjects.Image; // the exit portal, just outside the gap
  private readonly markerScale: number; // the portal's resting scale, which makes it 1.3 cells wide
  private readonly slabs: { container: Phaser.GameObjects.Container; ageMs: number }[] = []; // slabs dropped so far; `ageMs` is time since each was dropped, ms
  private pulseMs = 0; // total time passed, ms; drives the portal's pulse

  /**
   * Bakes the maze into a texture and places it on the scene, together with the exit portal.
   *
   * @param scene - Scene the view is added to.
   * @param maze - The maze to draw.
   * @param layout - Cell size, wall thickness and screen position of the grid.
   * @param palette - Theme colours and wall style.
   * @param random - Random source for the decoration; the same sequence paints the same picture.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    maze: Maze,
    private readonly layout: MazeLayout,
    palette: ThemePalette,
    random: Random,
  ) {
    // Room around the grid for wall overhang, shadows and the gate posts: the wall thickness plus 3 px.
    const pad = Math.ceil(layout.wallThickness) + 3;
    // Texture size: the grid plus the margin on every side, px.
    const width = maze.cols * layout.cellSize + pad * 2;
    const height = maze.rows * layout.cellSize + pad * 2;

    // The floor and walls are baked into one texture: redrawing thousands of shapes every frame would be wasteful.
    // Remove any texture left from an earlier level, so this one starts blank and at the right size.
    if (scene.textures.exists(TEXTURE_KEY)) scene.textures.remove(TEXTURE_KEY);
    // `false` keeps the graphics object out of the scene; it is only a drawing surface.
    const g = scene.make.graphics({}, false);
    drawMaze(g, maze, layout, palette, pad, random);
    // Render the shapes into the texture, then discard the graphics object.
    g.generateTexture(TEXTURE_KEY, width, height);
    g.destroy();
    // The image starts `pad` px up and left of the grid, so the grid lands exactly on `layout.bounds`.
    // Depth 5: above the theme background, below the slabs (6), the portal (7) and the runner (11).
    this.layer = scene.add.image(layout.bounds.x - pad, layout.bounds.y - pad, TEXTURE_KEY).setOrigin(0).setDepth(5);

    // The portal sits in the spare cell just outside the exit gap.
    const outside = cellCenter(layout, stepCell(maze.exit.cell, maze.exit.side));
    // Rotated to point out of the maze, tinted with the theme's accent colour and drawn above the slabs.
    this.marker = scene.add
      .image(outside.x, outside.y, TextureKey.Portal)
      .setAngle(PORTAL_ANGLE[maze.exit.side])
      .setTint(palette.accent)
      .setDepth(7);
    // Resting size: 1.3 cells wide, whatever the cell size. `update` pulses around it.
    this.markerScale = (layout.cellSize * 1.3) / this.marker.width;
    this.marker.setScale(this.markerScale);
  }

  /**
   * Centre of the exit portal on screen.
   *
   * @returns The portal's centre, in screen px; it lies one cell outside the grid.
   */
  get exitPosition(): Point {
    return { x: this.marker.x, y: this.marker.y };
  }

  /**
   * Drops a stone slab into the gap on `direction` of `cell`, where the maze has just been sealed.
   * The slab pops in from nothing and then stays for the rest of the level.
   *
   * @param cell - The cell whose side was sealed.
   * @param direction - Which side of `cell` is now walled off.
   */
  sealPassage(cell: Cell, direction: Direction): void {
    const { cellSize, wallThickness } = this.layout;
    const center = cellCenter(this.layout, cell);
    // One step toward the sealed side, as a column/row offset (e.g. row -1 for up).
    const toward = stepCell({ col: 0, row: 0 }, direction);
    // A slab across an up or down gap lies flat (wider than tall); across a left or right gap it stands upright.
    const horizontal = toward.row !== 0;
    // Thicker than an ordinary wall so it reads as a rockfall rather than a wall.
    const along = cellSize + wallThickness;
    const across = wallThickness * 1.9;
    const w = horizontal ? along : across;
    const h = horizontal ? across : along;

    // A red glow 3 px bigger than the stone on every side, under a brown stone with a dark outline.
    const glow = this.scene.add.rectangle(0, 0, w + 6, h + 6, COLOR.red, 0.45);
    const stone = this.scene.add.rectangle(0, 0, w, h, 0x8d6e63).setStrokeStyle(2, 0x3e2723);
    // Centred half a cell from the cell's centre, on the shared edge. It starts at scale 0, and `update` pops it in.
    const container = this.scene.add
      .container(center.x + (toward.col * cellSize) / 2, center.y + (toward.row * cellSize) / 2, [glow, stone])
      .setDepth(6)
      .setScale(0);
    this.slabs.push({ container, ageMs: 0 });
  }

  /**
   * Animates the portal's pulse and any slabs that are still popping in. Call once per frame.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  update(deltaMs: number): void {
    this.pulseMs += deltaMs;
    // Swings between -1 and 1, one full cycle roughly every 1.3 s.
    const beat = Math.sin(this.pulseMs * 0.005);
    // The portal swells by up to 10% and its opacity moves between 76% and 100% as the beat swings.
    this.marker.setScale(this.markerScale * (1 + 0.1 * beat)).setAlpha(0.88 + 0.12 * beat);

    // Slabs pop in with a little overshoot, then stay put.
    for (const slab of this.slabs) {
      // A finished slab already rests at full size.
      if (slab.ageMs >= SEAL_POP_MS) continue;
      slab.ageMs += deltaMs;
      slab.container.setScale(easeOutBack(slab.ageMs / SEAL_POP_MS));
    }
  }

  /** Removes everything the view added, including the baked texture. Call when the level ends. */
  destroy(): void {
    this.layer.destroy();
    this.marker.destroy();
    for (const slab of this.slabs) slab.container.destroy();
    this.scene.textures.remove(TEXTURE_KEY);
  }
}
