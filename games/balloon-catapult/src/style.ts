/**
 * Shared look of the game: font, colour palette and the Phaser text styles built from them.
 */
import type Phaser from 'phaser';

/** Bundled display font with fallbacks, as a CSS font-family list. */
export const FONT = '"Lilita One", "Trebuchet MS", "Segoe UI", sans-serif';

/** Colour palette as 0xRRGGBB numbers (use `hex` for the CSS string form). */
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

/**
 * Converts a numeric colour to a CSS hex string.
 *
 * @param color - Colour as 0xRRGGBB.
 * @returns The CSS colour, for example "#ffd54f".
 */
export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/**
 * Scales each RGB channel; below 1 darkens, above 1 lightens.
 *
 * @param color - Colour as 0xRRGGBB.
 * @param factor - Brightness multiplier; 1 leaves the colour unchanged.
 * @returns The adjusted colour as 0xRRGGBB, each channel limited to 0..255.
 */
export function shade(color: number, factor: number): number {
  /**
   * Scales one colour channel.
   *
   * @param shift - Bit offset of the channel: 16 for red, 8 for green, 0 for blue.
   * @returns The scaled channel, limited to 0..255.
   */
  const channel = (shift: number): number => Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Chunky outlined label used for all game text.
 *
 * @param size - Font size in px.
 * @param color - Fill colour as a CSS string; defaults to cream.
 * @returns A Phaser text style whose outline and shadow scale with `size`.
 */
export function labelStyle(size: number, color: string = hex(COLOR.cream)): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    // Outline and shadow grow with the font so small and large text keep the same look.
    stroke: hex(COLOR.ink),
    strokeThickness: Math.max(2, Math.round(size / 8)),
    shadow: { offsetX: 0, offsetY: Math.max(1, Math.round(size / 16)), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
  };
}

/**
 * Plain text style without an outline, for text drawn on light panels.
 *
 * @param size - Font size in px.
 * @param color - Fill colour as a CSS string.
 * @returns A minimal Phaser text style.
 */
export const plainStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
});
