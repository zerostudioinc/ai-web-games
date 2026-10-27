/**
 * A short expanding ring effect, used for balloon splashes and bomb explosions.
 */
import Phaser from 'phaser';

const DURATION_MS = 350; // how long the effect lasts
const START_RADIUS = 10; // radius when it appears, px

/** Expanding, fading ring used for both balloon splashes and bomb explosions. */
export class Splash extends Phaser.GameObjects.Arc {
  private readonly maxRadius: number; // radius reached at the end of the effect, px
  private elapsedMs = 0; // time since the effect began

  /**
   * Creates the ring and adds it to the scene.
   *
   * @param scene - Scene the effect belongs to.
   * @param x - Centre x in px.
   * @param y - Centre y in px.
   * @param maxRadius - Radius the ring grows to, in px.
   * @param color - Fill colour as 0xRRGGBB.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, maxRadius: number, color: number) {
    super(scene, x, y, START_RADIUS, 0, 360, false, color, 0.55);
    this.maxRadius = maxRadius;
    this.setDepth(4);
    scene.add.existing(this);
  }

  /**
   * Grows and fades the ring.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   * @returns True once the effect has finished and the ring can be destroyed.
   */
  advance(deltaMs: number): boolean {
    this.elapsedMs += deltaMs;
    const t = Math.min(this.elapsedMs / DURATION_MS, 1); // progress 0..1
    // Ease-out: the ring expands quickly at first, then settles.
    const eased = 1 - (1 - t) * (1 - t);
    this.setRadius(START_RADIUS + (this.maxRadius - START_RADIUS) * eased);
    this.setAlpha(1 - t);
    return t >= 1;
  }
}
