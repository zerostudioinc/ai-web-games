import Phaser from 'phaser';

export class Catapult extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y);

    const g = scene.make.graphics({}, false);
    g.fillStyle(0x6d4c41).fillRoundedRect(-40, -12, 80, 24, 6);
    g.fillStyle(0x3e2723).fillCircle(-26, 14, 11).fillCircle(26, 14, 11);
    g.lineStyle(8, 0x8d6e63).lineBetween(-10, -8, 30, -44);
    g.fillStyle(color).fillCircle(32, -48, 14);
    g.lineStyle(3, 0xffffff, 0.8).strokeCircle(32, -48, 14);
    this.add(g);

    scene.add.existing(this);
  }
}
