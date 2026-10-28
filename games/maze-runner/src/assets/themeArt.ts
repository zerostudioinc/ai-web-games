/**
 * Full-screen backgrounds for the five level themes and the menu. Each is drawn once at start-up and baked to a texture.
 * `W` and `H` are the screen's width and height in px.
 */
import type Phaser from 'phaser';
import { GAME_HEIGHT as H, GAME_WIDTH as W, HUD_HEIGHT, TextureKey, themeTextureKey } from '../config';
import { COLOR, mix, shade } from '../style';
import type { Rect } from '../systems/geometry';
import { generateMaze } from '../systems/maze';
import { createRng, type Random } from '../systems/rng';
import { scatter } from '../systems/scenery';
import { THEME_IDS, type ThemeId } from '../systems/themes';
import { bake, type Gfx } from './bake';

const FULL: Rect = { x: 0, y: 0, width: W, height: H }; // the whole screen, px

// The maze covers the middle of the screen, so props are scattered in the strips either side of it:
// each 290 px wide, 10 px in from the screen edge and below the HUD bar.
const SIDE_STRIPS: readonly Rect[] = [
  { x: 10, y: HUD_HEIGHT + 10, width: 290, height: H - HUD_HEIGHT - 20 },
  { x: W - 300, y: HUD_HEIGHT + 10, width: 290, height: H - HUD_HEIGHT - 20 },
];

const FLOWER_COLORS = [0xffffff, 0xffeb3b, 0xff8fab, 0xb39ddb] as const; // petal colours (0xRRGGBB), cycled in order

/**
 * Fills the whole screen with a top-to-bottom colour gradient, built from thin horizontal bands.
 *
 * @param g - Graphics object to draw on.
 * @param top - Colour at the top edge, as 0xRRGGBB.
 * @param bottom - Colour at the bottom edge, as 0xRRGGBB.
 * @param steps - Number of bands; more bands give a smoother blend. Defaults to 48.
 */
function verticalGradient(g: Gfx, top: number, bottom: number, steps = 48): void {
  // Height of one band, px, rounded up so the bands cover the screen.
  const band = Math.ceil(H / steps);
  for (let i = 0; i < steps; i++) {
    // Each band is one pixel taller than its step, so neighbouring bands overlap and leave no seams.
    g.fillStyle(mix(top, bottom, i / (steps - 1))).fillRect(0, i * band, W, band + 1);
  }
}

/**
 * Draws a small boulder: a ground shadow, a flat oval body and a pale highlight at its upper left.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the rock, px.
 * @param y - Centre y of the rock, px.
 * @param radius - Half the rock's width, px; it is 0.8 times as tall as it is wide.
 * @param color - Colour of the rock as 0xRRGGBB.
 */
function drawRock(g: Gfx, x: number, y: number, radius: number, color: number): void {
  g.fillStyle(0x000000, 0.2).fillEllipse(x + radius * 0.2, y + radius * 0.6, radius * 2.2, radius * 0.9);
  g.fillStyle(color).fillEllipse(x, y, radius * 2, radius * 1.6);
  g.fillStyle(0xffffff, 0.22).fillEllipse(x - radius * 0.3, y - radius * 0.3, radius * 0.9, radius * 0.6);
}

// ---------------------------------------------------------------- Grassland

/**
 * Draws a small tuft of grass: three blades fanning out from one point.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the tuft's base, px.
 * @param y - Y of the tuft's base, px.
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
 * @param x - Centre x, px.
 * @param y - Centre y, px.
 * @param color - Petal colour as 0xRRGGBB.
 */
function drawFlower(g: Gfx, x: number, y: number, color: number): void {
  g.fillStyle(color);
  // Five petals spaced evenly around the centre.
  for (let petal = 0; petal < 5; petal++) {
    const angle = (petal / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * 3.4, y + Math.sin(angle) * 3.4, 2.7);
  }
  g.fillStyle(0xf9a825).fillCircle(x, y, 2.2);
}

/**
 * A round shrub seen from above: three tones of overlapping lobes, lightest toward the sun.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the bush, px.
 * @param y - Centre y of the bush, px.
 * @param radius - Approximate radius of the bush, px; the lobe sizes and offsets are fractions of it.
 */
function drawBush(g: Gfx, x: number, y: number, radius: number): void {
  // Ground shadow, shifted down.
  g.fillStyle(0x000000, 0.2).fillEllipse(x + radius * 0.15, y + radius * 0.8, radius * 2.3, radius * 0.8);
  // Each lobe is [x offset, y offset, size], all as fractions of the bush radius: left, right, top and lower-middle.
  const lobes = [
    [-0.55, 0.1, 0.7],
    [0.55, 0.1, 0.72],
    [0, -0.45, 0.8],
    [0, 0.3, 0.85],
  ] as const;
  // Three passes from dark to light. Each pass shrinks the lobes (`layer` is the size factor) and shifts them up and to
  // the left, so the lighter tones sit toward the sun.
  for (const [layer, color] of [[1, 0x2e7d32], [0.8, 0x43a047], [0.45, 0x81c784]] as const) {
    g.fillStyle(color);
    for (const [dx, dy, size] of lobes) {
      g.fillCircle(x + dx * radius - (1 - layer) * radius * 0.25, y + dy * radius - (1 - layer) * radius * 0.3, size * radius * layer);
    }
  }
}

/**
 * Paints the grassland background: mown stripes, grass tufts, flowers, and bushes and rocks in the side strips.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the decoration's positions and sizes; a fixed seed paints the same picture every time.
 */
function drawGrassland(g: Gfx, random: Random): void {
  // Mown stripes: alternating light and dark vertical bands, 80 px wide.
  for (let x = 0; x < W; x += 80) {
    g.fillStyle((x / 80) % 2 === 0 ? 0x74bf46 : 0x67b03b).fillRect(x, 0, 80, H);
  }
  // 700 grass tufts and 110 flowers spread over the whole screen.
  scatter(random, 700, FULL).forEach((p, i) => drawTuft(g, p.x, p.y, 0.8 + (i % 3) * 0.25, i % 2 === 0));
  scatter(random, 110, FULL).forEach((p, i) => drawFlower(g, p.x, p.y, FLOWER_COLORS[i % FLOWER_COLORS.length]));
  // Bigger props go in the side strips, clear of the maze: 4 bushes and 3 rocks in each.
  for (const strip of SIDE_STRIPS) {
    scatter(random, 4, strip).forEach((p) => drawBush(g, p.x, p.y, 20 + random() * 14));
    scatter(random, 3, strip).forEach((p) => drawRock(g, p.x, p.y, 8 + random() * 6, 0x9e9e9e));
  }
}

// ---------------------------------------------------------------- Desert

/**
 * Draws a saguaro cactus: a ground shadow, a trunk and two arms, each a rounded green bar with a dark outline.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the cactus's base (the middle of the trunk's foot), px.
 * @param y - Y of the cactus's base, px; the cactus grows upward from here.
 * @param scale - Size multiplier; 1 gives a cactus 52 px tall.
 */
function drawCactus(g: Gfx, x: number, y: number, scale: number): void {
  // Ground shadow, shifted to the right.
  g.fillStyle(0x000000, 0.18).fillEllipse(x + 8 * scale, y + 2 * scale, 38 * scale, 10 * scale);
  /**
   * Draws one rounded green bar of the cactus.
   *
   * @param px - Left edge relative to the cactus's base, in px at scale 1.
   * @param py - Top edge relative to the base, in px at scale 1 (negative is up).
   * @param w - Width, in px at scale 1.
   * @param h - Height, in px at scale 1.
   */
  const part = (px: number, py: number, w: number, h: number): void => {
    // Fully rounded ends: the corner radius is half the bar's thinner side.
    const radius = (Math.min(w, h) / 2) * scale;
    g.fillStyle(0x4f9a4a).fillRoundedRect(x + px * scale, y + py * scale, w * scale, h * scale, radius);
    g.lineStyle(2, 0x2e6b2c).strokeRoundedRect(x + px * scale, y + py * scale, w * scale, h * scale, radius);
  };
  part(-6, -52, 12, 52); // trunk
  part(-22, -34, 16, 8); // left arm: elbow, then the upright
  part(-22, -46, 8, 20);
  part(6, -26, 16, 8); // right arm
  part(14, -38, 8, 20);
  // A faint ridge line down the trunk.
  g.lineStyle(1, 0x2e6b2c, 0.6).lineBetween(x, y - 48 * scale, x, y - 4 * scale);
}

/**
 * Paints the desert background: a sand gradient, soft dunes, wind ripples, pebbles, and cacti and rocks in the side strips.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the decoration's positions and sizes; a fixed seed paints the same picture every time.
 */
function drawDesert(g: Gfx, random: Random): void {
  // Base: pale sand at the top, deeper sand at the bottom.
  verticalGradient(g, 0xf4d58f, 0xe0ae60);

  // Broad dunes, alternately lit and shaded, each with a bright crest along its top edge.
  for (let i = 0; i < 12; i++) {
    // Each dune is a translucent ellipse of random size (380-740 px wide, 80-170 px tall) at a random spot.
    const width = 380 + random() * 360;
    const height = 80 + random() * 90;
    const x = random() * W;
    const y = random() * H;
    const lit = i % 2 === 0; // lit dunes are pale; the others are darker
    g.fillStyle(lit ? 0xf9e1a3 : 0xd9a455, 0.35).fillEllipse(x, y, width, height);
    // The crest: 17 points along the top half of the ellipse's outline (angles pi to 2 pi; y grows downward).
    const crest = Array.from({ length: 17 }, (_, k) => {
      const angle = Math.PI + (k / 16) * Math.PI;
      return { x: x + (Math.cos(angle) * width) / 2, y: y + (Math.sin(angle) * height) / 2 };
    });
    g.lineStyle(3, 0xfff3cc, lit ? 0.5 : 0.25).strokePoints(crest);
  }

  // Wind ripples in the sand.
  scatter(random, 170, FULL).forEach((p) => {
    // A short wavy line: 6 points 9 px apart, wobbling up and down by up to 2.5 px.
    const ripple = Array.from({ length: 6 }, (_, k) => ({ x: p.x + k * 9, y: p.y + Math.sin(k * 1.3) * 2.5 }));
    g.lineStyle(2, 0xa8742f, 0.22).strokePoints(ripple);
  });
  // 60 small pebbles over the whole screen.
  scatter(random, 60, FULL).forEach((p) => drawRock(g, p.x, p.y, 3 + random() * 3, 0xb98a5a));

  // Cacti and bigger rocks in the side strips, 3 of each. A cactus grows upward from its base, which sits 40 px below the scattered point.
  for (const strip of SIDE_STRIPS) {
    scatter(random, 3, strip).forEach((p) => drawCactus(g, p.x, p.y + 40, 0.8 + random() * 0.5));
    scatter(random, 3, strip).forEach((p) => drawRock(g, p.x, p.y, 10 + random() * 8, 0xa9794a));
  }
}

// ---------------------------------------------------------------- Dungeon

/**
 * Draws a skull seen from the front: a ground shadow, cranium and jaw, eye sockets, a nose hole and tooth lines.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the cranium, px.
 * @param y - Centre y of the cranium, px.
 * @param scale - Size multiplier; 1 gives a cranium 18 px across.
 */
function drawSkull(g: Gfx, x: number, y: number, scale: number): void {
  // Ground shadow.
  g.fillStyle(0x000000, 0.3).fillEllipse(x + 2 * scale, y + 11 * scale, 24 * scale, 7 * scale);
  // Cranium, then the jaw below it in the same bone colour.
  g.fillStyle(0xe9e4d2).fillCircle(x, y, 9 * scale);
  g.fillRoundedRect(x - 5 * scale, y + 4 * scale, 10 * scale, 8 * scale, 2 * scale);
  // Dark eye sockets, then a triangular nose hole between them.
  g.fillStyle(0x15151c).fillCircle(x - 3.6 * scale, y - 0.5 * scale, 2.5 * scale).fillCircle(x + 3.6 * scale, y - 0.5 * scale, 2.5 * scale);
  g.fillTriangle(x, y + 2 * scale, x - 1.3 * scale, y + 5 * scale, x + 1.3 * scale, y + 5 * scale);
  // Three short vertical lines down the jaw mark the teeth.
  g.lineStyle(Math.max(1, scale), 0x9a9482);
  for (const tooth of [-2.5, 0, 2.5]) g.lineBetween(x + tooth * scale, y + 8 * scale, x + tooth * scale, y + 12 * scale);
}

/**
 * Draws a bone: a thick line with two round knobs at each end.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the bone, px.
 * @param y - Centre y of the bone, px.
 * @param angle - Direction of the bone in radians, measured clockwise on screen from the x axis (y grows downward).
 * @param length - Length of the shaft from tip to tip, px; the knobs add a little more.
 */
function drawBone(g: Gfx, x: number, y: number, angle: number, length: number): void {
  // Half the bone's length as an x/y step: the offset from the centre to one tip.
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  // The shaft.
  g.lineStyle(4, 0xe9e4d2).lineBetween(x - dx, y - dy, x + dx, y + dy);
  // Knobbly ends: two bumps either side of each tip.
  // (nx, ny) is a 2.5 px step at right angles to the bone, which separates the two bumps of an end.
  const nx = Math.cos(angle + Math.PI / 2) * 2.5;
  const ny = Math.sin(angle + Math.PI / 2) * 2.5;
  g.fillStyle(0xe9e4d2);
  // `end` picks the tip: -1 for one end of the bone, +1 for the other.
  for (const end of [-1, 1]) {
    g.fillCircle(x + end * dx + nx, y + end * dy + ny, 3).fillCircle(x + end * dx - nx, y + end * dy - ny, 3);
  }
}

/**
 * Draws a wall torch with a warm pool of light around it.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the torch, px.
 * @param y - Y of the top of the handle, px: the flame rises above it and the handle hangs below it.
 */
function drawTorch(g: Gfx, x: number, y: number): void {
  // A warm pool of light made from stacked translucent discs (7 of them, 22 px apart in radius, so the centre is brightest).
  for (let ring = 7; ring >= 1; ring--) g.fillStyle(0xff9800, 0.035).fillCircle(x, y, ring * 22);
  // Wooden handle, a darker bracket across its top, then the flame: orange outside, yellow inside.
  g.fillStyle(0x5d4037).fillRoundedRect(x - 4, y + 2, 8, 22, 2);
  g.fillStyle(0x3e2723).fillRect(x - 7, y + 2, 14, 4);
  g.fillStyle(0xff6d00).fillEllipse(x, y - 6, 14, 22);
  g.fillStyle(0xffd54f).fillEllipse(x, y - 3, 7, 12);
}

/**
 * A cobweb fanning out of a screen corner; `sx` and `sy` are +1 or -1 and point into the screen.
 *
 * @param g - Graphics object to draw on.
 * @param cx - X of the corner the web hangs from, px.
 * @param cy - Y of the corner the web hangs from, px.
 * @param sx - Horizontal direction into the screen: +1 from a left corner, -1 from a right corner.
 * @param sy - Vertical direction into the screen: +1 from a top corner, -1 from a bottom corner.
 */
function drawCobweb(g: Gfx, cx: number, cy: number, sx: number, sy: number): void {
  const spokes = 5; // lines radiating from the corner, spread over the quarter circle between the two screen edges
  /**
   * Position of a point on the web.
   *
   * @param spoke - Spoke number, 0 to `spokes - 1`; spoke 0 runs along one screen edge and the last spoke along the other.
   * @param radius - Distance from the corner, px.
   * @returns The point's position on screen, in px.
   */
  const point = (spoke: number, radius: number): { x: number; y: number } => {
    const angle = (spoke / (spokes - 1)) * (Math.PI / 2);
    return { x: cx + sx * Math.cos(angle) * radius, y: cy + sy * Math.sin(angle) * radius };
  };
  g.lineStyle(1.5, 0xffffff, 0.22);
  // The spokes: 110 px lines from the corner.
  for (let spoke = 0; spoke < spokes; spoke++) {
    const tip = point(spoke, 110);
    g.lineBetween(cx, cy, tip.x, tip.y);
  }
  // Strands joining neighbouring spokes at 35, 65 and 95 px from the corner.
  for (const radius of [35, 65, 95]) {
    // Each strand between two spokes sags a little toward the corner.
    for (let spoke = 0; spoke < spokes - 1; spoke++) {
      const a = point(spoke, radius);
      const b = point(spoke + 1, radius);
      g.strokePoints([a, { x: (a.x + b.x) / 2 - sx * 5, y: (a.y + b.y) / 2 - sy * 5 }, b]);
    }
  }
}

/**
 * Paints the dungeon background: flagstones, cracks, moss, green glows, skulls and bones, torches, cobwebs and a dark vignette.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the decoration's positions, sizes and tones; a fixed seed paints the same picture every time.
 */
function drawDungeon(g: Gfx, random: Random): void {
  // Near-black base that shows through the joints between the stones.
  g.fillStyle(0x12121a).fillRect(0, 0, W, H);

  // Flagstones, each a slightly different tone and bevelled so it catches the torchlight.
  // They sit on a 64 px grid; each stone is 60 px square, which leaves a 4 px joint, and its tone varies from 0.8 to 1.15 of the base.
  for (let ty = 0; ty < H; ty += 64) {
    for (let tx = 0; tx < W; tx += 64) {
      g.fillStyle(shade(0x3a3a48, 0.8 + random() * 0.35)).fillRect(tx + 2, ty + 2, 60, 60);
      // The bevel: a light strip along the stone's top edge and a dark one along its bottom edge.
      g.fillStyle(0xffffff, 0.05).fillRect(tx + 2, ty + 2, 60, 4);
      g.fillStyle(0x000000, 0.18).fillRect(tx + 2, ty + 58, 60, 4);
    }
  }

  // Cracks wander out from random points.
  // Each of the 45 cracks is a four-step random walk that drifts a little downward.
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
  // Each of 30 patches is four overlapping translucent blobs in two greens.
  for (const p of scatter(random, 30, FULL)) {
    for (let blob = 0; blob < 4; blob++) {
      g.fillStyle(blob % 2 === 0 ? 0x2f5d3a : 0x4f8f5a, 0.4).fillCircle(p.x + (random() - 0.5) * 30, p.y + (random() - 0.5) * 20, 6 + random() * 8);
    }
  }
  // Four glows, each a stack of translucent discs like the torch light.
  for (const p of scatter(random, 4, FULL)) {
    for (let ring = 6; ring >= 1; ring--) g.fillStyle(0x69f0ae, 0.025).fillCircle(p.x, p.y, ring * 30);
  }

  // Skulls and bones in the side strips.
  for (const strip of SIDE_STRIPS) {
    scatter(random, 3, strip).forEach((p) => drawSkull(g, p.x, p.y, 0.9 + random() * 0.5));
    scatter(random, 5, strip).forEach((p) => drawBone(g, p.x, p.y, random() * Math.PI, 24 + random() * 14));
  }
  // Six torches: two columns of three, each column 70 px in from a side of the screen.
  for (const x of [70, W - 70]) {
    for (const y of [150, 390, 630]) drawTorch(g, x, y);
  }
  // A cobweb in each corner; the top ones hang below the HUD bar.
  drawCobweb(g, 0, HUD_HEIGHT, 1, 1);
  drawCobweb(g, W, HUD_HEIGHT, -1, 1);
  drawCobweb(g, 0, H, 1, -1);
  drawCobweb(g, W, H, -1, -1);

  // Dark vignette: nested frames that fade from black at the edges to nothing toward the middle.
  // 16 frames, each a 14 px stroke one stroke-width further in; the opacity falls with the square of the distance from the edge.
  for (let i = 0; i < 16; i++) {
    g.lineStyle(14, 0x000000, 0.5 * (1 - i / 16) ** 2);
    g.strokeRect(i * 14 + 7, i * 14 + 7, W - i * 28 - 14, H - i * 28 - 14);
  }
}

// ---------------------------------------------------------------- Spaceship

/**
 * Draws a round porthole onto space: a metal rim, a starfield, a small ringed planet, a glint on the glass and bolts.
 *
 * @param g - Graphics object to draw on.
 * @param x - Centre x of the window, px.
 * @param y - Centre y of the window, px.
 * @param radius - Radius of the glass, px; the rim reaches 9 px beyond it.
 * @param random - Random source for the stars' positions, sizes and brightness.
 */
function drawPorthole(g: Gfx, x: number, y: number, radius: number, random: Random): void {
  // The metal rim in two tones, then the dark glass.
  g.fillStyle(0x3b4d5c).fillCircle(x, y, radius + 9);
  g.fillStyle(0x1b2733).fillCircle(x, y, radius + 4);
  g.fillStyle(0x050a14).fillCircle(x, y, radius);
  // Stars, kept inside the glass.
  for (let star = 0; star < 16; star++) {
    const angle = random() * Math.PI * 2;
    // The square root spreads the stars evenly over the disc instead of bunching them at the centre.
    const distance = Math.sqrt(random()) * (radius - 4);
    g.fillStyle(0xffffff, 0.4 + random() * 0.6).fillCircle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.8 + random() * 0.8);
  }
  // A small ringed planet, a glint on the glass, and bolts round the rim.
  g.fillStyle(0x5c6bc0).fillCircle(x + radius * 0.3, y + radius * 0.25, radius * 0.32); // the planet
  g.lineStyle(2, 0xb39ddb, 0.8).strokeEllipse(x + radius * 0.3, y + radius * 0.25, radius * 0.95, radius * 0.25); // its flat ring
  // The glint: a short pale arc in the upper left of the glass.
  g.lineStyle(3, 0xffffff, 0.18).beginPath().arc(x, y, radius - 5, Math.PI * 1.1, Math.PI * 1.45).strokePath();
  g.fillStyle(0x8aa4b8);
  // Eight bolts spaced evenly round the rim, 6.5 px beyond the edge of the glass.
  for (let bolt = 0; bolt < 8; bolt++) {
    const angle = (bolt / 8) * Math.PI * 2;
    g.fillCircle(x + Math.cos(angle) * (radius + 6.5), y + Math.sin(angle) * (radius + 6.5), 1.8);
  }
}

/**
 * Draws a ventilation grille: a dark rounded plate (80 x 34 px) with an outline and six vertical slots.
 *
 * @param g - Graphics object to draw on.
 * @param x - Left edge of the plate, px.
 * @param y - Top edge of the plate, px.
 */
function drawVent(g: Gfx, x: number, y: number): void {
  g.fillStyle(0x0a1119).fillRoundedRect(x, y, 80, 34, 6);
  g.lineStyle(2, 0x6f8ba0, 0.6).strokeRoundedRect(x, y, 80, 34, 6);
  for (let slot = 0; slot < 6; slot++) g.lineBetween(x + 10 + slot * 12, y + 6, x + 10 + slot * 12, y + 28);
}

/**
 * A glowing conduit: wide faint strokes under a thin bright one.
 *
 * @param g - Graphics object to draw on.
 * @param x1 - Start x, px.
 * @param y1 - Start y, px.
 * @param x2 - End x, px.
 * @param y2 - End y, px.
 */
function drawConduit(g: Gfx, x1: number, y1: number, x2: number, y2: number): void {
  // Each pair is [stroke width in px, opacity]; the widest and faintest goes first so the bright core ends up on top.
  for (const [width, alpha] of [[14, 0.06], [8, 0.12], [3, 0.85]] as const) {
    g.lineStyle(width, 0x00e5ff, alpha).lineBetween(x1, y1, x2, y2);
  }
}

/**
 * Paints the spaceship background: hull plates, glowing conduits, hazard stripes, portholes, vents and status lights.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the plates' tones, the portholes' stars and the lights' positions; a fixed seed paints the same picture every time.
 */
function drawSpaceship(g: Gfx, random: Random): void {
  // Dark base that shows through the seams between the plates.
  g.fillStyle(0x121b27).fillRect(0, 0, W, H);

  // Hull plates with bevelled edges and rivets in the corners.
  // They sit on an 80 px grid; each plate is 76 px square, which leaves a 4 px seam, and its tone varies from 0.85 to 1.15 of the base.
  for (let ty = 0; ty < H; ty += 80) {
    for (let tx = 0; tx < W; tx += 80) {
      g.fillStyle(shade(0x22334a, 0.85 + random() * 0.3)).fillRect(tx + 2, ty + 2, 76, 76);
      // The bevel: light strips along the plate's top and left edges, dark strips along its bottom and right edges.
      g.fillStyle(0xffffff, 0.07).fillRect(tx + 2, ty + 2, 76, 3).fillRect(tx + 2, ty + 2, 3, 76);
      g.fillStyle(0x000000, 0.25).fillRect(tx + 2, ty + 75, 76, 3).fillRect(tx + 75, ty + 2, 3, 76);
      // Four rivets, one near each corner of the plate.
      g.fillStyle(0x6f8ba0, 0.8);
      for (const [rx, ry] of [[10, 10], [70, 10], [10, 70], [70, 70]] as const) g.fillCircle(tx + rx, ty + ry, 2.2);
    }
  }

  // Glowing conduits: three horizontal runs across the screen, and one vertical run down each side below the HUD bar.
  for (const y of [150, 390, 630]) drawConduit(g, 0, y, W, y);
  for (const x of [48, W - 48]) drawConduit(g, x, HUD_HEIGHT, x, H);

  // Hazard stripes down both edges.
  // Each edge gets a 22 px black strip with yellow diagonal bands: a parallelogram every 44 px.
  for (const x of [0, W - 22]) {
    g.fillStyle(0x111111).fillRect(x, 0, 22, H);
    g.fillStyle(0xffc107);
    for (let y = -22; y < H; y += 44) {
      g.fillPoints([{ x, y: y + 22 }, { x: x + 22, y }, { x: x + 22, y: y + 22 }, { x, y: y + 44 }], true);
    }
  }

  // Three portholes (two with a 46 px radius, one with 34 px) and a vent on each side, all in the strips beside the maze.
  drawPorthole(g, 140, 270, 46, random);
  drawPorthole(g, W - 140, 480, 46, random);
  drawPorthole(g, W - 150, 150, 34, random);
  drawVent(g, 100, 540);
  drawVent(g, W - 180, 330);

  // Status lights blinking in four colours.
  // Each light is a faint halo with a bright core; 14 are scattered in each side strip, cycling through the colours.
  const lights = [0xff5252, 0x69f0ae, 0x40c4ff, 0xffd740];
  for (const strip of SIDE_STRIPS) {
    // Halo and core for each light, taking the next colour in the cycle.
    scatter(random, 14, strip).forEach((p, i) => {
      const color = lights[i % lights.length];
      g.fillStyle(color, 0.25).fillCircle(p.x, p.y, 7);
      g.fillStyle(color).fillCircle(p.x, p.y, 2.6);
    });
  }
}

// ---------------------------------------------------------------- Mountain

/**
 * Draws a mountain: a rocky body lit on its left, a shaded right face and a jagged snow cap.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the summit, px.
 * @param baseY - Y of the foot of the mountain, px; the peak rises above it.
 * @param width - Width of the foot, px.
 * @param height - Height from the foot to the summit, px.
 * @param rock - Colour of the lit face as 0xRRGGBB; the shaded face is a darker tone of it.
 */
function drawPeak(g: Gfx, x: number, baseY: number, width: number, height: number, rock: number): void {
  const top = baseY - height; // y of the summit, px
  const half = width / 2;
  // The lit face is the whole triangle; the shaded right face goes on top of it.
  g.fillStyle(rock).fillTriangle(x - half, baseY, x, top, x + half, baseY);
  g.fillStyle(shade(rock, 0.74)).fillPoints(
    [{ x, y: top }, { x: x + half, y: baseY }, { x: x + width * 0.1, y: baseY }, { x: x + width * 0.03, y: top + height * 0.5 }],
    true,
  );
  // Snow cap with a zigzag lower edge about a third of the way down. At depth d below the summit the mountain is
  // d * half / height either side of the centre, which gives the width of the cap at its edge.
  const edge = height * 0.32; // depth of the snow line below the summit, px
  const reach = (edge * half) / height; // half the mountain's width at the snow line, px
  const snow = [
    { x, y: top },
    { x: x + reach, y: top + edge },
    { x: x + width * 0.09, y: top + edge + height * 0.07 },
    { x: x + width * 0.03, y: top + edge - height * 0.02 },
    { x: x - width * 0.04, y: top + edge + height * 0.09 },
    { x: x - width * 0.1, y: top + edge + height * 0.01 },
    { x: x - reach, y: top + edge },
  ];
  g.fillStyle(0xffffff).fillPoints(snow, true);
  // The right half of the cap is in shade: a pale blue wash over it.
  g.fillStyle(0xb9d3ea, 0.6).fillPoints(snow.slice(0, 4), true);
}

/**
 * Draws a rolling hill: a wide dome that runs down off the bottom of the screen, with a lighter crest line.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the middle of the hill, px.
 * @param baseY - Y of the hill's left and right feet, px.
 * @param width - Width of the hill at its feet, px.
 * @param height - Rise of the crest above the feet, px.
 * @param color - Grass colour as 0xRRGGBB.
 */
function drawHill(g: Gfx, x: number, baseY: number, width: number, height: number, color: number): void {
  // The crest: 25 points along the top half of an ellipse (angles pi to 2 pi; y grows downward).
  const crest = Array.from({ length: 25 }, (_, k) => {
    const angle = Math.PI + (k / 24) * Math.PI;
    return { x: x + (Math.cos(angle) * width) / 2, y: baseY + Math.sin(angle) * height };
  });
  // Filled down past the bottom of the screen, so a nearer hill simply paints over it.
  g.fillStyle(color).fillPoints([...crest, { x: x + width / 2, y: H }, { x: x - width / 2, y: H }], true);
  g.lineStyle(3, shade(color, 1.25), 0.55).strokePoints(crest);
}

/**
 * Draws a pine tree: a ground shadow, a short trunk and three stacked boughs, lighter on the left, with snow on their tips.
 *
 * @param g - Graphics object to draw on.
 * @param x - X of the trunk, px.
 * @param baseY - Y of the foot of the trunk, px; the tree grows upward from here.
 * @param scale - Size multiplier; 1 gives a tree 47 px tall.
 */
function drawPine(g: Gfx, x: number, baseY: number, scale: number): void {
  g.fillStyle(0x000000, 0.2).fillEllipse(x + 6 * scale, baseY, 26 * scale, 7 * scale);
  g.fillStyle(0x5d4037).fillRect(x - 2.5 * scale, baseY - 10 * scale, 5 * scale, 10 * scale);
  // Each bough is [height of its lower edge above the foot, half its width, its height], all in px at scale 1; the lowest comes first.
  for (const [lift, half, height] of [[8, 13, 20], [20, 10.5, 18], [31, 7.5, 16]] as const) {
    const bottom = baseY - lift * scale;
    const apex = bottom - height * scale;
    g.fillStyle(0x1b5e20).fillTriangle(x - half * scale, bottom, x, apex, x + half * scale, bottom);
    // The lit left half is a lighter green.
    g.fillStyle(0x2e7d32).fillTriangle(x - half * scale, bottom, x, apex, x, bottom);
    // A dab of snow on the tip, as wide as the bough is at 28% of its height.
    g.fillStyle(0xffffff, 0.85).fillTriangle(x - half * 0.28 * scale, apex + height * 0.28 * scale, x, apex, x + half * 0.28 * scale, apex + height * 0.28 * scale);
  }
}

/**
 * Paints the mountain background: a sky with a sun and clouds, two ranges of snow-capped peaks, rolling hills,
 * a meadow with grass tufts and flowers, and pines and boulders on the slopes.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the peaks, clouds and scenery; a fixed seed paints the same picture every time.
 */
function drawMountain(g: Gfx, random: Random): void {
  // Sky: deep blue overhead, fading to a pale haze toward the horizon.
  verticalGradient(g, 0x3f8fdc, 0xf4fbff);
  // The sun: eight stacked translucent discs round a bright core.
  for (let ring = 8; ring >= 1; ring--) g.fillStyle(0xfff59d, 0.05).fillCircle(1050, 150, ring * 26);
  g.fillStyle(0xfffde7).fillCircle(1050, 150, 30);
  // Seven clouds, each three overlapping soft ovals of random size.
  for (const p of scatter(random, 7, { x: 0, y: HUD_HEIGHT + 20, width: W, height: 260 })) {
    const size = 0.7 + random() * 0.8;
    g.fillStyle(0xffffff, 0.85)
      .fillEllipse(p.x, p.y, 120 * size, 34 * size)
      .fillEllipse(p.x - 34 * size, p.y + 8 * size, 80 * size, 26 * size)
      .fillEllipse(p.x + 38 * size, p.y + 8 * size, 90 * size, 28 * size);
  }
  // Far range: eight pale blue-grey peaks. Each is placed in its own eighth of the width, with some random shift.
  for (let i = 0; i < 8; i++) drawPeak(g, ((i + 0.2 + random() * 0.6) * W) / 8, 470, 260 + random() * 120, 150 + random() * 90, 0x9db3c8);
  // Near range: five bigger, darker peaks in front of them.
  for (let i = 0; i < 5; i++) drawPeak(g, ((i + 0.3 + random() * 0.4) * W) / 5, 530, 340 + random() * 160, 220 + random() * 100, 0x6f8499);

  // Rolling hills in three layers, the nearest last: [baseY of the feet, how many hills, tallest rise, grass colour].
  for (const [baseY, count, rise, color] of [[590, 4, 100, 0x8cc872], [640, 3, 80, 0x6ab556], [690, 3, 55, 0x4f9d44]] as const) {
    for (let i = 0; i < count; i++) {
      drawHill(g, ((i + 0.5) * W) / count + (random() - 0.5) * 80, baseY, 520 + random() * 200, rise * (0.6 + random() * 0.4), color);
    }
  }
  // The meadow in front: grass tufts and alpine flowers over the lower part of the screen.
  const meadow: Rect = { x: 0, y: 580, width: W, height: H - 580 };
  scatter(random, 260, meadow).forEach((p, i) => drawTuft(g, p.x, p.y, 0.8 + (i % 3) * 0.25, i % 2 === 0));
  scatter(random, 70, meadow).forEach((p, i) => drawFlower(g, p.x, p.y, FLOWER_COLORS[i % FLOWER_COLORS.length]));

  // Pines on the slopes beside the maze and a row of small distant ones along the hills, painted from the back to the front.
  const slopes = SIDE_STRIPS.map((strip): Rect => ({ ...strip, y: 450, height: H - 470 }));
  const pines = [
    ...slopes.flatMap((slope) => scatter(random, 6, slope).map((p) => ({ ...p, scale: 1 + random() * 0.6 }))),
    ...scatter(random, 14, { x: 0, y: 545, width: W, height: 50 }).map((p) => ({ ...p, scale: 0.5 + random() * 0.3 })),
  ].sort((a, b) => a.y - b.y);
  for (const pine of pines) drawPine(g, pine.x, pine.y, pine.scale);
  // Three boulders on each slope.
  for (const slope of slopes) scatter(random, 3, slope).forEach((p) => drawRock(g, p.x, p.y, 8 + random() * 8, 0x8d99a3));
}

// ---------------------------------------------------------------- Menu

/**
 * Paints the menu backdrop: a dark blue gradient, a teal glow, a faint maze, stars and a track along the bottom.
 *
 * @param g - Graphics object to draw on (the full-screen texture).
 * @param random - Random source for the maze and the stars; a fixed seed paints the same picture every time.
 */
function drawMenuBackdrop(g: Gfx, random: Random): void {
  // Dark navy at the top fading to a teal-blue at the bottom.
  verticalGradient(g, 0x0b1d2a, 0x15506b, 60);
  // A soft teal glow behind the title: eight stacked translucent discs centred at (W / 2, 210).
  for (let ring = 8; ring >= 1; ring--) g.fillStyle(COLOR.teal, 0.02).fillCircle(W / 2, 210, ring * 55);

  // A faint maze, drawn from the same generator the game uses, fills the whole screen.
  const cell = 40; // cell size of the backdrop maze, px; it is W / 40 by H / 40 = 32 by 18 cells
  const maze = generateMaze(W / cell, H / cell, random);
  for (const run of maze.wallRuns()) {
    // Convert the run from grid units to px: where it starts and ends along its line, and where the line lies.
    const from = run.from * cell;
    const to = run.to * cell;
    const at = run.line * cell;
    const [x1, y1, x2, y2] = run.horizontal ? [from, at, to, at] : [at, from, at, to];
    // A wide faint stroke under a thin brighter one gives the walls a glow.
    g.lineStyle(7, COLOR.teal, 0.07).lineBetween(x1, y1, x2, y2);
    g.lineStyle(2, COLOR.teal, 0.2).lineBetween(x1, y1, x2, y2);
  }

  // 70 faint stars of random size and brightness.
  for (const p of scatter(random, 70, FULL)) {
    g.fillStyle(0xffffff, 0.15 + random() * 0.4).fillCircle(p.x, p.y, 0.8 + random() * 1.4);
  }

  // A track along the bottom for the menu runner to jog on: a dark band 76 px tall, a teal line along its top and white lane dashes.
  g.fillStyle(0x000000, 0.3).fillRect(0, H - 76, W, 76);
  g.lineStyle(3, COLOR.teal, 0.55).lineBetween(0, H - 76, W, H - 76);
  for (let x = 20; x < W; x += 80) g.lineStyle(3, 0xffffff, 0.18).lineBetween(x, H - 36, x + 40, H - 36);
}

/** The routine that paints each theme's background. */
const THEME_DRAWERS: Record<ThemeId, (g: Gfx, random: Random) => void> = {
  grassland: drawGrassland,
  desert: drawDesert,
  dungeon: drawDungeon,
  spaceship: drawSpaceship,
  mountain: drawMountain,
};

/**
 * Bakes the menu backdrop and one background per theme. Fixed seeds keep them identical on every load.
 *
 * @param scene - Scene used to create the textures (the boot scene).
 */
export function generateBackgrounds(scene: Phaser.Scene): void {
  // The menu backdrop always uses seed 11.
  bake(scene, TextureKey.MenuBackground, W, H, (g) => drawMenuBackdrop(g, createRng(11)));
  // Each theme has its own seed: 100 plus its position in `THEME_IDS`.
  THEME_IDS.forEach((id, index) => {
    bake(scene, themeTextureKey(id), W, H, (g) => THEME_DRAWERS[id](g, createRng(100 + index)));
  });
}
