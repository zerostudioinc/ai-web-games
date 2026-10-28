/**
 * The runner: a small explorer drawn in code, with a four-frame walk cycle facing each of the four directions.
 * There is one outfit per player, so the two runners of a versus game can be told apart.
 */
import type Phaser from 'phaser';
import { COLOR } from '../style';
import { DIRECTIONS, type Direction } from '../systems/maze';
import { bake, type Gfx } from './bake';

export const RUNNER_FRAME_SIZE = 64; // width and height of every frame texture, px
/** Height the figure covers inside its frame, in px; the scene scales this to fit a maze cell. */
export const RUNNER_FIGURE_HEIGHT = 56;
export const WALK_FRAME_COUNT = 4; // frames in one walk cycle, for each facing direction
/** Standing pose (a 0-based frame number of the walk cycle): the legs passing under the body. */
export const IDLE_FRAME = 1;

/**
 * Texture key of one walk-cycle frame.
 *
 * @param facing - Direction the runner faces.
 * @param frame - 0-based frame number, 0 to `WALK_FRAME_COUNT - 1`.
 * @param variant - 0-based outfit: 0 for player one (and a solo runner), 1 for player two.
 * @returns The key, `runner-<facing>-<frame>` for outfit 0 and `runner-<variant>-<facing>-<frame>` for the others.
 */
export const runnerFrameKey = (facing: Direction, frame: number, variant = 0): string =>
  variant === 0 ? `runner-${facing}-${frame}` : `runner-${variant}-${facing}-${frame}`;

/**
 * Key of the looping walk animation for one facing direction.
 *
 * @param facing - Direction the runner faces.
 * @param variant - 0-based outfit, as in `runnerFrameKey`.
 * @returns The key, `runner-walk-<facing>` for outfit 0 and `runner-<variant>-walk-<facing>` for the others.
 */
export const runnerWalkKey = (facing: Direction, variant = 0): string =>
  variant === 0 ? `runner-walk-${facing}` : `runner-${variant}-walk-${facing}`;

/** The colours of one outfit, all 0xRRGGBB. The _dark variants are the shaded tones: far limbs, the cap's band and brim, and the top of the pack. */
interface Outfit {
  shirt: number;
  shirtDark: number;
  pants: number;
  pantsDark: number;
  cap: number;
  capDark: number;
  pack: number;
  packDark: number;
}

// Skin and shoes are the same in every outfit.
const SKIN = 0xffd2a8;
const SHOE = 0x6d4c41;

/** The outfits, by variant: player one wears a blue shirt, an orange cap and a yellow pack; player two a red shirt, a teal cap and a purple pack. */
const OUTFITS: readonly Outfit[] = [
  { shirt: 0x3d8bfd, shirtDark: 0x2a63b8, pants: 0x2f4a8a, pantsDark: 0x233a6e, cap: 0xff7043, capDark: 0xd84315, pack: 0xffb300, packDark: 0xc77e00 },
  { shirt: 0xe84a5f, shirtDark: 0xa82f42, pants: 0x4a4a68, pantsDark: 0x35354e, cap: 0x26c6da, capDark: 0x0097a7, pack: 0xab47bc, packDark: 0x7b1fa2 },
];

// Per frame: which way the legs and arms reach (one way, passing, the other way, passing)...
const SWING = [-1, 0, 1, 0] as const;
// ...and the body's vertical offset in px (negative lifts it). It rises while the legs pass each other, which gives the stride its bounce.
const BOB = [0, -2, 0, -2] as const;

/**
 * A rounded part with a dark outline.
 *
 * @param g - Graphics object to draw on.
 * @param x - Left edge, px.
 * @param y - Top edge, px.
 * @param w - Width, px.
 * @param h - Height, px.
 * @param radius - Corner radius, px.
 * @param fill - Fill colour as 0xRRGGBB.
 */
function box(g: Gfx, x: number, y: number, w: number, h: number, radius: number, fill: number): void {
  g.fillStyle(fill).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, COLOR.ink).strokeRoundedRect(x, y, w, h, radius);
}

/**
 * A round part with a dark outline.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x, px.
 * @param y - Centre y, px.
 * @param radius - Circle radius, px.
 * @param fill - Fill colour as 0xRRGGBB.
 */
function ball(g: Gfx, x: number, y: number, radius: number, fill: number): void {
  g.fillStyle(fill).fillCircle(x, y, radius);
  g.lineStyle(2, COLOR.ink).strokeCircle(x, y, radius);
}

/**
 * An arm seen from the side: a thick line with an outline.
 *
 * @param g - Graphics object to draw on.
 * @param x1 - Start x (the shoulder), px.
 * @param y1 - Start y, px.
 * @param x2 - End x (the hand), px.
 * @param y2 - End y, px.
 * @param color - Colour of the arm as 0xRRGGBB; it is 5 px thick, drawn over a 9 px dark outline line.
 */
function limb(g: Gfx, x1: number, y1: number, x2: number, y2: number, color: number): void {
  g.lineStyle(9, COLOR.ink).lineBetween(x1, y1, x2, y2);
  g.lineStyle(5, color).lineBetween(x1, y1, x2, y2);
}

/**
 * The cap's domed top: a half disc over the head, outlined along its flat edge as well.
 *
 * @param g - Graphics object to draw on.
 * @param cx - Centre x of the head circle the dome sits on, px.
 * @param cy - Centre y of the head circle, px; the dome covers the half above it.
 * @param radius - Radius of the dome, px.
 * @param color - Colour of the cap as 0xRRGGBB.
 */
function capDome(g: Gfx, cx: number, cy: number, radius: number, color: number): void {
  g.fillStyle(color).beginPath().arc(cx, cy, radius, Math.PI, Math.PI * 2).closePath().fillPath();
  g.lineStyle(2, COLOR.ink).beginPath().arc(cx, cy, radius, Math.PI, Math.PI * 2).closePath().strokePath();
}

/**
 * Draws the runner in front view (facing down the screen) or back view (facing up).
 *
 * @param g - Graphics object to draw on (one 64 x 64 px frame).
 * @param o - The outfit's colours.
 * @param back - True for the back view (cap over the whole head, backpack showing), false for the front view (face, pack straps).
 * @param swing - Leg and arm swing of this frame: -1, 0 or 1, from `SWING`. Each unit moves a leg or arm by 3 px.
 * @param bob - Vertical offset of the body in px for this frame, from `BOB`; negative lifts it.
 */
function drawFrontOrBack(g: Gfx, o: Outfit, back: boolean, swing: number, bob: number): void {
  // Legs: the one reaching forward plants lower while the other lifts.
  // Each entry is [left edge x in px, side]; `side` makes the two legs move in opposite directions.
  for (const [x, side] of [[21, 1], [32, -1]] as const) {
    const y = 41 + 3 * swing * side;
    box(g, x, y, 11, 15, 4, o.pants);
    box(g, x - 1, y + 11, 13, 6, 3, SHOE); // shoe over the bottom of the leg, a little wider than it
  }

  // Torso, with the backpack showing from behind and its straps from the front.
  box(g, 19, 27 + bob, 26, 20, 7, o.shirt);
  if (back) {
    box(g, 21, 29 + bob, 22, 17, 5, o.pack); // the backpack, covering most of the back
    box(g, 21, 29 + bob, 22, 7, 4, o.packDark); // its darker top
  } else {
    // Two pack straps over the chest.
    g.lineStyle(3, o.pack).lineBetween(25, 28 + bob, 25, 44 + bob).lineBetween(39, 28 + bob, 39, 44 + bob);
  }

  // Each arm swings against the leg on its own side.
  // Each entry is [left edge x in px, side], like the legs above.
  for (const [x, side] of [[11, -1], [45, 1]] as const) {
    const y = 29 + bob + 3 * swing * side;
    box(g, x, y, 8, 15, 4, o.shirtDark);
    ball(g, x + 4, y + 16, 4, SKIN); // the hand, just below the sleeve
  }

  const headY = 18 + bob; // centre y of the head, px; it moves with the body
  if (back) {
    // From behind the cap covers the whole head; only the ears peek out.
    ball(g, 19.5, headY + 3, 3, SKIN);
    ball(g, 44.5, headY + 3, 3, SKIN);
    ball(g, 32, headY, 13, o.cap);
    // Cap seam down the middle, a darker band near the bottom edge and the button on top.
    g.lineStyle(2, o.capDark).lineBetween(32, headY - 12, 32, headY + 1);
    box(g, 20, headY + 7, 24, 5, 2.5, o.capDark);
    ball(g, 32, headY - 13, 2, o.capDark);
    return;
  }

  // Front view: the head, blushing cheeks, eyes with a tiny white glint, then a smile.
  ball(g, 32, headY, 13, SKIN);
  g.fillStyle(0xff8a80, 0.55).fillCircle(23, headY + 8, 2.4).fillCircle(41, headY + 8, 2.4);
  for (const x of [26.5, 37.5]) {
    g.fillStyle(COLOR.ink).fillCircle(x, headY + 5, 2.4);
    g.fillStyle(0xffffff).fillCircle(x + 0.8, headY + 4.2, 0.9);
  }
  g.lineStyle(2, COLOR.ink).beginPath().arc(32, headY + 8, 3, Math.PI * 0.15, Math.PI * 0.85).strokePath();
  // Cap: the dome over the top of the head, a darker band across the forehead (the brim seen head-on) and the button.
  capDome(g, 32, headY, 13.5, o.cap);
  box(g, 19, headY - 4, 26, 5, 2.5, o.capDark);
  ball(g, 32, headY - 13, 2, o.capDark);
}

/**
 * Draws the runner in side view, facing right; the left-facing frames are this drawing mirrored.
 *
 * @param g - Graphics object to draw on (one 64 x 64 px frame).
 * @param o - The outfit's colours.
 * @param swing - Leg and arm swing of this frame: -1, 0 or 1, from `SWING`. Each unit moves the legs 7 px.
 * @param bob - Vertical offset of the upper body in px for this frame, from `BOB`; negative lifts it.
 */
function drawSide(g: Gfx, o: Outfit, swing: number, bob: number): void {
  // How far the near leg reaches ahead of the body, px (negative: behind it). The far leg moves the opposite way.
  const reach = 7 * swing;
  const lift = swing === 0 ? 3 : 0; // the trailing foot lifts as the legs pass

  // Far leg first, in a darker tone, so the near leg overlaps it.
  box(g, 27 - reach, 41 - lift, 10, 15, 4, o.pantsDark);
  box(g, 27 - reach, 52 - lift, 14, 7, 3, SHOE);
  box(g, 27 + reach, 41, 10, 15, 4, o.pants);
  box(g, 27 + reach, 52, 14, 7, 3, SHOE);

  // Arms swing against the leg on their side. The far arm sits behind the torso, the near arm in front of it.
  // Both arms reach 1.1 times as far as the legs.
  const shoulderY = 32 + bob;
  const handY = 45 + bob;
  limb(g, 32, shoulderY, 32 + reach * 1.1, handY, o.shirtDark);
  ball(g, 32 + reach * 1.1, handY + 1, 3.6, SKIN);

  box(g, 13, 29 + bob, 12, 17, 4, o.pack); // backpack, on the runner's back
  box(g, 22, 27 + bob, 20, 21, 7, o.shirt); // torso, drawn over the far arm

  limb(g, 32, shoulderY, 32 - reach * 1.1, handY, o.shirt);
  ball(g, 32 - reach * 1.1, handY + 1, 3.6, SKIN);
  g.fillStyle(o.shirt).fillCircle(32, shoulderY, 4.5); // rounds off the shoulder end of the arm

  const headY = 18 + bob; // centre y of the head, px; it moves with the body
  ball(g, 34, headY, 13, SKIN);
  ball(g, 28, headY + 4, 2.6, SKIN); // ear
  // The face is on the right-hand side: a cheek, one eye with a glint, then a small smile.
  g.fillStyle(0xff8a80, 0.55).fillCircle(41, headY + 8, 2.4);
  g.fillStyle(COLOR.ink).fillCircle(40, headY + 5, 2.4);
  g.fillStyle(0xffffff).fillCircle(40.8, headY + 4.2, 0.9);
  g.lineStyle(2, COLOR.ink).beginPath().arc(41, headY + 8, 2.4, Math.PI * 0.2, Math.PI * 0.8).strokePath();
  // Cap: the dome, the brim and the button on top.
  capDome(g, 34, headY, 13.5, o.cap);
  box(g, 36, headY - 4, 19, 5, 2.5, o.capDark); // the brim sticks out ahead
  ball(g, 34, headY - 13, 2, o.capDark);
}

/**
 * Draws one walk-cycle frame for one facing direction.
 *
 * @param g - Graphics object to draw on (one 64 x 64 px frame).
 * @param o - The outfit's colours.
 * @param facing - Direction the runner faces.
 * @param frame - 0-based walk-cycle frame, 0 to `WALK_FRAME_COUNT - 1`; it picks the leg and arm swing and the body bob.
 */
function drawFrame(g: Gfx, o: Outfit, facing: Direction, frame: number): void {
  const swing = SWING[frame];
  const bob = BOB[frame];
  if (facing === 'down' || facing === 'up') {
    drawFrontOrBack(g, o, facing === 'up', swing, bob);
    return;
  }
  if (facing === 'left') {
    // Flip the right-facing drawing across the frame's centre line: move the origin to the right edge, then mirror x.
    g.save();
    g.translateCanvas(RUNNER_FRAME_SIZE, 0);
    g.scaleCanvas(-1, 1);
  }
  drawSide(g, o, swing, bob);
  // Undo the mirroring.
  if (facing === 'left') g.restore();
}

/**
 * Bakes every frame (4 per direction, for each outfit) and registers one looping walk animation for each direction and outfit.
 *
 * @param scene - Scene used to create the textures and register the animations (the boot scene).
 */
export function generateRunnerTextures(scene: Phaser.Scene): void {
  OUTFITS.forEach((outfit, variant) => {
    for (const facing of DIRECTIONS) {
      // One texture per walk frame, keyed by `runnerFrameKey`.
      for (let frame = 0; frame < WALK_FRAME_COUNT; frame++) {
        bake(scene, runnerFrameKey(facing, frame, variant), RUNNER_FRAME_SIZE, RUNNER_FRAME_SIZE, (g) => drawFrame(g, outfit, facing, frame));
      }
      const key = runnerWalkKey(facing, variant);
      // Animations are global to the game, so each one is registered only once (the game may restart its scenes).
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => ({ key: runnerFrameKey(facing, frame, variant) })),
          frameRate: 12, // frames per second, so one full walk cycle takes a third of a second
          repeat: -1, // loop forever
        });
      }
    }
  });
}
