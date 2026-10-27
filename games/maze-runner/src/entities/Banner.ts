// A short-lived message that pops in, holds, then fades out: level intros, "TRAPPED!" and warnings.
import type Phaser from 'phaser';
import { COLOR, labelStyle } from '../style';
import { easeOutBack } from '../systems/ease';

const POP_MS = 220;
const FADE_MS = 300;
const PADDING_X = 40;
const PADDING_Y = 16;
const LINE_GAP = 6;

export interface BannerOptions {
  x: number;
  y: number;
  titleSize: number;
  subtitleSize: number;
}

export class Banner {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private remainingMs = 0;
  private ageMs = 0;

  constructor(scene: Phaser.Scene, options: BannerOptions) {
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', labelStyle(options.titleSize)).setOrigin(0.5);
    this.subtitle = scene.add.text(0, 0, '', labelStyle(options.subtitleSize)).setOrigin(0.5);
    this.container = scene.add.container(options.x, options.y, [this.panel, this.title, this.subtitle]).setDepth(60).setVisible(false);
  }

  /** Shows the message for `durationMs`, including its pop-in and fade-out. The subtitle may be empty. */
  show(title: string, subtitle: string, durationMs: number): void {
    const hasSubtitle = subtitle !== '';
    this.title.setText(title);
    this.subtitle.setText(subtitle).setVisible(hasSubtitle);

    // Stack the lines around the container's centre, then size the panel to wrap them.
    const height = this.title.height + (hasSubtitle ? this.subtitle.height + LINE_GAP : 0);
    this.title.setY(-height / 2 + this.title.height / 2);
    this.subtitle.setY(height / 2 - this.subtitle.height / 2);
    const width = Math.max(this.title.width, hasSubtitle ? this.subtitle.width : 0) + PADDING_X * 2;
    const left = -width / 2;
    const top = -height / 2 - PADDING_Y;
    const panelHeight = height + PADDING_Y * 2;
    this.panel
      .clear()
      .fillStyle(COLOR.night, 0.78)
      .fillRoundedRect(left, top, width, panelHeight, 22)
      .lineStyle(4, 0xffffff, 0.35)
      .strokeRoundedRect(left, top, width, panelHeight, 22);

    this.remainingMs = durationMs;
    this.ageMs = 0;
    this.container.setVisible(true).setAlpha(1).setScale(0.7);
  }

  hide(): void {
    this.remainingMs = 0;
    this.container.setVisible(false);
  }

  update(deltaMs: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs -= deltaMs;
    this.ageMs += deltaMs;
    if (this.remainingMs <= 0) {
      this.hide();
      return;
    }
    this.container.setScale(0.7 + 0.3 * easeOutBack(this.ageMs / POP_MS));
    this.container.setAlpha(Math.min(1, this.remainingMs / FADE_MS));
  }
}
