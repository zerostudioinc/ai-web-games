import Phaser from 'phaser';
import { BOMB_SPAWN_X, laneCenterY } from '../config';

const RADIUS = 22;

export class Bomb extends Phaser.GameObjects.Container {
  readonly lane: number;
  private readonly speed: number; // px per second
  private readonly leftFoot: Phaser.GameObjects.Ellipse;
  private readonly rightFoot: Phaser.GameObjects.Ellipse;
  private stride = 0;

  constructor(scene: Phaser.Scene, lane: number, speed: number) {
    super(scene, BOMB_SPAWN_X, laneCenterY(lane));
    this.lane = lane;
    this.speed = speed;

    const art = scene.make.graphics({}, false);
    art.fillStyle(0x263238).fillCircle(0, 0, RADIUS);
    art.fillStyle(0x455a64).fillCircle(-7, -8, 6);
    art.fillStyle(0xffffff).fillCircle(-8, 0, 5).fillCircle(8, 0, 5);
    art.fillStyle(0x000000).fillCircle(-10, 0, 2).fillCircle(6, 0, 2);
    art.lineStyle(3, 0x8d6e63).lineBetween(0, -RADIUS, 6, -RADIUS - 10);
    art.fillStyle(0xff7043).fillCircle(7, -RADIUS - 12, 4);

    this.leftFoot = new Phaser.GameObjects.Ellipse(scene, -9, RADIUS, 14, 8, 0x37474f);
    this.rightFoot = new Phaser.GameObjects.Ellipse(scene, 9, RADIUS, 14, 8, 0x37474f);
    this.add([this.leftFoot, this.rightFoot, art]);

    this.setDepth(3);
    scene.add.existing(this);
  }

  advance(deltaMs: number): void {
    const distance = this.speed * (deltaMs / 1000);
    this.x -= distance;
    this.stride += distance * 0.08;
    this.leftFoot.y = RADIUS + Math.sin(this.stride) * 4;
    this.rightFoot.y = RADIUS + Math.sin(this.stride + Math.PI) * 4;
  }
}
