import Phaser from 'phaser';
import { BALLOON_ARC_HEIGHT, SPLASH_RADIUS, TextureKey } from '../config';
import { balloonPosition } from '../systems/combat';
import type { Vec2 } from '../systems/movement';

/** A lobbed water balloon that lands on `target` after `durationMs`. */
export class Balloon extends Phaser.GameObjects.Container {
  readonly target: Vec2;
  readonly color: number;
  private readonly start: Vec2;
  private readonly durationMs: number;
  private readonly marker: Phaser.GameObjects.Arc;
  private elapsedMs = 0;

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

  /** Returns true once the balloon has landed. */
  advance(deltaMs: number): boolean {
    this.elapsedMs += deltaMs;
    const t = this.elapsedMs / this.durationMs;
    const position = balloonPosition(this.start, this.target, t, BALLOON_ARC_HEIGHT);
    this.setPosition(position.x, position.y);
    this.rotation = Math.sin(this.elapsedMs * 0.012) * 0.35;
    return t >= 1;
  }

  override destroy(fromScene?: boolean): void {
    this.marker.destroy();
    super.destroy(fromScene);
  }
}
