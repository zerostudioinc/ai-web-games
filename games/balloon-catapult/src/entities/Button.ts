/**
 * A rounded, clickable button with hover and press feedback, used on every menu screen.
 */
import Phaser from 'phaser';
import { COLOR, labelStyle, shade } from '../style';

/** Settings for a `Button`. */
export interface ButtonOptions {
  width: number; // px
  height: number; // px
  label: string; // main text
  subLabel?: string; // optional smaller text under the main label
  fontSize?: number; // main label size in px; defaults to 32
  color?: number; // face colour as 0xRRGGBB; defaults to light blue
  onClick: () => void; // called on a full click (press and release on the button)
}

/** Rounded button drawn from shapes, with hover and press feedback. */
export class Button extends Phaser.GameObjects.Container {
  /**
   * Draws the button and wires up its pointer events.
   *
   * @param scene - Scene the button is added to.
   * @param x - Centre x in px.
   * @param y - Centre y in px.
   * @param options - Size, text, colour and click handler.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    const { width, height, label, subLabel, onClick } = options;
    const fontSize = options.fontSize ?? 32;
    const color = options.color ?? 0x4fc3f7;
    // The container's origin is its centre, so shapes are drawn relative to the top-left corner at (-w/2, -h/2).
    const left = -width / 2;
    const top = -height / 2;

    // Layered rounded rectangles: drop shadow, dark base, face, top gloss, then the outline.
    const art = scene.make.graphics({}, false);
    art.fillStyle(0x000000, 0.3).fillRoundedRect(left, top + 6, width, height, 18);
    art.fillStyle(shade(color, 0.7)).fillRoundedRect(left, top, width, height, 18);
    art.fillStyle(color).fillRoundedRect(left + 3, top + 3, width - 6, height - 10, 15);
    art.fillStyle(0xffffff, 0.25).fillRoundedRect(left + 8, top + 7, width - 16, (height - 10) / 2 - 4, 10);
    art.lineStyle(3, COLOR.ink).strokeRoundedRect(left, top, width, height, 18);
    this.add(art);

    // With a sub-label the main label moves up to make room for it.
    const labelY = subLabel ? -height * 0.14 : -2;
    this.add(scene.make.text({ x: 0, y: labelY, text: label, style: { ...labelStyle(fontSize), align: 'center' } }, false).setOrigin(0.5));
    if (subLabel) {
      this.add(scene.make.text({ x: 0, y: height * 0.28, text: subLabel, style: labelStyle(Math.round(fontSize * 0.42)) }, false).setOrigin(0.5));
    }

    this.setSize(width, height);
    // Container hit areas are measured from the top-left corner, not the centre.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    // Hover grows the button, press shrinks it, and a click only counts if the press started on this button.
    let pressed = false;
    this.on(Phaser.Input.Events.POINTER_OVER, () => this.setScale(1.06));
    // Leaving the button cancels a press in progress.
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      pressed = false;
      this.setScale(1);
    });
    // Pressing starts a potential click.
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      pressed = true;
      this.setScale(0.96);
    });
    // Releasing on the button completes the click, but only if the press began here.
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      this.setScale(1.06);
      if (!pressed) return;
      pressed = false;
      onClick();
    });

    scene.add.existing(this);
  }

  /**
   * Turns pointer input on or off, e.g. while an overlay covers the button.
   *
   * @param enabled - True to accept clicks and touches.
   * @returns This button, so calls can be chained.
   */
  setEnabled(enabled: boolean): this {
    if (this.input) this.input.enabled = enabled;
    return this;
  }
}
