/**
 * Rounded panels for menu cards, drawn once to a texture.
 * Large rounded shapes filled by Graphics can show hairline seams in WebGL; a baked texture does not.
 */
import type Phaser from 'phaser';
import { COLOR } from '../style';
import { bake } from './bake';

const MARGIN = 8; // transparent border so the outline is never clipped, px
const SHADOW = 8; // how far the drop shadow sits below the panel, px

/** Size and colours of a panel; panels with the same style share one cached texture. */
export interface PanelStyle {
  width: number; // panel width, px, not counting the margin or the shadow
  height: number; // panel height, px
  radius: number; // corner radius, px
  fill: number; // panel colour as 0xRRGGBB
  /** A coloured strip across the top, with a divider line under it. */
  heading?: { height: number; color: number }; // `height` is the strip's height in px; `color` is its colour as 0xRRGGBB
}

/**
 * Creates an image of the panel with its centre at (x, y). The texture is cached by style,
 * so panels of the same size and colours share one texture across scenes.
 *
 * @param scene - Scene used to bake the texture and create the image.
 * @param x - Centre x of the panel, px.
 * @param y - Centre y of the panel, px.
 * @param style - Size, corner radius and colours of the panel.
 * @param addToScene - True (the default) to add the image to the scene; false to leave it free, e.g. to put it in a container.
 * @returns The panel's image, shadow included; its origin is set so the panel itself (not the whole texture) is centred on (x, y).
 */
export function panelImage(scene: Phaser.Scene, x: number, y: number, style: PanelStyle, addToScene = true): Phaser.GameObjects.Image {
  const { width, height, radius, fill, heading } = style;
  // The key spells out everything that changes the picture, so each distinct style is baked only once.
  const key = `panel-${width}x${height}-r${radius}-${fill.toString(16)}-${heading ? `${heading.height}-${heading.color.toString(16)}` : 'plain'}`;
  // The texture is larger than the panel: a margin all round, plus room below for the shadow.
  const textureWidth = width + MARGIN * 2;
  const textureHeight = height + MARGIN * 2 + SHADOW;

  // Layers, bottom to top: drop shadow, fill, heading strip (rounded at the top corners only), outline, divider under the heading.
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
