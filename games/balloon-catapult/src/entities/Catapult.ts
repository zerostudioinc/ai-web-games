import Phaser from 'phaser';
import { CATAPULT_MAX_HEALTH, FIRE_COOLDOWN_MS, TextureKey } from '../config';
import { COLOR } from '../style';
import type { Vec2 } from '../systems/movement';
import { ARM_LOWERED_ANGLE, ARM_READY_ANGLE, armAngle, loadedBalloonScale, reloadProgress } from '../systems/reload';

const PIVOT_Y = -34;
const ARM_LENGTH = 62;
const BUCKET_LIFT = 12; // where a loaded balloon sits above the arm line

export class Catapult extends Phaser.GameObjects.Container {
  health = CATAPULT_MAX_HEALTH;
  private cooldownMs = 0;
  private elapsedMs = 0;
  private readonly baseArt: Phaser.GameObjects.Graphics;
  private readonly arm: Phaser.GameObjects.Container;
  private readonly loadedBalloon: Phaser.GameObjects.Image;
  private readonly pennant: Phaser.GameObjects.Triangle;
  private readonly hearts: Phaser.GameObjects.Graphics;

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

  get isWrecked(): boolean {
    return this.health <= 0;
  }

  get canFire(): boolean {
    return !this.isWrecked && this.cooldownMs <= 0;
  }

  /** Where a balloon leaves the catapult: the loaded bucket, on the left end of the arm, when ready. */
  get launchPoint(): Vec2 {
    const cos = Math.cos(ARM_READY_ANGLE);
    const sin = Math.sin(ARM_READY_ANGLE);
    return {
      x: this.x - ARM_LENGTH * cos + BUCKET_LIFT * sin,
      y: this.y + PIVOT_Y - ARM_LENGTH * sin - BUCKET_LIFT * cos,
    };
  }

  startCooldown(): void {
    this.cooldownMs = FIRE_COOLDOWN_MS;
    this.applyPose();
  }

  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    this.applyPose();
    this.pennant.scaleX = 0.8 + 0.2 * Math.sin(this.elapsedMs * 0.008);
  }

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

  private applyPose(): void {
    const progress = reloadProgress(this.cooldownMs, FIRE_COOLDOWN_MS);
    const scale = this.isWrecked ? 0 : loadedBalloonScale(progress);
    this.arm.rotation = this.isWrecked ? ARM_LOWERED_ANGLE : armAngle(progress);
    this.loadedBalloon.setScale(scale).setVisible(scale > 0).setRotation(-this.arm.rotation);
  }

  private drawBase(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x000000, 0.22).fillEllipse(0, 31, 124, 18);

    g.lineStyle(9, COLOR.woodDark).lineBetween(-30, -2, 0, PIVOT_Y).lineBetween(30, -2, 0, PIVOT_Y);
    g.lineStyle(5, COLOR.wood).lineBetween(-30, -2, 0, PIVOT_Y).lineBetween(30, -2, 0, PIVOT_Y);
    g.lineStyle(4, COLOR.woodDark).lineBetween(-16, -18, 16, -18);

    g.fillStyle(COLOR.woodDark).fillRoundedRect(-53, -6, 106, 21, 5);
    g.fillStyle(COLOR.wood).fillRoundedRect(-51, -4, 102, 16, 4);
    g.fillStyle(COLOR.woodLight, 0.55).fillRoundedRect(-49, -3, 98, 5, 3);
    g.lineStyle(2, COLOR.woodDark, 0.6);
    for (const x of [-26, 0, 26]) g.lineBetween(x, -4, x, 12);

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

    g.lineStyle(3, 0x5d4037).lineBetween(0, PIVOT_Y, 0, PIVOT_Y - 32);
  }

  private drawArm(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(10, COLOR.woodDark).lineBetween(-ARM_LENGTH, 0, 26, 0);
    g.lineStyle(6, COLOR.woodLight).lineBetween(-ARM_LENGTH, 0, 26, 0);

    g.fillStyle(0x607d8b).fillCircle(28, 4, 11);
    g.fillStyle(0x90a4ae).fillCircle(25, 1, 4);
    g.lineStyle(2, COLOR.ink).strokeCircle(28, 4, 11);

    g.fillStyle(0x6d4c41).fillRoundedRect(-ARM_LENGTH - 14, -4, 28, 14, { tl: 0, tr: 0, bl: 8, br: 8 });
    g.lineStyle(3, COLOR.woodDark).lineBetween(-ARM_LENGTH - 16, -4, -ARM_LENGTH + 16, -4);

    g.fillStyle(0x3e2723).fillCircle(0, 0, 7);
    g.fillStyle(0xbcaaa4).fillCircle(0, 0, 3);
  }

  private drawHearts(): void {
    this.hearts.clear();
    for (let i = 0; i < CATAPULT_MAX_HEALTH; i++) {
      const x = (i - 1) * 20;
      this.hearts.fillStyle(i < this.health ? 0xef5350 : 0x37474f);
      this.hearts.fillCircle(x - 3.5, 49, 4).fillCircle(x + 3.5, 49, 4).fillTriangle(x - 7.3, 50.5, x + 7.3, 50.5, x, 59);
    }
  }
}
