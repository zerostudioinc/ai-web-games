import Phaser from 'phaser';
import { BOMB_SPAWN_X, TextureKey, laneCenterY } from '../config';

const FOOT_Y = 24;

export class Bomb extends Phaser.GameObjects.Container {
  readonly lane: number;
  private readonly speed: number; // px per second
  private readonly leftFoot: Phaser.GameObjects.Ellipse;
  private readonly rightFoot: Phaser.GameObjects.Ellipse;
  private readonly bodyImage: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly spark: Phaser.GameObjects.Star;
  private stride = 0;
  private elapsedMs = 0;

  constructor(scene: Phaser.Scene, lane: number, speed: number) {
    super(scene, BOMB_SPAWN_X, laneCenterY(lane));
    this.lane = lane;
    this.speed = speed;

    const shadow = new Phaser.GameObjects.Ellipse(scene, 0, 32, 44, 12, 0x000000, 0.25);
    this.leftFoot = new Phaser.GameObjects.Ellipse(scene, -9, FOOT_Y, 15, 9, 0x263238).setStrokeStyle(2, 0x11181c);
    this.rightFoot = new Phaser.GameObjects.Ellipse(scene, 9, FOOT_Y, 15, 9, 0x263238).setStrokeStyle(2, 0x11181c);
    this.bodyImage = new Phaser.GameObjects.Image(scene, 0, 0, TextureKey.BombBody);
    this.glow = new Phaser.GameObjects.Arc(scene, 10, -38, 7, 0, 360, false, 0xff7043, 0.5);
    this.spark = new Phaser.GameObjects.Star(scene, 10, -38, 4, 2.5, 6, 0xffd54f);

    this.add([shadow, this.leftFoot, this.rightFoot, this.bodyImage, this.glow, this.spark]);
    this.setDepth(3);
    scene.add.existing(this);
  }

  advance(deltaMs: number): void {
    const distance = this.speed * (deltaMs / 1000);
    this.elapsedMs += deltaMs;
    this.x -= distance;
    this.stride += distance * 0.08;

    this.leftFoot.y = FOOT_Y + Math.sin(this.stride) * 4;
    this.rightFoot.y = FOOT_Y + Math.sin(this.stride + Math.PI) * 4;
    this.bodyImage.rotation = Math.sin(this.stride) * 0.08;

    const flicker = 0.8 + 0.4 * Math.sin(this.elapsedMs * 0.03);
    this.spark.setScale(flicker).setRotation(this.elapsedMs * 0.01);
    this.glow.setScale(flicker);
  }
}
