/**
 * A water balloon in flight, lobbed from a catapult to a target point.
 */
import Phaser from 'phaser';
import { BALLOON_ARC_HEIGHT, SPLASH_RADIUS, TextureKey } from '../config';
import { balloonPosition } from '../systems/combat';
import type { Vec2 } from '../systems/movement';

/** A lobbed water balloon that lands on `target` after `durationMs`. */
export class Balloon extends Phaser.GameObjects.Container {
  readonly target: Vec2; // where the balloon lands and splashes
  readonly color: number; // the owning player's tint
  private readonly start: Vec2; // launch point
  private readonly durationMs: number; // total flight time
  private readonly marker: Phaser.GameObjects.Arc; // translucent circle on the ground showing the splash area
  private elapsedMs = 0; // time spent in the air so far

  /**
   * Creates the balloon at its launch point and adds it to the scene.
   *
   * @param scene - Scene the balloon belongs to.
   * @param start - Launch point (the catapult's bucket).
   * @param target - Landing point (where the reticle was when fired).
   * @param durationMs - Flight time in ms.
   * @param color - Tint of the balloon (the player's colour).
   */
  constructor(scene: Phaser.Scene, start: Vec2, target: Vec2, durationMs: number, color: number) {
    super(scene, start.x, start.y);
    this.start = start;
    this.target = target;
    this.durationMs = durationMs;
    this.color = color;

    this.add(new Phaser.GameObjects.Image(scene, 0, 0, TextureKey.Balloon).setTint(color));

    // Shows the splash area so players can lead moving bombs.
    this.marker = scene.add.circle(target.x, target.y, SPLASH_RADIUS, color, 0.12).setStrokeStyle(2, color, 0.6).setDepth(1);

    this.setDepth(6);
    scene.add.existing(this);
  }

  /**
   * Moves the balloon along its arc.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   * @returns True once the balloon has landed.
   */
  advance(deltaMs: number): boolean {
    this.elapsedMs += deltaMs;
    const t = this.elapsedMs / this.durationMs; // flight progress; 1 or more means landed
    const position = balloonPosition(this.start, this.target, t, BALLOON_ARC_HEIGHT);
    this.setPosition(position.x, position.y);
    // Wobble side to side while flying.
    this.rotation = Math.sin(this.elapsedMs * 0.012) * 0.35;
    return t >= 1;
  }

  /**
   * Also removes the landing marker, which is a separate scene object not owned by this container.
   *
   * @param fromScene - Set by Phaser when the whole scene is shutting down.
   */
  override destroy(fromScene?: boolean): void {
    this.marker.destroy();
    super.destroy(fromScene);
  }
}
