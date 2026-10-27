// Draws every texture the game needs, once, at start-up. Nothing is loaded from disk.
import type Phaser from 'phaser';
import { generateRunnerTextures } from './runnerArt';
import { generateBackgrounds } from './themeArt';
import { generateUiTextures } from './uiArt';

export function generateTextures(scene: Phaser.Scene): void {
  generateUiTextures(scene);
  generateRunnerTextures(scene);
  generateBackgrounds(scene);
}
