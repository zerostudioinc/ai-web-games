/**
 * Fonts, colours and text styles shared by every screen.
 */
import type Phaser from 'phaser';

/** CSS font stack for all text: the bundled Lilita One display font first, then system fallbacks. */
export const FONT = '"Lilita One", "Trebuchet MS", "Segoe UI", sans-serif';

/** Shared palette, as 0xRRGGBB numbers. */
export const COLOR = {
  ink: 0x1f3b4d, // dark blue-grey for text outlines, shadows and art outlines
  cream: 0xfff3cf, // default text colour and the fill of light panels
  night: 0x0b1d2a, // near-black navy behind the HUD bar and banners
  sky: 0x4fc3f7, // bright blue accent (HUD captions, the HUD bar's bottom stripe)
  teal: 0x2dd4bf, // glow and line colour of the menu backdrop
  red: 0xff5252, // life hearts and the trap highlight
} as const;

/**
 * Converts a numeric colour to the CSS string Phaser text styles expect.
 *
 * @param color - Colour as 0xRRGGBB.
 * @returns The colour as `#rrggbb`.
 */
export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/**
 * Scales each RGB channel; below 1 darkens, above 1 lightens.
 *
 * @param color - Colour as 0xRRGGBB.
 * @param factor - Multiplier applied to the red, green and blue channels (1 leaves the colour unchanged).
 * @returns The scaled colour as 0xRRGGBB, each channel rounded and clamped to 0-255.
 */
export function shade(color: number, factor: number): number {
  /**
   * Scales one 8-bit channel of `color`.
   *
   * @param shift - Bit offset of the channel: 16 for red, 8 for green, 0 for blue.
   * @returns The scaled channel value, clamped to 0-255.
   */
  const channel = (shift: number): number => Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  // Pack the three channels back into one 0xRRGGBB number.
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Blends `from` into `to`; 0 gives `from`, 1 gives `to`.
 *
 * @param from - Start colour as 0xRRGGBB.
 * @param to - End colour as 0xRRGGBB.
 * @param t - Blend amount, expected between 0 and 1; it is not clamped.
 * @returns The blended colour as 0xRRGGBB.
 */
export function mix(from: number, to: number, t: number): number {
  /**
   * Interpolates one 8-bit channel between `from` and `to`.
   *
   * @param shift - Bit offset of the channel: 16 for red, 8 for green, 0 for blue.
   * @returns The blended channel value, rounded.
   */
  const channel = (shift: number): number => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
  // Pack the three channels back into one 0xRRGGBB number.
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Chunky outlined label used for all game text: a dark outline plus a hard drop shadow so it reads on any background.
 *
 * @param size - Font size in px.
 * @param color - CSS colour of the text fill; defaults to cream.
 * @returns A Phaser text style whose outline and shadow scale with `size`.
 */
export function labelStyle(size: number, color: string = hex(COLOR.cream)): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    // Outline and a hard (unblurred) downward shadow, both sized relative to the font.
    stroke: hex(COLOR.ink),
    strokeThickness: Math.max(2, Math.round(size / 8)),
    shadow: { offsetX: 0, offsetY: Math.max(1, Math.round(size / 16)), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
  };
}

/**
 * Plain text with no outline, for use on light panels.
 *
 * @param size - Font size in px.
 * @param color - CSS colour of the text, e.g. from `hex()`.
 * @returns A Phaser text style.
 */
export const plainStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
});
