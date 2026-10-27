import Phaser from 'phaser';
import { labelStyle } from '../style';

export class Reticle extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, color: number, label: string) {
    super(scene, x, y);

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

  /** Dimmed while the catapult is reloading. */
  setReady(ready: boolean): void {
    this.setAlpha(ready ? 1 : 0.45);
  }
}
