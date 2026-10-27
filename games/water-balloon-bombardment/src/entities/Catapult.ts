import Phaser from 'phaser';
import { CATAPULT_MAX_HEALTH, FIRE_COOLDOWN_MS } from '../config';
import type { Vec2 } from '../systems/movement';

export class Catapult extends Phaser.GameObjects.Container {
  health = CATAPULT_MAX_HEALTH;
  private cooldownMs = 0;
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly pips: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y);

    this.art = scene.make.graphics({}, false);
    this.art.fillStyle(0x6d4c41).fillRoundedRect(-40, -12, 80, 24, 6);
    this.art.fillStyle(0x3e2723).fillCircle(-26, 14, 11).fillCircle(26, 14, 11);
    this.art.lineStyle(8, 0x8d6e63).lineBetween(-10, -8, 30, -44);
    this.art.fillStyle(color).fillCircle(32, -48, 14);
    this.art.lineStyle(3, 0xffffff, 0.8).strokeCircle(32, -48, 14);

    this.pips = scene.make.graphics({}, false);
    this.add([this.art, this.pips]);
    this.drawHealth();

    this.setDepth(2);
    scene.add.existing(this);
  }

  get isWrecked(): boolean {
    return this.health <= 0;
  }

  get canFire(): boolean {
    return !this.isWrecked && this.cooldownMs <= 0;
  }

  /** Where a balloon leaves the catapult: the loaded bucket. */
  get launchPoint(): Vec2 {
    return { x: this.x + 32, y: this.y - 48 };
  }

  startCooldown(): void {
    this.cooldownMs = FIRE_COOLDOWN_MS;
  }

  tick(deltaMs: number): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
  }

  takeHit(): void {
    this.health = Math.max(0, this.health - 1);
    this.drawHealth();
    if (this.isWrecked) this.art.setAlpha(0.35);
  }

  private drawHealth(): void {
    this.pips.clear();
    for (let i = 0; i < CATAPULT_MAX_HEALTH; i++) {
      this.pips.fillStyle(i < this.health ? 0xef5350 : 0x37474f).fillCircle((i - 1) * 20, 44, 7);
    }
  }
}
