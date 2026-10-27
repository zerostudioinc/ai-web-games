// Generates every texture up front, then waits for the display font before opening the menu.
import Phaser from 'phaser';
import { generateTextures } from '../assets/generateTextures';
import { SceneKey } from '../config';

const FONT_TIMEOUT_MS = 2000;

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  create(): void {
    generateTextures(this);

    // Text must not render before the bundled display font is ready; give up waiting after a short while.
    let started = false;
    let fallback: number | undefined;
    const start = (): void => {
      if (started) return;
      started = true;
      window.clearTimeout(fallback);
      this.scene.start(SceneKey.Menu);
    };
    document.fonts.load('48px "Lilita One"', 'Aa0').then(start, start);
    fallback = window.setTimeout(start, FONT_TIMEOUT_MS);
  }
}
