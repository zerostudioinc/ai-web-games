/**
 * A player's catapult: wooden base, swinging arm with a loaded balloon, team pennant and health hearts.
 */
import Phaser from 'phaser';
import { CATAPULT_MAX_HEALTH, FIRE_COOLDOWN_MS, TextureKey } from '../config';
import { COLOR } from '../style';
import type { Vec2 } from '../systems/movement';
import { ARM_LOWERED_ANGLE, ARM_READY_ANGLE, armAngle, loadedBalloonScale, reloadProgress } from '../systems/reload';

const PIVOT_Y = -34; // y of the arm's pivot relative to the catapult's centre, px
const ARM_LENGTH = 62; // distance from the pivot to the bucket, px
const BUCKET_LIFT = 12; // where a loaded balloon sits above the arm line

/** A catapult that fires balloons, reloads with an animated arm, and shows its remaining health as hearts. */
export class Catapult extends Phaser.GameObjects.Container {
  health = CATAPULT_MAX_HEALTH; // bomb hits left before it is wrecked
  private cooldownMs = 0; // time left until it can fire again
  private elapsedMs = 0; // lifetime, drives the pennant flutter
  private readonly baseArt: Phaser.GameObjects.Graphics; // wooden frame and wheels
  private readonly arm: Phaser.GameObjects.Container; // rotating throwing arm (beam and loaded balloon)
  private readonly loadedBalloon: Phaser.GameObjects.Image; // balloon in the bucket; grows in as the reload completes
  private readonly pennant: Phaser.GameObjects.Triangle; // flag in the player's colour
  private readonly hearts: Phaser.GameObjects.Graphics; // remaining-health hearts under the base

  /**
   * Builds the catapult and adds it to the scene.
   *
   * @param scene - Scene the catapult belongs to.
   * @param x - Centre x in px.
   * @param y - Centre y in px (the middle of its lane).
   * @param color - The player's colour, used for the balloon and the pennant.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y);

    this.baseArt = scene.make.graphics({}, false);
    this.drawBase(this.baseArt);

    const armArt = scene.make.graphics({}, false);
    this.drawArm(armArt);
    this.loadedBalloon = new Phaser.GameObjects.Image(scene, -ARM_LENGTH, -BUCKET_LIFT, TextureKey.Balloon).setTint(color);
    this.arm = new Phaser.GameObjects.Container(scene, 0, PIVOT_Y, [armArt, this.loadedBalloon]);

    this.pennant = new Phaser.GameObjects.Triangle(scene, 0, PIVOT_Y - 32, 0, 0, 26, 8, 0, 16, color)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLOR.ink);

    this.hearts = scene.make.graphics({}, false);
    this.add([this.baseArt, this.arm, this.pennant, this.hearts]);
    this.drawHearts();
    this.applyPose();

    this.setDepth(2);
    scene.add.existing(this);
  }

  /** True once all health is gone. */
  get isWrecked(): boolean {
    return this.health <= 0;
  }

  /** True while the catapult is standing and has finished reloading. */
  get canFire(): boolean {
    return !this.isWrecked && this.cooldownMs <= 0;
  }

  /** Where a balloon leaves the catapult: the loaded bucket, on the left end of the arm, when ready. */
  get launchPoint(): Vec2 {
    const cos = Math.cos(ARM_READY_ANGLE);
    const sin = Math.sin(ARM_READY_ANGLE);
    // Rotate the bucket's offset from the pivot (-ARM_LENGTH, -BUCKET_LIFT) by the ready angle, then add the pivot's position.
    return {
      x: this.x - ARM_LENGTH * cos + BUCKET_LIFT * sin,
      y: this.y + PIVOT_Y - ARM_LENGTH * sin - BUCKET_LIFT * cos,
    };
  }

  /** Starts the reload countdown after a shot, which also puts the arm in its just-released pose. */
  startCooldown(): void {
    this.cooldownMs = FIRE_COOLDOWN_MS;
    this.applyPose();
  }

  /**
   * Advances the reload and the pennant flutter.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    this.applyPose();
    this.pennant.scaleX = 0.8 + 0.2 * Math.sin(this.elapsedMs * 0.008);
  }

  /** Removes one health point, redraws the hearts and, if that wrecks the catapult, greys it out. */
  takeHit(): void {
    this.health = Math.max(0, this.health - 1);
    this.drawHearts();
    if (this.isWrecked) {
      this.baseArt.setAlpha(0.35);
      this.arm.setAlpha(0.35);
      this.pennant.setVisible(false);
      this.applyPose();
    }
  }

  /** Poses the arm and the loaded balloon for the current reload progress; a wrecked catapult stays lowered and empty. */
  private applyPose(): void {
    const progress = reloadProgress(this.cooldownMs, FIRE_COOLDOWN_MS);
    const scale = this.isWrecked ? 0 : loadedBalloonScale(progress);
    this.arm.rotation = this.isWrecked ? ARM_LOWERED_ANGLE : armAngle(progress);
    // Counter-rotate the balloon so it stays upright while the arm swings.
    this.loadedBalloon.setScale(scale).setVisible(scale > 0).setRotation(-this.arm.rotation);
  }

  /**
   * Draws the static parts: ground shadow, A-frame, deck, wheels and the mast.
   *
   * @param g - Graphics object to draw on (centred on the catapult's origin).
   */
  private drawBase(g: Phaser.GameObjects.Graphics): void {
    // Ground shadow.
    g.fillStyle(0x000000, 0.22).fillEllipse(0, 31, 124, 18);

    // A-frame legs (dark outline pass first, then the lighter wood on top) and the cross brace.
    g.lineStyle(9, COLOR.woodDark).lineBetween(-30, -2, 0, PIVOT_Y).lineBetween(30, -2, 0, PIVOT_Y);
    g.lineStyle(5, COLOR.wood).lineBetween(-30, -2, 0, PIVOT_Y).lineBetween(30, -2, 0, PIVOT_Y);
    g.lineStyle(4, COLOR.woodDark).lineBetween(-16, -18, 16, -18);

    // Deck: outline, planks, highlight and plank gaps.
    g.fillStyle(COLOR.woodDark).fillRoundedRect(-53, -6, 106, 21, 5);
    g.fillStyle(COLOR.wood).fillRoundedRect(-51, -4, 102, 16, 4);
    g.fillStyle(COLOR.woodLight, 0.55).fillRoundedRect(-49, -3, 98, 5, 3);
    g.lineStyle(2, COLOR.woodDark, 0.6);
    for (const x of [-26, 0, 26]) g.lineBetween(x, -4, x, 12);

    // Two wheels; each spoke line passes through the hub, so four lines make eight spokes.
    for (const wx of [-34, 34]) {
      g.fillStyle(0x2d1b0e).fillCircle(wx, 18, 16);
      g.fillStyle(0x8d6e63).fillCircle(wx, 18, 12);
      g.lineStyle(2, COLOR.woodDark);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 4;
        g.lineBetween(wx - Math.cos(a) * 12, 18 - Math.sin(a) * 12, wx + Math.cos(a) * 12, 18 + Math.sin(a) * 12);
      }
      g.fillStyle(COLOR.woodDark).fillCircle(wx, 18, 4);
    }

    // Mast that carries the pennant.
    g.lineStyle(3, 0x5d4037).lineBetween(0, PIVOT_Y, 0, PIVOT_Y - 32);
  }

  /**
   * Draws the throwing arm, with its pivot at the graphics' origin.
   *
   * @param g - Graphics object to draw on.
   */
  private drawArm(g: Phaser.GameObjects.Graphics): void {
    // Beam, with the bucket on the left end and the counterweight on the right.
    g.lineStyle(10, COLOR.woodDark).lineBetween(-ARM_LENGTH, 0, 26, 0);
    g.lineStyle(6, COLOR.woodLight).lineBetween(-ARM_LENGTH, 0, 26, 0);

    // Counterweight.
    g.fillStyle(0x607d8b).fillCircle(28, 4, 11);
    g.fillStyle(0x90a4ae).fillCircle(25, 1, 4);
    g.lineStyle(2, COLOR.ink).strokeCircle(28, 4, 11);

    // Bucket (flat top, rounded bottom) and its rim.
    g.fillStyle(0x6d4c41).fillRoundedRect(-ARM_LENGTH - 14, -4, 28, 14, { tl: 0, tr: 0, bl: 8, br: 8 });
    g.lineStyle(3, COLOR.woodDark).lineBetween(-ARM_LENGTH - 16, -4, -ARM_LENGTH + 16, -4);

    // Pivot bolt.
    g.fillStyle(0x3e2723).fillCircle(0, 0, 7);
    g.fillStyle(0xbcaaa4).fillCircle(0, 0, 3);
  }

  /** Redraws the health hearts; lost hearts are drawn grey. */
  private drawHearts(): void {
    this.hearts.clear();
    for (let i = 0; i < CATAPULT_MAX_HEALTH; i++) {
      const x = (i - 1) * 20; // hearts are spaced 20 px apart, centred under the catapult
      this.hearts.fillStyle(i < this.health ? 0xef5350 : 0x37474f);
      // A heart is two round lobes plus a triangle pointing down.
      this.hearts.fillCircle(x - 3.5, 49, 4).fillCircle(x + 3.5, 49, 4).fillTriangle(x - 7.3, 50.5, x + 7.3, 50.5, x, 59);
    }
  }
}
