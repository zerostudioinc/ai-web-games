/**
 * First scene: bakes the generated textures and waits for the display font before opening the menu.
 */
import Phaser from 'phaser';
import { generateTextures } from '../assets/generateTextures';
import { SceneKey } from '../config';

const FONT_TIMEOUT_MS = 2000; // start anyway if the font has not loaded after this long

/** Prepares textures and the font so no later scene draws text with a fallback font. */
export class BootScene extends Phaser.Scene {
  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Boot);
  }

  /** Generates the textures, then opens the menu once the font is ready (or the timeout passes). */
  create(): void {
    generateTextures(this);

    // Text must not render before the bundled display font is ready.
    let started = false;
    /** Opens the menu exactly once, whichever of the font load and the timeout finishes first. */
    const start = (): void => {
      if (started) return;
      started = true;
      this.scene.start(SceneKey.Menu);
    };
    // Start whether the font loads or fails to load; the timeout covers a promise that never settles.
    document.fonts.load('48px "Lilita One"', 'Aa0').then(start, start);
    window.setTimeout(start, FONT_TIMEOUT_MS);
  }
}
