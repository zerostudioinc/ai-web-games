/**
 * Start-up scene: generates every texture up front, then waits for the display font before opening the menu.
 */
import Phaser from 'phaser';
import { generateTextures } from '../assets/generateTextures';
import { SceneKey } from '../config';

const FONT_TIMEOUT_MS = 2000; // longest the boot waits for the display font before opening the menu anyway, ms

/** First scene to run: it prepares the textures and the font, then hands over to the main menu. */
export class BootScene extends Phaser.Scene {
  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Boot);
  }

  /** Bakes all textures, then opens the menu once the display font is ready or the wait times out. */
  create(): void {
    // Every texture is drawn in code, so later scenes can use them by key without loading any file.
    generateTextures(this);

    // Text must not render before the bundled display font is ready; give up waiting after a short while.
    let started = false; // true once the menu has been requested, so a second trigger does nothing
    let fallback: number | undefined; // id of the timeout below, so it can be cancelled when the font finishes first
    /** Opens the menu once, whichever of the font load and the timeout gets here first. */
    const start = (): void => {
      if (started) return;
      started = true;
      window.clearTimeout(fallback);
      this.scene.start(SceneKey.Menu);
    };
    // 'Aa0' is the sample text the font must cover; a failed load carries on too, using the fallback fonts.
    document.fonts.load('48px "Lilita One"', 'Aa0').then(start, start);
    // Safety net for a font request that never settles.
    fallback = window.setTimeout(start, FONT_TIMEOUT_MS);
  }
}
