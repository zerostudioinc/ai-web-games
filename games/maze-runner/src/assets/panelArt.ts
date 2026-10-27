// Rounded panels for menu cards, drawn once to a texture.
// Large rounded shapes filled by Graphics can show hairline seams in WebGL; a baked texture does not.
import type Phaser from 'phaser';
import { COLOR } from '../style';
import { bake } from './bake';

const MARGIN = 8; // transparent border so the outline is never clipped
const SHADOW = 8; // how far the drop shadow sits below the panel

export interface PanelStyle {
  width: number;
  height: number;
  radius: number;
  fill: number;
  /** A coloured strip across the top, with a divider line under it. */
  heading?: { height: number; color: number };
}

/**
 * Creates an image of the panel with its centre at (x, y). The texture is cached by style,
 * so panels of the same size and colours share one texture across scenes.
 */
export function panelImage(scene: Phaser.Scene, x: number, y: number, style: PanelStyle, addToScene = true): Phaser.GameObjects.Image {
  const { width, height, radius, fill, heading } = style;
  const key = `panel-${width}x${height}-r${radius}-${fill.toString(16)}-${heading ? `${heading.height}-${heading.color.toString(16)}` : 'plain'}`;
  const textureWidth = width + MARGIN * 2;
  const textureHeight = height + MARGIN * 2 + SHADOW;

  bake(scene, key, textureWidth, textureHeight, (g) => {
    g.fillStyle(0x000000, 0.35).fillRoundedRect(MARGIN, MARGIN + SHADOW, width, height, radius);
    g.fillStyle(fill).fillRoundedRect(MARGIN, MARGIN, width, height, radius);
    if (heading) {
      g.fillStyle(heading.color).fillRoundedRect(MARGIN, MARGIN, width, heading.height, { tl: radius, tr: radius, bl: 0, br: 0 });
    }
    g.lineStyle(4, COLOR.ink).strokeRoundedRect(MARGIN, MARGIN, width, height, radius);
    if (heading) g.lineBetween(MARGIN, MARGIN + heading.height, MARGIN + width, MARGIN + heading.height);
  });

  // The origin puts the panel's own centre, not the texture's, on (x, y).
  return scene.make
    .image({ x, y, key }, addToScene)
    .setOrigin((MARGIN + width / 2) / textureWidth, (MARGIN + height / 2) / textureHeight);
}
