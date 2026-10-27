/**
 * A walking bomb enemy that marches along a lane towards the catapults.
 */
import Phaser from 'phaser';
import { BOMB_SPAWN_X, TextureKey } from '../config';

const FOOT_Y = 24; // resting y of each foot relative to the bomb's centre, px

/** A bomb that waddles left along its lane at a constant speed. */
export class Bomb extends Phaser.GameObjects.Container {
  readonly lane: number; // 0-based lane it walks down
  private readonly speed: number; // px per second
  private readonly leftFoot: Phaser.GameObjects.Ellipse; // bobs up and down as the bomb walks
  private readonly rightFoot: Phaser.GameObjects.Ellipse; // half a step out of phase with the left foot
  private readonly bodyImage: Phaser.GameObjects.Image; // the round shell; sways slightly while walking
  private readonly glow: Phaser.GameObjects.Arc; // orange halo around the fuse spark
  private readonly spark: Phaser.GameObjects.Star; // flickering fuse tip
  private stride = 0; // walk-cycle phase in radians; grows with distance walked
  private elapsedMs = 0; // lifetime, drives the fuse flicker

  /**
   * Creates the bomb just off the right edge of the screen and adds it to the scene.
   *
   * @param scene - Scene the bomb belongs to.
   * @param lane - 0-based lane the bomb walks down.
   * @param y - Vertical centre of that lane, in px.
   * @param speed - Walking speed in px per second.
   */
  constructor(scene: Phaser.Scene, lane: number, y: number, speed: number) {
    super(scene, BOMB_SPAWN_X, y);
    this.lane = lane;
    this.speed = speed;

    // Parts are listed back to front: ground shadow, feet, body, then the fuse glow and spark on top.
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

  /**
   * Walks the bomb left and animates its feet, body sway and fuse.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  advance(deltaMs: number): void {
    const distance = this.speed * (deltaMs / 1000); // px walked this frame
    this.elapsedMs += deltaMs;
    this.x -= distance;
    // The step cycle follows distance walked, so faster bombs take quicker steps.
    this.stride += distance * 0.08;

    // The feet are half a cycle apart so they alternate.
    this.leftFoot.y = FOOT_Y + Math.sin(this.stride) * 4;
    this.rightFoot.y = FOOT_Y + Math.sin(this.stride + Math.PI) * 4;
    this.bodyImage.rotation = Math.sin(this.stride) * 0.08;

    // The fuse spark pulses in size and spins; the glow pulses with it.
    const flicker = 0.8 + 0.4 * Math.sin(this.elapsedMs * 0.03);
    this.spark.setScale(flicker).setRotation(this.elapsedMs * 0.01);
    this.glow.setScale(flicker);
  }
}
