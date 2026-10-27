/**
 * Small interface graphics: lives, exit portal, touch pad buttons, the status bar and a particle dot.
 */
import type Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, TOUCH_PAD, TextureKey } from '../config';
import { COLOR } from '../style';
import { bake, type Gfx } from './bake';

const HEART_SIZE = 42; // width and height of each heart texture, px
const PORTAL_SIZE = 128; // width and height of the exit portal texture, px

/**
 * Draws a heart: two round lobes over a point, with a dark outline.
 *
 * @param g - Graphics object to draw on (a 42 x 42 px texture).
 * @param fill - Colour of the heart as 0xRRGGBB.
 * @param shine - True to add a white highlight on the left lobe (a life still held), false for a flat heart (a life lost).
 */
function drawHeart(g: Gfx, fill: number, shine: boolean): void {
  // The rim is the same shape grown a little and drawn first, which outlines the heart without stroking curves.
  /**
   * Fills the heart shape, optionally grown outward.
   *
   * @param grow - How many px the shape is enlarged by at its edges; 0 gives the true size.
   * @param color - Fill colour as 0xRRGGBB.
   */
  const shape = (grow: number, color: number): void => {
    g.fillStyle(color);
    // Two lobes side by side, then a triangle under them that forms the point.
    g.fillCircle(14, 15, 9 + grow).fillCircle(28, 15, 9 + grow);
    g.fillTriangle(5 - grow, 18, 37 + grow, 18, 21, 36 + grow * 1.5);
  };
  shape(2.5, COLOR.ink);
  shape(0, fill);
  if (shine) g.fillStyle(0xffffff, 0.55).fillEllipse(10, 11, 8, 5);
}

/**
 * White so it can be tinted to each theme's accent colour; the scene rotates it to point out of the maze.
 * A soft glow, a bright ring and an arrow pointing right.
 *
 * @param g - Graphics object to draw on (a 128 x 128 px texture).
 */
function drawPortal(g: Gfx): void {
  const c = PORTAL_SIZE / 2; // centre of the texture, px
  // Glow: five stacked translucent discs, the biggest and faintest first, so it brightens toward the centre.
  for (let ring = 5; ring >= 1; ring--) {
    g.fillStyle(0xffffff, 0.07 * (6 - ring)).fillCircle(c, c, 24 + ring * 7.5);
  }
  // A pale disc inside the glow, a bright ring round it, and the arrow in the middle.
  g.fillStyle(0xffffff, 0.25).fillCircle(c, c, 31);
  g.lineStyle(7, 0xffffff, 1).strokeCircle(c, c, 34);
  g.fillStyle(0xffffff, 1).fillTriangle(c - 10, c - 20, c - 10, c + 20, c + 24, c);
}

/**
 * A rounded key with an up arrow; the other three directions are this rotated.
 *
 * @param g - Graphics object to draw on (a square texture, `TOUCH_PAD.buttonSize` px on each side).
 */
function drawDpadButton(g: Gfx): void {
  const s = TOUCH_PAD.buttonSize; // edge of the texture, px
  // Translucent dark key with a white outline, inset 4 px so the outline is not clipped.
  g.fillStyle(COLOR.night, 0.55).fillRoundedRect(4, 4, s - 8, s - 8, 22);
  g.lineStyle(4, 0xffffff, 0.75).strokeRoundedRect(4, 4, s - 8, s - 8, 22);
  // The arrow: a triangle with its tip at the top centre.
  g.fillStyle(0xffffff, 0.9).fillTriangle(s / 2, 22, s / 2 - 22, s - 32, s / 2 + 22, s - 32);
}

/**
 * Draws the status bar's background: a dark translucent strip, a faint gloss on its upper half and a bright stripe along its bottom edge.
 *
 * @param g - Graphics object to draw on (a texture as wide as the screen and `HUD_HEIGHT` px tall).
 */
function drawHudBar(g: Gfx): void {
  g.fillStyle(COLOR.night, 0.88).fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
  g.fillStyle(0xffffff, 0.06).fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT / 2);
  g.fillStyle(COLOR.sky, 0.9).fillRect(0, HUD_HEIGHT - 4, GAME_WIDTH, 4);
}

/**
 * Bakes the interface textures: full and empty hearts, the exit portal, a touch pad key, the status bar and a spark.
 *
 * @param scene - Scene used to create the textures (the boot scene).
 */
export function generateUiTextures(scene: Phaser.Scene): void {
  // A held life is a shiny heart in the life colour; a lost life is a flat blue-grey one.
  bake(scene, TextureKey.HeartFull, HEART_SIZE, HEART_SIZE, (g) => drawHeart(g, COLOR.red, true));
  bake(scene, TextureKey.HeartEmpty, HEART_SIZE, HEART_SIZE, (g) => drawHeart(g, 0x455a64, false));
  bake(scene, TextureKey.Portal, PORTAL_SIZE, PORTAL_SIZE, drawPortal);
  bake(scene, TextureKey.DpadButton, TOUCH_PAD.buttonSize, TOUCH_PAD.buttonSize, drawDpadButton);
  bake(scene, TextureKey.HudBar, GAME_WIDTH, HUD_HEIGHT, drawHudBar);
  // The spark is a plain white dot 8 px across, scaled and tinted where it is used (menu sparkles and confetti).
  bake(scene, TextureKey.Spark, 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
}
