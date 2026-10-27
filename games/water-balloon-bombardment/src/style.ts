import type Phaser from 'phaser';

export const FONT = '"Lilita One", "Trebuchet MS", "Segoe UI", sans-serif';

export const COLOR = {
  grassLight: 0x7cc54a,
  grassDark: 0x6bb340,
  path: 0xd2b27a,
  pathEdge: 0xaf8a55,
  pebble: 0xb8996a,
  wood: 0x8a5a2b,
  woodDark: 0x4a2e16,
  woodLight: 0xb07a42,
  ink: 0x1f3b4d,
  cream: 0xfff3cf,
  gold: 0xffd54f,
  skyTop: 0x3f9ee8,
  skyBottom: 0xcdeeff,
} as const;

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Scales each RGB channel; below 1 darkens, above 1 lightens. */
export function shade(color: number, factor: number): number {
  const channel = (shift: number): number => Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Chunky outlined label used for all game text. */
export function labelStyle(size: number, color: string = hex(COLOR.cream)): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: hex(COLOR.ink),
    strokeThickness: Math.max(2, Math.round(size / 8)),
    shadow: { offsetX: 0, offsetY: Math.max(1, Math.round(size / 16)), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
  };
}

export const plainStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
});
