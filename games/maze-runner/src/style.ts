// Fonts, colours and text styles shared by every screen.
import type Phaser from 'phaser';

export const FONT = '"Lilita One", "Trebuchet MS", "Segoe UI", sans-serif';

export const COLOR = {
  ink: 0x1f3b4d,
  cream: 0xfff3cf,
  night: 0x0b1d2a,
  sky: 0x4fc3f7,
  teal: 0x2dd4bf,
  red: 0xff5252,
} as const;

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Scales each RGB channel; below 1 darkens, above 1 lightens. */
export function shade(color: number, factor: number): number {
  const channel = (shift: number): number => Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Blends `from` into `to`; 0 gives `from`, 1 gives `to`. */
export function mix(from: number, to: number, t: number): number {
  const channel = (shift: number): number => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
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

/** Plain text with no outline, for use on light panels. */
export const plainStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
});
