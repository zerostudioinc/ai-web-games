/**
 * Helper for drawing shapes once and keeping the result as a texture.
 */
import type Phaser from 'phaser';

/** Shorthand for the Phaser graphics object every draw function paints on. */
export type Gfx = Phaser.GameObjects.Graphics;

/**
 * Draws with a throw-away Graphics object and stores the result as a texture. Does nothing if the key already exists.
 *
 * @param scene - Scene used to create the graphics object and register the texture.
 * @param key - Texture key to register.
 * @param width - Texture width in px.
 * @param height - Texture height in px.
 * @param draw - Callback that paints the picture onto the graphics object, in texture pixels from (0, 0) at the top-left.
 */
export function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Gfx) => void): void {
  if (scene.textures.exists(key)) return;
  // `false` keeps the graphics object out of the scene; it is only a drawing surface.
  const g = scene.make.graphics({}, false);
  draw(g);
  // Render the shapes into a texture of the given size; anything outside the width and height is cut off.
  g.generateTexture(key, width, height);
  // The picture now lives in the texture, so the drawing surface is no longer needed.
  g.destroy();
}
