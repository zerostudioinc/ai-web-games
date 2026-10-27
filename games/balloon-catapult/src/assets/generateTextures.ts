import Phaser from 'phaser';
import { FIELD_TOP, GAME_HEIGHT, GAME_WIDTH, LANE_COUNT, LANE_HEIGHT, TextureKey } from '../config';
import { COLOR, shade } from '../style';
import { scatterPoints } from '../systems/scenery';

type Gfx = Phaser.GameObjects.Graphics;

const PATH_HEIGHT = 104;
const FIELD_HEIGHT = GAME_HEIGHT - FIELD_TOP;
const FLOWER_COLORS = [0xffffff, 0xffeb3b, 0xff8fab, 0xb39ddb];

function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Gfx) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

const mix = (from: number, to: number, t: number): number => {
  const channel = (shift: number): number => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

function drawTuft(g: Gfx, x: number, y: number, scale: number, dark: boolean): void {
  g.lineStyle(2, dark ? 0x4f9a2f : 0x9ddb66);
  g.lineBetween(x - 3 * scale, y, x - 5 * scale, y - 8 * scale);
  g.lineBetween(x, y, x, y - 11 * scale);
  g.lineBetween(x + 3 * scale, y, x + 5 * scale, y - 8 * scale);
}

function drawFlower(g: Gfx, x: number, y: number, color: number): void {
  g.fillStyle(color);
  for (let k = 0; k < 5; k++) {
    const angle = (k / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * 3.4, y + Math.sin(angle) * 3.4, 2.7);
  }
  g.fillStyle(0xf9a825).fillCircle(x, y, 2.2);
}

function scatterGrassDetail(g: Gfx, seed: number, area: { left: number; top: number; right: number; bottom: number }, tufts: number, flowers: number): void {
  scatterPoints(seed, tufts, area).forEach((p, i) => drawTuft(g, p.x, p.y, 0.8 + (i % 3) * 0.25, i % 2 === 0));
  scatterPoints(seed + 1000, flowers, area).forEach((p, i) => drawFlower(g, p.x, p.y, FLOWER_COLORS[i % FLOWER_COLORS.length]));
}

function drawField(g: Gfx): void {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    g.fillStyle(lane % 2 === 0 ? COLOR.grassLight : COLOR.grassDark).fillRect(0, lane * LANE_HEIGHT, GAME_WIDTH, LANE_HEIGHT);
  }
  // Lawn-mower bands.
  for (let x = 160; x < GAME_WIDTH; x += 320) {
    g.fillStyle(0xffffff, 0.05).fillRect(x, 0, 160, FIELD_HEIGHT);
  }

  const margin = (LANE_HEIGHT - PATH_HEIGHT) / 2;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const laneTop = lane * LANE_HEIGHT;
    const pathTop = laneTop + margin;
    g.fillStyle(COLOR.pathEdge).fillRoundedRect(0, pathTop - 3, GAME_WIDTH, PATH_HEIGHT + 6, 14);
    g.fillStyle(COLOR.path).fillRoundedRect(0, pathTop, GAME_WIDTH, PATH_HEIGHT, 12);
    g.fillStyle(shade(COLOR.path, 1.08), 0.7).fillRoundedRect(0, pathTop + 6, GAME_WIDTH, 14, 7);

    scatterPoints(lane + 11, 22, { left: 0, right: GAME_WIDTH, top: pathTop + 8, bottom: pathTop + PATH_HEIGHT - 8 }).forEach((p, i) => {
      g.fillStyle(i % 2 === 0 ? COLOR.pebble : shade(COLOR.path, 1.1)).fillEllipse(p.x, p.y, 7, 4);
    });

    scatterGrassDetail(g, lane * 2 + 1, { left: 0, right: GAME_WIDTH, top: laneTop + 14, bottom: pathTop - 4 }, 14, 3);
    scatterGrassDetail(g, lane * 2 + 2, { left: 0, right: GAME_WIDTH, top: pathTop + PATH_HEIGHT + 8, bottom: laneTop + LANE_HEIGHT - 4 }, 14, 3);
  }
}

function drawHudBar(g: Gfx): void {
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 === 0 ? COLOR.wood : shade(COLOR.wood, 0.9)).fillRect(0, i * 20, GAME_WIDTH, 20);
    g.lineStyle(2, COLOR.woodDark, 0.6).lineBetween(0, i * 20, GAME_WIDTH, i * 20);
    scatterPoints(40 + i, 9, { left: 0, right: GAME_WIDTH, top: i * 20 + 2, bottom: i * 20 + 18 }).forEach((p) => {
      g.lineStyle(2, COLOR.woodDark, 0.5).lineBetween(p.x, i * 20, p.x, i * 20 + 20);
    });
  }
  g.fillStyle(COLOR.woodLight, 0.5).fillRect(0, 0, GAME_WIDTH, 4);
  g.fillStyle(COLOR.woodDark).fillRect(0, 74, GAME_WIDTH, 6);
}

function drawCloud(g: Gfx): void {
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(60, 60, 32).fillCircle(105, 45, 40).fillCircle(155, 58, 34).fillRoundedRect(40, 58, 140, 34, 17);
  g.fillStyle(0xdbeaf5, 0.7).fillRoundedRect(46, 80, 128, 12, 6);
}

function drawMenuBackground(g: Gfx): void {
  const horizon = 470;
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    g.fillStyle(mix(COLOR.skyTop, COLOR.skyBottom, i / (steps - 1))).fillRect(0, (i * horizon) / steps, GAME_WIDTH, horizon / steps + 1);
  }
  g.fillStyle(0xfff59d, 0.25).fillCircle(1080, 130, 112);
  g.fillStyle(0xfff59d, 0.4).fillCircle(1080, 130, 82);
  g.fillStyle(0xffeb3b).fillCircle(1080, 130, 54);

  g.fillStyle(0x93d36d).fillEllipse(260, 500, 1000, 300);
  g.fillStyle(0x82c95a).fillEllipse(1000, 520, 1100, 320);
  g.fillStyle(0x6fbc48).fillRect(0, 580, GAME_WIDTH, GAME_HEIGHT - 580);
  g.fillStyle(0x65b040).fillRect(0, 640, GAME_WIDTH, GAME_HEIGHT - 640);
  scatterGrassDetail(g, 90, { left: 0, right: GAME_WIDTH, top: 595, bottom: GAME_HEIGHT - 6 }, 60, 14);
}

function drawBombBody(g: Gfx): void {
  const cx = 36;
  const cy = 42;
  g.fillStyle(0x1b262c).fillCircle(cx, cy, 26);
  g.fillStyle(0x34495e).fillCircle(cx, cy, 23);
  g.fillStyle(0x263544).fillEllipse(cx + 5, cy + 9, 34, 28);
  g.fillStyle(0x6a8ba3, 0.9).fillEllipse(cx - 10, cy - 12, 14, 9);

  g.fillStyle(0x78909c).fillRoundedRect(cx - 8, cy - 32, 16, 9, 3);
  g.lineStyle(2, 0x1b262c).strokeRoundedRect(cx - 8, cy - 32, 16, 9, 3);
  g.lineStyle(3, 0xa1887f).beginPath().moveTo(cx, cy - 32).lineTo(cx + 3, cy - 37).lineTo(cx + 10, cy - 40).strokePath();

  g.fillStyle(0xffffff).fillEllipse(cx - 9, cy - 3, 11, 14).fillEllipse(cx + 9, cy - 3, 11, 14);
  g.fillStyle(0x111111).fillCircle(cx - 11, cy - 2, 3).fillCircle(cx + 7, cy - 2, 3);
  g.lineStyle(4, 0x111111).lineBetween(cx - 18, cy - 15, cx - 4, cy - 8).lineBetween(cx + 18, cy - 15, cx + 4, cy - 8);

  g.fillStyle(0x111111).fillRoundedRect(cx - 12, cy + 8, 24, 10, 3);
  g.fillStyle(0xffffff);
  for (let k = 0; k < 3; k++) {
    g.fillTriangle(cx - 10 + k * 8, cy + 8, cx - 4 + k * 8, cy + 8, cx - 7 + k * 8, cy + 14);
  }
}

// Drawn light grey so a player-colour tint shows through.
function drawBalloon(g: Gfx): void {
  g.fillStyle(0xd9d9d9).fillCircle(16, 16, 13);
  g.fillStyle(0xf2f2f2).fillEllipse(14, 14, 22, 22);
  g.fillStyle(0xffffff).fillEllipse(10, 9, 8, 6);
  g.fillStyle(0xc2c2c2).fillTriangle(16, 28, 12, 35, 20, 35);
}

export function generateTextures(scene: Phaser.Scene): void {
  bake(scene, TextureKey.Field, GAME_WIDTH, FIELD_HEIGHT, drawField);
  bake(scene, TextureKey.HudBar, GAME_WIDTH, FIELD_TOP, drawHudBar);
  bake(scene, TextureKey.Cloud, 220, 100, drawCloud);
  bake(scene, TextureKey.MenuBackground, GAME_WIDTH, GAME_HEIGHT, drawMenuBackground);
  bake(scene, TextureKey.BombBody, 72, 84, drawBombBody);
  bake(scene, TextureKey.Balloon, 32, 40, drawBalloon);
}
