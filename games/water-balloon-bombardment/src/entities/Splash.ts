import Phaser from 'phaser';

const DURATION_MS = 350;
const START_RADIUS = 10;

/** Expanding, fading ring used for both balloon splashes and bomb explosions. */
export class Splash extends Phaser.GameObjects.Arc {
  private readonly maxRadius: number;
  private elapsedMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxRadius: number, color: number) {
    super(scene, x, y, START_RADIUS, 0, 360, false, color, 0.55);
    this.maxRadius = maxRadius;
    this.setDepth(4);
    scene.add.existing(this);
  }

  /** Returns true once the effect has finished. */
  advance(deltaMs: number): boolean {
    this.elapsedMs += deltaMs;
    const t = Math.min(this.elapsedMs / DURATION_MS, 1);
    const eased = 1 - (1 - t) * (1 - t);
    this.setRadius(START_RADIUS + (this.maxRadius - START_RADIUS) * eased);
    this.setAlpha(1 - t);
    return t >= 1;
  }
}
