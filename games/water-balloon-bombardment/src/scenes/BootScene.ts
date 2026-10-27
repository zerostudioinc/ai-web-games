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

    // Text must not render before the bundled display font is ready.
    let started = false;
    const start = (): void => {
      if (started) return;
      started = true;
      this.scene.start(SceneKey.Menu);
    };
    document.fonts.load('48px "Lilita One"', 'Aa0').then(start, start);
    window.setTimeout(start, FONT_TIMEOUT_MS);
  }
}
