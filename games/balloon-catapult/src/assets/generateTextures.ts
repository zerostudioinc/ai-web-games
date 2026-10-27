/**
 * Draws every texture in code at boot (field, HUD bar, cloud, menu background, bomb and balloon),
 * so the game ships no image files.
 */
import Phaser from 'phaser';
import { FIELD_HEIGHT, FIELD_TOP, GAME_HEIGHT, GAME_WIDTH, LANE_COUNTS, LANE_HEIGHT, TextureKey, fieldTextureKey } from '../config';
import { COLOR, shade } from '../style';
import { scatterPoints } from '../systems/scenery';

/** Shorthand for the Phaser graphics object every draw function paints on. */
type Gfx = Phaser.GameObjects.Graphics;

const PATH_HEIGHT = 104; // height of the dirt path inside each lane, px
const FLOWER_COLORS = [0xffffff, 0xffeb3b, 0xff8fab, 0xb39ddb]; // petal colours, cycled in order

/**
 * Draws a picture with `draw`, bakes it into a texture and discards the temporary graphics object.
 * Does nothing when the texture already exists (for example when the game restarts).
 *
 * @param scene - Scene used to create the graphics object and register the texture.
 * @param key - Texture key to register.
 * @param width - Texture width in px.
 * @param height - Texture height in px.
 * @param draw - Callback that paints the picture onto the graphics object.
 */
function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Gfx) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

/**
 * Blends two colours channel by channel.
 *
 * @param from - Colour at t = 0, as 0xRRGGBB.
 * @param to - Colour at t = 1, as 0xRRGGBB.
 * @param t - Blend factor, 0 to 1.
 * @returns The blended colour as 0xRRGGBB.
 */
const mix = (from: number, to: number, t: number): number => {
  /**
   * Blends one colour channel.
   *
   * @param shift - Bit offset of the channel: 16 for red, 8 for green, 0 for blue.
   * @returns The blended channel value, 0 to 255.
   */
  const channel = (shift: number): number => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

/**
 * Draws a small tuft of grass: three blades fanning out from one point.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the tuft's base in px.
 * @param y - Y of the tuft's base in px.
 * @param scale - Size multiplier; 1 is normal size.
 * @param dark - True for dark blades, false for light ones.
 */
function drawTuft(g: Gfx, x: number, y: number, scale: number, dark: boolean): void {
  g.lineStyle(2, dark ? 0x4f9a2f : 0x9ddb66);
  g.lineBetween(x - 3 * scale, y, x - 5 * scale, y - 8 * scale);
  g.lineBetween(x, y, x, y - 11 * scale);
  g.lineBetween(x + 3 * scale, y, x + 5 * scale, y - 8 * scale);
}

/**
 * Draws a five-petal flower with a yellow centre.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x in px.
 * @param y - Centre y in px.
 * @param color - Petal colour as 0xRRGGBB.
 */
function drawFlower(g: Gfx, x: number, y: number, color: number): void {
  g.fillStyle(color);
  // Five petals spaced evenly around the centre.
  for (let k = 0; k < 5; k++) {
    const angle = (k / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * 3.4, y + Math.sin(angle) * 3.4, 2.7);
  }
  g.fillStyle(0xf9a825).fillCircle(x, y, 2.2);
}

/**
 * Scatters grass tufts and flowers at repeatable random positions inside an area.
 *
 * @param g - Graphics object to draw on.
 * @param seed - Seed for the tuft positions; flowers use `seed + 1000` so they do not land on the same spots.
 * @param area - Rectangle to fill.
 * @param tufts - How many grass tufts to draw.
 * @param flowers - How many flowers to draw.
 */
function scatterGrassDetail(g: Gfx, seed: number, area: { left: number; top: number; right: number; bottom: number }, tufts: number, flowers: number): void {
  // Tufts vary in size and alternate between dark and light; flowers cycle through the petal colours.
  scatterPoints(seed, tufts, area).forEach((p, i) => drawTuft(g, p.x, p.y, 0.8 + (i % 3) * 0.25, i % 2 === 0));
  scatterPoints(seed + 1000, flowers, area).forEach((p, i) => drawFlower(g, p.x, p.y, FLOWER_COLORS[i % FLOWER_COLORS.length]));
}

/**
 * Draws the playing field: alternating grass bands, a dirt path with pebbles down each lane, and grass decoration.
 *
 * @param g - Graphics object to draw on.
 * @param laneCount - Number of lanes to draw (3 or 4).
 */
function drawField(g: Gfx, laneCount: number): void {
  const offset = (FIELD_HEIGHT - laneCount * LANE_HEIGHT) / 2; // empty grass above and below the lanes
  /**
   * Grass colour of a lane band, alternating light and dark.
   *
   * @param lane - Lane index; -1 and `laneCount` stand for the spare bands above and below the lanes.
   * @returns The band colour as 0xRRGGBB.
   */
  const bandColor = (lane: number): number => (Math.abs(lane) % 2 === 0 ? COLOR.grassLight : COLOR.grassDark);
  // One grass band per lane.
  for (let lane = 0; lane < laneCount; lane++) {
    g.fillStyle(bandColor(lane)).fillRect(0, offset + lane * LANE_HEIGHT, GAME_WIDTH, LANE_HEIGHT);
  }
  // Any spare field above and below continues the stripe pattern and gets its own tufts and flowers.
  if (offset > 0) {
    g.fillStyle(bandColor(-1)).fillRect(0, 0, GAME_WIDTH, offset);
    g.fillStyle(bandColor(laneCount)).fillRect(0, offset + laneCount * LANE_HEIGHT, GAME_WIDTH, offset);
    scatterGrassDetail(g, 91, { left: 0, right: GAME_WIDTH, top: 14, bottom: offset - 8 }, 16, 4);
    scatterGrassDetail(g, 93, { left: 0, right: GAME_WIDTH, top: offset + laneCount * LANE_HEIGHT + 14, bottom: FIELD_HEIGHT - 8 }, 16, 4);
  }
  // Faint lighter vertical stripes, like a freshly mown lawn.
  for (let x = 160; x < GAME_WIDTH; x += 320) {
    g.fillStyle(0xffffff, 0.05).fillRect(x, 0, 160, FIELD_HEIGHT);
  }

  const margin = (LANE_HEIGHT - PATH_HEIGHT) / 2; // grass left above and below the path within a lane
  for (let lane = 0; lane < laneCount; lane++) {
    const laneTop = offset + lane * LANE_HEIGHT;
    const pathTop = laneTop + margin;
    // Dirt path: darker edge, body, and a lighter highlight along the top.
    g.fillStyle(COLOR.pathEdge).fillRoundedRect(0, pathTop - 3, GAME_WIDTH, PATH_HEIGHT + 6, 14);
    g.fillStyle(COLOR.path).fillRoundedRect(0, pathTop, GAME_WIDTH, PATH_HEIGHT, 12);
    g.fillStyle(shade(COLOR.path, 1.08), 0.7).fillRoundedRect(0, pathTop + 6, GAME_WIDTH, 14, 7);

    // Pebbles on the path, alternating two colours.
    scatterPoints(lane + 11, 22, { left: 0, right: GAME_WIDTH, top: pathTop + 8, bottom: pathTop + PATH_HEIGHT - 8 }).forEach((p, i) => {
      g.fillStyle(i % 2 === 0 ? COLOR.pebble : shade(COLOR.path, 1.1)).fillEllipse(p.x, p.y, 7, 4);
    });

    // Tufts and flowers on the grass strips above and below the path.
    scatterGrassDetail(g, lane * 2 + 1, { left: 0, right: GAME_WIDTH, top: laneTop + 14, bottom: pathTop - 4 }, 14, 3);
    scatterGrassDetail(g, lane * 2 + 2, { left: 0, right: GAME_WIDTH, top: pathTop + PATH_HEIGHT + 8, bottom: laneTop + LANE_HEIGHT - 4 }, 14, 3);
  }
}

/**
 * Draws the wooden strip behind the HUD: four planks with seams and grain, a top highlight and a dark bottom edge.
 *
 * @param g - Graphics object to draw on.
 */
function drawHudBar(g: Gfx): void {
  // Each plank is 20 px tall; alternate shades so the seams show.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 === 0 ? COLOR.wood : shade(COLOR.wood, 0.9)).fillRect(0, i * 20, GAME_WIDTH, 20);
    // Dark seam along the top of the plank, then a few vertical grain lines at random positions.
    g.lineStyle(2, COLOR.woodDark, 0.6).lineBetween(0, i * 20, GAME_WIDTH, i * 20);
    scatterPoints(40 + i, 9, { left: 0, right: GAME_WIDTH, top: i * 20 + 2, bottom: i * 20 + 18 }).forEach((p) => {
      g.lineStyle(2, COLOR.woodDark, 0.5).lineBetween(p.x, i * 20, p.x, i * 20 + 20);
    });
  }
  // Light highlight along the very top; dark edge along the bottom of the strip.
  g.fillStyle(COLOR.woodLight, 0.5).fillRect(0, 0, GAME_WIDTH, 4);
  g.fillStyle(COLOR.woodDark).fillRect(0, 74, GAME_WIDTH, 6);
}

/**
 * Draws a puffy cloud: overlapping circles on a rounded base, with a faint shadow along the bottom.
 *
 * @param g - Graphics object to draw on.
 */
function drawCloud(g: Gfx): void {
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(60, 60, 32).fillCircle(105, 45, 40).fillCircle(155, 58, 34).fillRoundedRect(40, 58, 140, 34, 17);
  g.fillStyle(0xdbeaf5, 0.7).fillRoundedRect(46, 80, 128, 12, 6);
}

/**
 * Draws the menu backdrop: sky gradient, sun, rolling hills and a lawn with grass detail.
 *
 * @param g - Graphics object to draw on.
 */
function drawMenuBackground(g: Gfx): void {
  const horizon = 470; // y where the sky ends, px
  const steps = 40; // number of thin strips used to fake a smooth sky gradient
  for (let i = 0; i < steps; i++) {
    g.fillStyle(mix(COLOR.skyTop, COLOR.skyBottom, i / (steps - 1))).fillRect(0, (i * horizon) / steps, GAME_WIDTH, horizon / steps + 1);
  }
  // Sun: two soft halos around a bright disc.
  g.fillStyle(0xfff59d, 0.25).fillCircle(1080, 130, 112);
  g.fillStyle(0xfff59d, 0.4).fillCircle(1080, 130, 82);
  g.fillStyle(0xffeb3b).fillCircle(1080, 130, 54);

  // Two overlapping hills, then two darker bands of lawn along the bottom.
  g.fillStyle(0x93d36d).fillEllipse(260, 500, 1000, 300);
  g.fillStyle(0x82c95a).fillEllipse(1000, 520, 1100, 320);
  g.fillStyle(0x6fbc48).fillRect(0, 580, GAME_WIDTH, GAME_HEIGHT - 580);
  g.fillStyle(0x65b040).fillRect(0, 640, GAME_WIDTH, GAME_HEIGHT - 640);
  scatterGrassDetail(g, 90, { left: 0, right: GAME_WIDTH, top: 595, bottom: GAME_HEIGHT - 6 }, 60, 14);
}

/**
 * Draws the bomb enemy's body: a round shell with a fuse, angry eyes and a toothy mouth (feet are separate objects).
 *
 * @param g - Graphics object to draw on.
 */
function drawBombBody(g: Gfx): void {
  const cx = 36; // centre of the shell inside the 72 x 84 texture, px
  const cy = 42;
  // Round shell: outline, base colour, a darker patch at the lower right and a glossy highlight at the upper left.
  g.fillStyle(0x1b262c).fillCircle(cx, cy, 26);
  g.fillStyle(0x34495e).fillCircle(cx, cy, 23);
  g.fillStyle(0x263544).fillEllipse(cx + 5, cy + 9, 34, 28);
  g.fillStyle(0x6a8ba3, 0.9).fillEllipse(cx - 10, cy - 12, 14, 9);

  // Metal cap on top with a fuse curling up and to the right.
  g.fillStyle(0x78909c).fillRoundedRect(cx - 8, cy - 32, 16, 9, 3);
  g.lineStyle(2, 0x1b262c).strokeRoundedRect(cx - 8, cy - 32, 16, 9, 3);
  g.lineStyle(3, 0xa1887f).beginPath().moveTo(cx, cy - 32).lineTo(cx + 3, cy - 37).lineTo(cx + 10, cy - 40).strokePath();

  // Eyes: whites, pupils looking slightly left, and slanted angry eyebrows.
  g.fillStyle(0xffffff).fillEllipse(cx - 9, cy - 3, 11, 14).fillEllipse(cx + 9, cy - 3, 11, 14);
  g.fillStyle(0x111111).fillCircle(cx - 11, cy - 2, 3).fillCircle(cx + 7, cy - 2, 3);
  g.lineStyle(4, 0x111111).lineBetween(cx - 18, cy - 15, cx - 4, cy - 8).lineBetween(cx + 18, cy - 15, cx + 4, cy - 8);

  // Mouth with three white teeth.
  g.fillStyle(0x111111).fillRoundedRect(cx - 12, cy + 8, 24, 10, 3);
  g.fillStyle(0xffffff);
  for (let k = 0; k < 3; k++) {
    g.fillTriangle(cx - 10 + k * 8, cy + 8, cx - 4 + k * 8, cy + 8, cx - 7 + k * 8, cy + 14);
  }
}

/**
 * Draws a balloon in light grey so a player-colour tint shows through.
 *
 * @param g - Graphics object to draw on.
 */
function drawBalloon(g: Gfx): void {
  g.fillStyle(0xd9d9d9).fillCircle(16, 16, 13);
  g.fillStyle(0xf2f2f2).fillEllipse(14, 14, 22, 22);
  g.fillStyle(0xffffff).fillEllipse(10, 9, 8, 6);
  g.fillStyle(0xc2c2c2).fillTriangle(16, 28, 12, 35, 20, 35);
}

/**
 * Bakes every texture the game uses. Safe to call again: `bake` skips textures that already exist.
 *
 * @param scene - Scene used to create the textures (the boot scene).
 */
export function generateTextures(scene: Phaser.Scene): void {
  // One field texture per supported lane count.
  for (const laneCount of LANE_COUNTS) {
    bake(scene, fieldTextureKey(laneCount), GAME_WIDTH, FIELD_HEIGHT, (g) => drawField(g, laneCount));
  }
  bake(scene, TextureKey.HudBar, GAME_WIDTH, FIELD_TOP, drawHudBar);
  bake(scene, TextureKey.Cloud, 220, 100, drawCloud);
  bake(scene, TextureKey.MenuBackground, GAME_WIDTH, GAME_HEIGHT, drawMenuBackground);
  bake(scene, TextureKey.BombBody, 72, 84, drawBombBody);
  bake(scene, TextureKey.Balloon, 32, 40, drawBalloon);
}
