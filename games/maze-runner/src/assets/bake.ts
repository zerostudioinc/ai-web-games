// Helper for drawing shapes once and keeping the result as a texture.
import type Phaser from 'phaser';

export type Gfx = Phaser.GameObjects.Graphics;

/** Draws with a throw-away Graphics object and stores the result as a texture. Does nothing if the key already exists. */
export function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Gfx) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}
