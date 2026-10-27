// The runner: a small explorer drawn in code, with a four-frame walk cycle facing each of the four directions.
import type Phaser from 'phaser';
import { COLOR } from '../style';
import { DIRECTIONS, type Direction } from '../systems/maze';
import { bake, type Gfx } from './bake';

export const RUNNER_FRAME_SIZE = 64;
/** Height the figure covers inside its frame; the scene scales this to fit a maze cell. */
export const RUNNER_FIGURE_HEIGHT = 56;
export const WALK_FRAME_COUNT = 4;
/** Standing pose: the legs passing under the body. */
export const IDLE_FRAME = 1;

export const runnerFrameKey = (facing: Direction, frame: number): string => `runner-${facing}-${frame}`;
export const runnerWalkKey = (facing: Direction): string => `runner-walk-${facing}`;

const SKIN = 0xffd2a8;
const SHIRT = 0x3d8bfd;
const SHIRT_DARK = 0x2a63b8;
const PANTS = 0x2f4a8a;
const PANTS_DARK = 0x233a6e;
const SHOE = 0x6d4c41;
const CAP = 0xff7043;
const CAP_DARK = 0xd84315;
const PACK = 0xffb300;
const PACK_DARK = 0xc77e00;

// Per frame: which way the legs and arms reach (one way, passing, the other way, passing)...
const SWING = [-1, 0, 1, 0] as const;
// ...and how far the body lifts. It rises while the legs pass each other, which gives the stride its bounce.
const BOB = [0, -2, 0, -2] as const;

/** A rounded part with a dark outline. */
function box(g: Gfx, x: number, y: number, w: number, h: number, radius: number, fill: number): void {
  g.fillStyle(fill).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, COLOR.ink).strokeRoundedRect(x, y, w, h, radius);
}

/** A round part with a dark outline. */
function ball(g: Gfx, x: number, y: number, radius: number, fill: number): void {
  g.fillStyle(fill).fillCircle(x, y, radius);
  g.lineStyle(2, COLOR.ink).strokeCircle(x, y, radius);
}

/** An arm seen from the side: a thick line with an outline. */
function limb(g: Gfx, x1: number, y1: number, x2: number, y2: number, color: number): void {
  g.lineStyle(9, COLOR.ink).lineBetween(x1, y1, x2, y2);
  g.lineStyle(5, color).lineBetween(x1, y1, x2, y2);
}

/** The cap's domed top: a half disc over the head, outlined along its flat edge as well. */
function capDome(g: Gfx, cx: number, cy: number, radius: number): void {
  g.fillStyle(CAP).beginPath().arc(cx, cy, radius, Math.PI, Math.PI * 2).closePath().fillPath();
  g.lineStyle(2, COLOR.ink).beginPath().arc(cx, cy, radius, Math.PI, Math.PI * 2).closePath().strokePath();
}

/** Front (facing down the screen) or back (facing up) view. */
function drawFrontOrBack(g: Gfx, back: boolean, swing: number, bob: number): void {
  // Legs: the one reaching forward plants lower while the other lifts.
  for (const [x, side] of [[21, 1], [32, -1]] as const) {
    const y = 41 + 3 * swing * side;
    box(g, x, y, 11, 15, 4, PANTS);
    box(g, x - 1, y + 11, 13, 6, 3, SHOE);
  }

  // Torso, with the backpack showing from behind and its straps from the front.
  box(g, 19, 27 + bob, 26, 20, 7, SHIRT);
  if (back) {
    box(g, 21, 29 + bob, 22, 17, 5, PACK);
    box(g, 21, 29 + bob, 22, 7, 4, PACK_DARK);
  } else {
    g.lineStyle(3, PACK).lineBetween(25, 28 + bob, 25, 44 + bob).lineBetween(39, 28 + bob, 39, 44 + bob);
  }

  // Each arm swings against the leg on its own side.
  for (const [x, side] of [[11, -1], [45, 1]] as const) {
    const y = 29 + bob + 3 * swing * side;
    box(g, x, y, 8, 15, 4, SHIRT_DARK);
    ball(g, x + 4, y + 16, 4, SKIN);
  }

  const headY = 18 + bob;
  if (back) {
    // From behind the cap covers the whole head; only the ears peek out.
    ball(g, 19.5, headY + 3, 3, SKIN);
    ball(g, 44.5, headY + 3, 3, SKIN);
    ball(g, 32, headY, 13, CAP);
    g.lineStyle(2, CAP_DARK).lineBetween(32, headY - 12, 32, headY + 1);
    box(g, 20, headY + 7, 24, 5, 2.5, CAP_DARK);
    ball(g, 32, headY - 13, 2, CAP_DARK);
    return;
  }

  ball(g, 32, headY, 13, SKIN);
  g.fillStyle(0xff8a80, 0.55).fillCircle(23, headY + 8, 2.4).fillCircle(41, headY + 8, 2.4);
  for (const x of [26.5, 37.5]) {
    g.fillStyle(COLOR.ink).fillCircle(x, headY + 5, 2.4);
    g.fillStyle(0xffffff).fillCircle(x + 0.8, headY + 4.2, 0.9);
  }
  g.lineStyle(2, COLOR.ink).beginPath().arc(32, headY + 8, 3, Math.PI * 0.15, Math.PI * 0.85).strokePath();
  capDome(g, 32, headY, 13.5);
  box(g, 19, headY - 4, 26, 5, 2.5, CAP_DARK);
  ball(g, 32, headY - 13, 2, CAP_DARK);
}

/** Side view facing right; the left-facing frames are this drawing mirrored. */
function drawSide(g: Gfx, swing: number, bob: number): void {
  const reach = 7 * swing;
  const lift = swing === 0 ? 3 : 0; // the trailing foot lifts as the legs pass

  // Far leg first, in a darker tone, so the near leg overlaps it.
  box(g, 27 - reach, 41 - lift, 10, 15, 4, PANTS_DARK);
  box(g, 27 - reach, 52 - lift, 14, 7, 3, SHOE);
  box(g, 27 + reach, 41, 10, 15, 4, PANTS);
  box(g, 27 + reach, 52, 14, 7, 3, SHOE);

  // Arms swing against the leg on their side. The far arm sits behind the torso, the near arm in front of it.
  const shoulderY = 32 + bob;
  const handY = 45 + bob;
  limb(g, 32, shoulderY, 32 + reach * 1.1, handY, SHIRT_DARK);
  ball(g, 32 + reach * 1.1, handY + 1, 3.6, SKIN);

  box(g, 13, 29 + bob, 12, 17, 4, PACK); // backpack, on the runner's back
  box(g, 22, 27 + bob, 20, 21, 7, SHIRT);

  limb(g, 32, shoulderY, 32 - reach * 1.1, handY, SHIRT);
  ball(g, 32 - reach * 1.1, handY + 1, 3.6, SKIN);
  g.fillStyle(SHIRT).fillCircle(32, shoulderY, 4.5); // rounds off the shoulder end of the arm

  const headY = 18 + bob;
  ball(g, 34, headY, 13, SKIN);
  ball(g, 28, headY + 4, 2.6, SKIN); // ear
  g.fillStyle(0xff8a80, 0.55).fillCircle(41, headY + 8, 2.4);
  g.fillStyle(COLOR.ink).fillCircle(40, headY + 5, 2.4);
  g.fillStyle(0xffffff).fillCircle(40.8, headY + 4.2, 0.9);
  g.lineStyle(2, COLOR.ink).beginPath().arc(41, headY + 8, 2.4, Math.PI * 0.2, Math.PI * 0.8).strokePath();
  capDome(g, 34, headY, 13.5);
  box(g, 36, headY - 4, 19, 5, 2.5, CAP_DARK); // the brim sticks out ahead
  ball(g, 34, headY - 13, 2, CAP_DARK);
}

function drawFrame(g: Gfx, facing: Direction, frame: number): void {
  const swing = SWING[frame];
  const bob = BOB[frame];
  if (facing === 'down' || facing === 'up') {
    drawFrontOrBack(g, facing === 'up', swing, bob);
    return;
  }
  if (facing === 'left') {
    // Flip the right-facing drawing across the frame's centre line.
    g.save();
    g.translateCanvas(RUNNER_FRAME_SIZE, 0);
    g.scaleCanvas(-1, 1);
  }
  drawSide(g, swing, bob);
  if (facing === 'left') g.restore();
}

/** Bakes all 16 frames (4 per direction) and registers one looping walk animation for each direction. */
export function generateRunnerTextures(scene: Phaser.Scene): void {
  for (const facing of DIRECTIONS) {
    for (let frame = 0; frame < WALK_FRAME_COUNT; frame++) {
      bake(scene, runnerFrameKey(facing, frame), RUNNER_FRAME_SIZE, RUNNER_FRAME_SIZE, (g) => drawFrame(g, facing, frame));
    }
    const key = runnerWalkKey(facing);
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => ({ key: runnerFrameKey(facing, frame) })),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}
