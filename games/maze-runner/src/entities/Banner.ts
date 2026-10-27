/**
 * A short-lived message that pops in, holds, then fades out: level intros, "TRAPPED!" and warnings.
 */
import type Phaser from 'phaser';
import { COLOR, labelStyle } from '../style';
import { easeOutBack } from '../systems/ease';

const POP_MS = 220; // length of the pop-in growth, ms
const FADE_MS = 300; // the banner fades out over its last FADE_MS, ms
const PADDING_X = 40; // space between the text and the left and right edges of the panel, px
const PADDING_Y = 16; // space between the text and the top and bottom edges of the panel, px
const LINE_GAP = 6; // gap between the title and the subtitle, px

/** Where a banner sits on screen and how large its two lines of text are. */
export interface BannerOptions {
  x: number; // centre x of the banner, px
  y: number; // centre y of the banner, px
  titleSize: number; // font size of the title line, px
  subtitleSize: number; // font size of the subtitle line, px
}

/** A centred message on a dark rounded panel. `show` starts a message and `update` runs its pop-in, countdown and fade-out. */
export class Banner {
  private readonly container: Phaser.GameObjects.Container; // holds the panel and both texts, so they scale and fade as one
  private readonly panel: Phaser.GameObjects.Graphics; // dark rounded backdrop, redrawn to fit the text on every `show`
  private readonly title: Phaser.GameObjects.Text; // main line
  private readonly subtitle: Phaser.GameObjects.Text; // smaller line under the title; hidden when empty
  private remainingMs = 0; // time left before the banner hides, ms; 0 while nothing is showing
  private ageMs = 0; // time since `show` was called, ms; drives the pop-in

  /**
   * Creates the banner, hidden.
   *
   * @param scene - Scene the banner is added to.
   * @param options - Position and font sizes of the banner.
   */
  constructor(scene: Phaser.Scene, options: BannerOptions) {
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', labelStyle(options.titleSize)).setOrigin(0.5);
    this.subtitle = scene.add.text(0, 0, '', labelStyle(options.subtitleSize)).setOrigin(0.5);
    // Depth 60 puts the banner above the HUD (50) and the touch pad (45), but below the pause overlay (100).
    this.container = scene.add.container(options.x, options.y, [this.panel, this.title, this.subtitle]).setDepth(60).setVisible(false);
  }

  /**
   * Shows the message for `durationMs`, including its pop-in and fade-out. The subtitle may be empty.
   *
   * @param title - Main line of text.
   * @param subtitle - Smaller second line; an empty string hides that line and shrinks the panel to fit.
   * @param durationMs - Total time the banner stays up, in ms, counting the pop-in and the fade-out.
   */
  show(title: string, subtitle: string, durationMs: number): void {
    const hasSubtitle = subtitle !== '';
    this.title.setText(title);
    this.subtitle.setText(subtitle).setVisible(hasSubtitle);

    // Stack the lines around the container's centre, then size the panel to wrap them.
    // `height` is the text block: the title, plus the gap and the subtitle when there is one.
    const height = this.title.height + (hasSubtitle ? this.subtitle.height + LINE_GAP : 0);
    this.title.setY(-height / 2 + this.title.height / 2);
    this.subtitle.setY(height / 2 - this.subtitle.height / 2);
    // The panel is as wide as the wider line plus padding, and reaches PADDING_Y above and below the text block.
    const width = Math.max(this.title.width, hasSubtitle ? this.subtitle.width : 0) + PADDING_X * 2;
    const left = -width / 2;
    const top = -height / 2 - PADDING_Y;
    const panelHeight = height + PADDING_Y * 2;
    // Translucent dark fill (78% opaque) with a faint white outline; both use 22 px rounded corners.
    this.panel
      .clear()
      .fillStyle(COLOR.night, 0.78)
      .fillRoundedRect(left, top, width, panelHeight, 22)
      .lineStyle(4, 0xffffff, 0.35)
      .strokeRoundedRect(left, top, width, panelHeight, 22);

    this.remainingMs = durationMs;
    this.ageMs = 0;
    // Starts at 70% size and fully opaque; `update` grows it to full size.
    this.container.setVisible(true).setAlpha(1).setScale(0.7);
  }

  /** Hides the banner at once and cancels its countdown. */
  hide(): void {
    this.remainingMs = 0;
    this.container.setVisible(false);
  }

  /**
   * Counts the message down: pops it in at first, fades it out at the end and hides it when time runs out.
   * Does nothing while no message is showing.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  update(deltaMs: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs -= deltaMs;
    this.ageMs += deltaMs;
    if (this.remainingMs <= 0) {
      this.hide();
      return;
    }
    // Grows from 70% to full size over POP_MS, overshooting slightly on the way.
    this.container.setScale(0.7 + 0.3 * easeOutBack(this.ageMs / POP_MS));
    // Fully opaque until the last FADE_MS, then fades out linearly.
    this.container.setAlpha(Math.min(1, this.remainingMs / FADE_MS));
  }
}
