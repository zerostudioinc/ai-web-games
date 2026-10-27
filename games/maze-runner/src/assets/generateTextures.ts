/**
 * Draws every texture the game needs, once, at start-up. Nothing is loaded from disk.
 */
import type Phaser from 'phaser';
import { generateRunnerTextures } from './runnerArt';
import { generateBackgrounds } from './themeArt';
import { generateUiTextures } from './uiArt';

/**
 * Bakes every texture the game uses: the interface graphics, the runner's frames and walk animations, and the backgrounds.
 *
 * @param scene - Scene used to create the textures (the boot scene).
 */
export function generateTextures(scene: Phaser.Scene): void {
  generateUiTextures(scene);
  generateRunnerTextures(scene);
  generateBackgrounds(scene);
}
