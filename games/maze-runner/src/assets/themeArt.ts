// Full-screen backgrounds for the four level themes and the menu. Each is drawn once at start-up and baked to a texture.
import type Phaser from 'phaser';
import { GAME_HEIGHT as H, GAME_WIDTH as W, HUD_HEIGHT, TextureKey, themeTextureKey } from '../config';
import { COLOR, mix, shade } from '../style';
import type { Rect } from '../systems/geometry';
import { generateMaze } from '../systems/maze';
import { createRng, type Random } from '../systems/rng';
import { scatter } from '../systems/scenery';
import { THEME_IDS, type ThemeId } from '../systems/themes';
import { bake, type Gfx } from './bake';

const FULL: Rect = { x: 0, y: 0, width: W, height: H };

// The maze covers the middle of the screen, so props are scattered in the strips either side of it.
const SIDE_STRIPS: readonly Rect[] = [
  { x: 10, y: HUD_HEIGHT + 10, width: 290, height: H - HUD_HEIGHT - 20 },
  { x: W - 300, y: HUD_HEIGHT + 10, width: 290, height: H - HUD_HEIGHT - 20 },
];

const FLOWER_COLORS = [0xffffff, 0xffeb3b, 0xff8fab, 0xb39ddb] as const;

function verticalGradient(g: Gfx, top: number, bottom: number, steps = 48): void {
  const band = Math.ceil(H / steps);
  for (let i = 0; i < steps; i++) {
    g.fillStyle(mix(top, bottom, i / (steps - 1))).fillRect(0, i * band, W, band + 1);
  }
}

function drawRock(g: Gfx, x: number, y: number, radius: number, color: number): void {
  g.fillStyle(0x000000, 0.2).fillEllipse(x + radius * 0.2, y + radius * 0.6, radius * 2.2, radius * 0.9);
  g.fillStyle(color).fillEllipse(x, y, radius * 2, radius * 1.6);
  g.fillStyle(0xffffff, 0.22).fillEllipse(x - radius * 0.3, y - radius * 0.3, radius * 0.9, radius * 0.6);
}

// ---------------------------------------------------------------- Grassland

function drawTuft(g: Gfx, x: number, y: number, scale: number, dark: boolean): void {
  g.lineStyle(2, dark ? 0x4f9a2f : 0x9ddb66);
  g.lineBetween(x - 3 * scale, y, x - 5 * scale, y - 8 * scale);
  g.lineBetween(x, y, x, y - 11 * scale);
  g.lineBetween(x + 3 * scale, y, x + 5 * scale, y - 8 * scale);
}

function drawFlower(g: Gfx, x: number, y: number, color: number): void {
  g.fillStyle(color);
  for (let petal = 0; petal < 5; petal++) {
    const angle = (petal / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * 3.4, y + Math.sin(angle) * 3.4, 2.7);
  }
  g.fillStyle(0xf9a825).fillCircle(x, y, 2.2);
}

/** A round shrub seen from above: three tones of overlapping lobes, lightest toward the sun. */
function drawBush(g: Gfx, x: number, y: number, radius: number): void {
  g.fillStyle(0x000000, 0.2).fillEllipse(x + radius * 0.15, y + radius * 0.8, radius * 2.3, radius * 0.8);
  const lobes = [
    [-0.55, 0.1, 0.7],
    [0.55, 0.1, 0.72],
    [0, -0.45, 0.8],
    [0, 0.3, 0.85],
  ] as const;
  for (const [layer, color] of [[1, 0x2e7d32], [0.8, 0x43a047], [0.45, 0x81c784]] as const) {
    g.fillStyle(color);
    for (const [dx, dy, size] of lobes) {
      g.fillCircle(x + dx * radius - (1 - layer) * radius * 0.25, y + dy * radius - (1 - layer) * radius * 0.3, size * radius * layer);
    }
  }
}

function drawGrassland(g: Gfx, random: Random): void {
  // Mown stripes.
  for (let x = 0; x < W; x += 80) {
    g.fillStyle((x / 80) % 2 === 0 ? 0x74bf46 : 0x67b03b).fillRect(x, 0, 80, H);
  }
  scatter(random, 700, FULL).forEach((p, i) => drawTuft(g, p.x, p.y, 0.8 + (i % 3) * 0.25, i % 2 === 0));
  scatter(random, 110, FULL).forEach((p, i) => drawFlower(g, p.x, p.y, FLOWER_COLORS[i % FLOWER_COLORS.length]));
  for (const strip of SIDE_STRIPS) {
    scatter(random, 4, strip).forEach((p) => drawBush(g, p.x, p.y, 20 + random() * 14));
    scatter(random, 3, strip).forEach((p) => drawRock(g, p.x, p.y, 8 + random() * 6, 0x9e9e9e));
  }
}

// ---------------------------------------------------------------- Desert

function drawCactus(g: Gfx, x: number, y: number, scale: number): void {
  g.fillStyle(0x000000, 0.18).fillEllipse(x + 8 * scale, y + 2 * scale, 38 * scale, 10 * scale);
  const part = (px: number, py: number, w: number, h: number): void => {
    const radius = (Math.min(w, h) / 2) * scale;
    g.fillStyle(0x4f9a4a).fillRoundedRect(x + px * scale, y + py * scale, w * scale, h * scale, radius);
    g.lineStyle(2, 0x2e6b2c).strokeRoundedRect(x + px * scale, y + py * scale, w * scale, h * scale, radius);
  };
  part(-6, -52, 12, 52); // trunk
  part(-22, -34, 16, 8); // left arm: elbow, then the upright
  part(-22, -46, 8, 20);
  part(6, -26, 16, 8); // right arm
  part(14, -38, 8, 20);
  g.lineStyle(1, 0x2e6b2c, 0.6).lineBetween(x, y - 48 * scale, x, y - 4 * scale);
}

function drawDesert(g: Gfx, random: Random): void {
  verticalGradient(g, 0xf4d58f, 0xe0ae60);

  // Broad dunes, alternately lit and shaded, each with a bright crest along its top edge.
  for (let i = 0; i < 12; i++) {
    const width = 380 + random() * 360;
    const height = 80 + random() * 90;
    const x = random() * W;
    const y = random() * H;
    const lit = i % 2 === 0;
    g.fillStyle(lit ? 0xf9e1a3 : 0xd9a455, 0.35).fillEllipse(x, y, width, height);
    const crest = Array.from({ length: 17 }, (_, k) => {
      const angle = Math.PI + (k / 16) * Math.PI;
      return { x: x + (Math.cos(angle) * width) / 2, y: y + (Math.sin(angle) * height) / 2 };
    });
    g.lineStyle(3, 0xfff3cc, lit ? 0.5 : 0.25).strokePoints(crest);
  }

  // Wind ripples in the sand.
  scatter(random, 170, FULL).forEach((p) => {
    const ripple = Array.from({ length: 6 }, (_, k) => ({ x: p.x + k * 9, y: p.y + Math.sin(k * 1.3) * 2.5 }));
    g.lineStyle(2, 0xa8742f, 0.22).strokePoints(ripple);
  });
  scatter(random, 60, FULL).forEach((p) => drawRock(g, p.x, p.y, 3 + random() * 3, 0xb98a5a));

  for (const strip of SIDE_STRIPS) {
    scatter(random, 3, strip).forEach((p) => drawCactus(g, p.x, p.y + 40, 0.8 + random() * 0.5));
    scatter(random, 3, strip).forEach((p) => drawRock(g, p.x, p.y, 10 + random() * 8, 0xa9794a));
  }
}

// ---------------------------------------------------------------- Dungeon

function drawSkull(g: Gfx, x: number, y: number, scale: number): void {
  g.fillStyle(0x000000, 0.3).fillEllipse(x + 2 * scale, y + 11 * scale, 24 * scale, 7 * scale);
  g.fillStyle(0xe9e4d2).fillCircle(x, y, 9 * scale);
  g.fillRoundedRect(x - 5 * scale, y + 4 * scale, 10 * scale, 8 * scale, 2 * scale);
  g.fillStyle(0x15151c).fillCircle(x - 3.6 * scale, y - 0.5 * scale, 2.5 * scale).fillCircle(x + 3.6 * scale, y - 0.5 * scale, 2.5 * scale);
  g.fillTriangle(x, y + 2 * scale, x - 1.3 * scale, y + 5 * scale, x + 1.3 * scale, y + 5 * scale);
  g.lineStyle(Math.max(1, scale), 0x9a9482);
  for (const tooth of [-2.5, 0, 2.5]) g.lineBetween(x + tooth * scale, y + 8 * scale, x + tooth * scale, y + 12 * scale);
}

function drawBone(g: Gfx, x: number, y: number, angle: number, length: number): void {
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  g.lineStyle(4, 0xe9e4d2).lineBetween(x - dx, y - dy, x + dx, y + dy);
  // Knobbly ends: two bumps either side of each tip.
  const nx = Math.cos(angle + Math.PI / 2) * 2.5;
  const ny = Math.sin(angle + Math.PI / 2) * 2.5;
  g.fillStyle(0xe9e4d2);
  for (const end of [-1, 1]) {
    g.fillCircle(x + end * dx + nx, y + end * dy + ny, 3).fillCircle(x + end * dx - nx, y + end * dy - ny, 3);
  }
}

function drawTorch(g: Gfx, x: number, y: number): void {
  // A warm pool of light made from stacked translucent discs.
  for (let ring = 7; ring >= 1; ring--) g.fillStyle(0xff9800, 0.035).fillCircle(x, y, ring * 22);
  g.fillStyle(0x5d4037).fillRoundedRect(x - 4, y + 2, 8, 22, 2);
  g.fillStyle(0x3e2723).fillRect(x - 7, y + 2, 14, 4);
  g.fillStyle(0xff6d00).fillEllipse(x, y - 6, 14, 22);
  g.fillStyle(0xffd54f).fillEllipse(x, y - 3, 7, 12);
}

/** A cobweb fanning out of a screen corner; `sx` and `sy` are +1 or -1 and point into the screen. */
function drawCobweb(g: Gfx, cx: number, cy: number, sx: number, sy: number): void {
  const spokes = 5;
  const point = (spoke: number, radius: number): { x: number; y: number } => {
    const angle = (spoke / (spokes - 1)) * (Math.PI / 2);
    return { x: cx + sx * Math.cos(angle) * radius, y: cy + sy * Math.sin(angle) * radius };
  };
  g.lineStyle(1.5, 0xffffff, 0.22);
  for (let spoke = 0; spoke < spokes; spoke++) {
    const tip = point(spoke, 110);
    g.lineBetween(cx, cy, tip.x, tip.y);
  }
  for (const radius of [35, 65, 95]) {
    // Each strand between two spokes sags a little toward the corner.
    for (let spoke = 0; spoke < spokes - 1; spoke++) {
      const a = point(spoke, radius);
      const b = point(spoke + 1, radius);
      g.strokePoints([a, { x: (a.x + b.x) / 2 - sx * 5, y: (a.y + b.y) / 2 - sy * 5 }, b]);
    }
  }
}

function drawDungeon(g: Gfx, random: Random): void {
  g.fillStyle(0x12121a).fillRect(0, 0, W, H);

  // Flagstones, each a slightly different tone and bevelled so it catches the torchlight.
  for (let ty = 0; ty < H; ty += 64) {
    for (let tx = 0; tx < W; tx += 64) {
      g.fillStyle(shade(0x3a3a48, 0.8 + random() * 0.35)).fillRect(tx + 2, ty + 2, 60, 60);
      g.fillStyle(0xffffff, 0.05).fillRect(tx + 2, ty + 2, 60, 4);
      g.fillStyle(0x000000, 0.18).fillRect(tx + 2, ty + 58, 60, 4);
    }
  }

  // Cracks wander out from random points.
  g.lineStyle(1.5, 0x0d0d14, 0.7);
  for (const start of scatter(random, 45, FULL)) {
    let { x, y } = start;
    const crack = [{ x, y }];
    for (let step = 0; step < 4; step++) {
      x += (random() - 0.5) * 28;
      y += (random() - 0.2) * 22;
      crack.push({ x, y });
    }
    g.strokePoints(crack);
  }

  // Moss creeping over the stones, and a few eerie green glows.
  for (const p of scatter(random, 30, FULL)) {
    for (let blob = 0; blob < 4; blob++) {
      g.fillStyle(blob % 2 === 0 ? 0x2f5d3a : 0x4f8f5a, 0.4).fillCircle(p.x + (random() - 0.5) * 30, p.y + (random() - 0.5) * 20, 6 + random() * 8);
    }
  }
  for (const p of scatter(random, 4, FULL)) {
    for (let ring = 6; ring >= 1; ring--) g.fillStyle(0x69f0ae, 0.025).fillCircle(p.x, p.y, ring * 30);
  }

  for (const strip of SIDE_STRIPS) {
    scatter(random, 3, strip).forEach((p) => drawSkull(g, p.x, p.y, 0.9 + random() * 0.5));
    scatter(random, 5, strip).forEach((p) => drawBone(g, p.x, p.y, random() * Math.PI, 24 + random() * 14));
  }
  for (const x of [70, W - 70]) {
    for (const y of [150, 390, 630]) drawTorch(g, x, y);
  }
  drawCobweb(g, 0, HUD_HEIGHT, 1, 1);
  drawCobweb(g, W, HUD_HEIGHT, -1, 1);
  drawCobweb(g, 0, H, 1, -1);
  drawCobweb(g, W, H, -1, -1);

  // Dark vignette: nested frames that fade from black at the edges to nothing toward the middle.
  for (let i = 0; i < 16; i++) {
    g.lineStyle(14, 0x000000, 0.5 * (1 - i / 16) ** 2);
    g.strokeRect(i * 14 + 7, i * 14 + 7, W - i * 28 - 14, H - i * 28 - 14);
  }
}

// ---------------------------------------------------------------- Spaceship

function drawPorthole(g: Gfx, x: number, y: number, radius: number, random: Random): void {
  g.fillStyle(0x3b4d5c).fillCircle(x, y, radius + 9);
  g.fillStyle(0x1b2733).fillCircle(x, y, radius + 4);
  g.fillStyle(0x050a14).fillCircle(x, y, radius);
  // Stars, kept inside the glass.
  for (let star = 0; star < 16; star++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (radius - 4);
    g.fillStyle(0xffffff, 0.4 + random() * 0.6).fillCircle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.8 + random() * 0.8);
  }
  // A small ringed planet, a glint on the glass, and bolts round the rim.
  g.fillStyle(0x5c6bc0).fillCircle(x + radius * 0.3, y + radius * 0.25, radius * 0.32);
  g.lineStyle(2, 0xb39ddb, 0.8).strokeEllipse(x + radius * 0.3, y + radius * 0.25, radius * 0.95, radius * 0.25);
  g.lineStyle(3, 0xffffff, 0.18).beginPath().arc(x, y, radius - 5, Math.PI * 1.1, Math.PI * 1.45).strokePath();
  g.fillStyle(0x8aa4b8);
  for (let bolt = 0; bolt < 8; bolt++) {
    const angle = (bolt / 8) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * (radius + 6.5), y + Math.sin(angle) * (radius + 6.5), 1.8);
  }
}

function drawVent(g: Gfx, x: number, y: number): void {
  g.fillStyle(0x0a1119).fillRoundedRect(x, y, 80, 34, 6);
  g.lineStyle(2, 0x6f8ba0, 0.6).strokeRoundedRect(x, y, 80, 34, 6);
  for (let slot = 0; slot < 6; slot++) g.lineBetween(x + 10 + slot * 12, y + 6, x + 10 + slot * 12, y + 28);
}

/** A glowing conduit: wide faint strokes under a thin bright one. */
function drawConduit(g: Gfx, x1: number, y1: number, x2: number, y2: number): void {
  for (const [width, alpha] of [[14, 0.06], [8, 0.12], [3, 0.85]] as const) {
    g.lineStyle(width, 0x00e5ff, alpha).lineBetween(x1, y1, x2, y2);
  }
}

function drawSpaceship(g: Gfx, random: Random): void {
  g.fillStyle(0x121b27).fillRect(0, 0, W, H);

  // Hull plates with bevelled edges and rivets in the corners.
  for (let ty = 0; ty < H; ty += 80) {
    for (let tx = 0; tx < W; tx += 80) {
      g.fillStyle(shade(0x22334a, 0.85 + random() * 0.3)).fillRect(tx + 2, ty + 2, 76, 76);
      g.fillStyle(0xffffff, 0.07).fillRect(tx + 2, ty + 2, 76, 3).fillRect(tx + 2, ty + 2, 3, 76);
      g.fillStyle(0x000000, 0.25).fillRect(tx + 2, ty + 75, 76, 3).fillRect(tx + 75, ty + 2, 3, 76);
      g.fillStyle(0x6f8ba0, 0.8);
      for (const [rx, ry] of [[10, 10], [70, 10], [10, 70], [70, 70]] as const) g.fillCircle(tx + rx, ty + ry, 2.2);
    }
  }

  for (const y of [150, 390, 630]) drawConduit(g, 0, y, W, y);
  for (const x of [48, W - 48]) drawConduit(g, x, HUD_HEIGHT, x, H);

  // Hazard stripes down both edges.
  for (const x of [0, W - 22]) {
    g.fillStyle(0x111111).fillRect(x, 0, 22, H);
    g.fillStyle(0xffc107);
    for (let y = -22; y < H; y += 44) {
      g.fillPoints([{ x, y: y + 22 }, { x: x + 22, y }, { x: x + 22, y: y + 22 }, { x, y: y + 44 }], true);
    }
  }

  drawPorthole(g, 140, 270, 46, random);
  drawPorthole(g, W - 140, 480, 46, random);
  drawPorthole(g, W - 150, 150, 34, random);
  drawVent(g, 100, 540);
  drawVent(g, W - 180, 330);

  // Status lights blinking in four colours.
  const lights = [0xff5252, 0x69f0ae, 0x40c4ff, 0xffd740];
  for (const strip of SIDE_STRIPS) {
    scatter(random, 14, strip).forEach((p, i) => {
      const color = lights[i % lights.length];
      g.fillStyle(color, 0.25).fillCircle(p.x, p.y, 7);
      g.fillStyle(color).fillCircle(p.x, p.y, 2.6);
    });
  }
}

// ---------------------------------------------------------------- Menu

function drawMenuBackdrop(g: Gfx, random: Random): void {
  verticalGradient(g, 0x0b1d2a, 0x15506b, 60);
  for (let ring = 8; ring >= 1; ring--) g.fillStyle(COLOR.teal, 0.02).fillCircle(W / 2, 210, ring * 55);

  // A faint maze, drawn from the same generator the game uses, fills the whole screen.
  const cell = 40;
  const maze = generateMaze(W / cell, H / cell, random);
  for (const run of maze.wallRuns()) {
    const from = run.from * cell;
    const to = run.to * cell;
    const at = run.line * cell;
    const [x1, y1, x2, y2] = run.horizontal ? [from, at, to, at] : [at, from, at, to];
    g.lineStyle(7, COLOR.teal, 0.07).lineBetween(x1, y1, x2, y2);
    g.lineStyle(2, COLOR.teal, 0.2).lineBetween(x1, y1, x2, y2);
  }

  for (const p of scatter(random, 70, FULL)) {
    g.fillStyle(0xffffff, 0.15 + random() * 0.4).fillCircle(p.x, p.y, 0.8 + random() * 1.4);
  }

  // A track along the bottom for the menu runner to jog on.
  g.fillStyle(0x000000, 0.3).fillRect(0, H - 76, W, 76);
  g.lineStyle(3, COLOR.teal, 0.55).lineBetween(0, H - 76, W, H - 76);
  for (let x = 20; x < W; x += 80) g.lineStyle(3, 0xffffff, 0.18).lineBetween(x, H - 36, x + 40, H - 36);
}

const THEME_DRAWERS: Record<ThemeId, (g: Gfx, random: Random) => void> = {
  grassland: drawGrassland,
  desert: drawDesert,
  dungeon: drawDungeon,
  spaceship: drawSpaceship,
};

/** Bakes the menu backdrop and one background per theme. Fixed seeds keep them identical on every load. */
export function generateBackgrounds(scene: Phaser.Scene): void {
  bake(scene, TextureKey.MenuBackground, W, H, (g) => drawMenuBackdrop(g, createRng(11)));
  THEME_IDS.forEach((id, index) => {
    bake(scene, themeTextureKey(id), W, H, (g) => THEME_DRAWERS[id](g, createRng(100 + index)));
  });
}
