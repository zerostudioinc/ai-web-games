/**
 * The aiming crosshair a player steers over the field.
 */
import Phaser from 'phaser';
import { labelStyle } from '../style';

/** A crosshair with a short player label above it, drawn in the player's colour. */
export class Reticle extends Phaser.GameObjects.Container {
  /**
   * Draws the crosshair and adds it to the scene.
   *
   * @param scene - Scene the reticle belongs to.
   * @param x - Starting centre x in px.
   * @param y - Starting centre y in px.
   * @param color - Line colour (the player's colour).
   * @param label - Short text shown above the crosshair, e.g. "P1".
   */
  constructor(scene: Phaser.Scene, x: number, y: number, color: number, label: string) {
    super(scene, x, y);

    // A ring with four tick marks pointing in towards the centre.
    const g = scene.make.graphics({}, false);
    g.lineStyle(3, color).strokeCircle(0, 0, 18);
    g.lineBetween(-28, 0, -8, 0).lineBetween(8, 0, 28, 0);
    g.lineBetween(0, -28, 0, -8).lineBetween(0, 8, 0, 28);
    const text = scene.make.text({
      x: 0,
      y: -44,
      text: label,
      style: labelStyle(20),
    }, false).setOrigin(0.5);
    this.add([g, text]);

    this.setDepth(10);
    scene.add.existing(this);
  }

  /**
   * Dims the reticle while the catapult is reloading.
   *
   * @param ready - True when the catapult can fire, false while it reloads.
   */
  setReady(ready: boolean): void {
    this.setAlpha(ready ? 1 : 0.45);
  }
}
