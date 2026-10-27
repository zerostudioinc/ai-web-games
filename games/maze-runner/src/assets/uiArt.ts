// Small interface graphics: lives, exit portal, touch pad buttons, the status bar and a particle dot.
import type Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, TOUCH_PAD, TextureKey } from '../config';
import { COLOR } from '../style';
import { bake, type Gfx } from './bake';

const HEART_SIZE = 42;
const PORTAL_SIZE = 128;

function drawHeart(g: Gfx, fill: number, shine: boolean): void {
  // The rim is the same shape grown a little and drawn first, which outlines the heart without stroking curves.
  const shape = (grow: number, color: number): void => {
    g.fillStyle(color);
    g.fillCircle(14, 15, 9 + grow).fillCircle(28, 15, 9 + grow);
    g.fillTriangle(5 - grow, 18, 37 + grow, 18, 21, 36 + grow * 1.5);
  };
  shape(2.5, COLOR.ink);
  shape(0, fill);
  if (shine) g.fillStyle(0xffffff, 0.55).fillEllipse(10, 11, 8, 5);
}

/** White so it can be tinted to each theme's accent colour; the scene rotates it to point out of the maze. */
function drawPortal(g: Gfx): void {
  const c = PORTAL_SIZE / 2;
  for (let ring = 5; ring >= 1; ring--) {
    g.fillStyle(0xffffff, 0.07 * (6 - ring)).fillCircle(c, c, 24 + ring * 7.5);
  }
  g.fillStyle(0xffffff, 0.25).fillCircle(c, c, 31);
  g.lineStyle(7, 0xffffff, 1).strokeCircle(c, c, 34);
  g.fillStyle(0xffffff, 1).fillTriangle(c - 10, c - 20, c - 10, c + 20, c + 24, c);
}

/** A rounded key with an up arrow; the other three directions are this rotated. */
function drawDpadButton(g: Gfx): void {
  const s = TOUCH_PAD.buttonSize;
  g.fillStyle(COLOR.night, 0.55).fillRoundedRect(4, 4, s - 8, s - 8, 22);
  g.lineStyle(4, 0xffffff, 0.75).strokeRoundedRect(4, 4, s - 8, s - 8, 22);
  g.fillStyle(0xffffff, 0.9).fillTriangle(s / 2, 22, s / 2 - 22, s - 32, s / 2 + 22, s - 32);
}

function drawHudBar(g: Gfx): void {
  g.fillStyle(COLOR.night, 0.88).fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
  g.fillStyle(0xffffff, 0.06).fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT / 2);
  g.fillStyle(COLOR.sky, 0.9).fillRect(0, HUD_HEIGHT - 4, GAME_WIDTH, 4);
}

export function generateUiTextures(scene: Phaser.Scene): void {
  bake(scene, TextureKey.HeartFull, HEART_SIZE, HEART_SIZE, (g) => drawHeart(g, COLOR.red, true));
  bake(scene, TextureKey.HeartEmpty, HEART_SIZE, HEART_SIZE, (g) => drawHeart(g, 0x455a64, false));
  bake(scene, TextureKey.Portal, PORTAL_SIZE, PORTAL_SIZE, drawPortal);
  bake(scene, TextureKey.DpadButton, TOUCH_PAD.buttonSize, TOUCH_PAD.buttonSize, drawDpadButton);
  bake(scene, TextureKey.HudBar, GAME_WIDTH, HUD_HEIGHT, drawHudBar);
  bake(scene, TextureKey.Spark, 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
}
