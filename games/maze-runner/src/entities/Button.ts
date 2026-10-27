// A chunky rounded button that works with mouse, touch and (through the scene) keyboard and controller.
import Phaser from 'phaser';
import { COLOR, labelStyle, shade } from '../style';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  subLabel?: string;
  fontSize?: number;
  color?: number;
  onClick: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    const { width, height, label, subLabel, onClick } = options;
    const fontSize = options.fontSize ?? 32;
    const color = options.color ?? 0x4fc3f7;
    const left = -width / 2;
    const top = -height / 2;

    // Layered shapes: drop shadow, dark base, bright face and a glossy highlight.
    const art = scene.make.graphics({}, false);
    art.fillStyle(0x000000, 0.3).fillRoundedRect(left, top + 6, width, height, 18);
    art.fillStyle(shade(color, 0.7)).fillRoundedRect(left, top, width, height, 18);
    art.fillStyle(color).fillRoundedRect(left + 3, top + 3, width - 6, height - 10, 15);
    art.fillStyle(0xffffff, 0.25).fillRoundedRect(left + 8, top + 7, width - 16, (height - 10) / 2 - 4, 10);
    art.lineStyle(3, COLOR.ink).strokeRoundedRect(left, top, width, height, 18);
    this.add(art);

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

    // Only a press that started on the button and ends on it counts as a click.
    let pressed = false;
    this.on(Phaser.Input.Events.POINTER_OVER, () => this.setScale(1.06));
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      pressed = false;
      this.setScale(1);
    });
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      pressed = true;
      this.setScale(0.96);
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      this.setScale(1.06);
      if (!pressed) return;
      pressed = false;
      onClick();
    });

    scene.add.existing(this);
  }

  /** Turns pointer input on or off, so a hidden button cannot be clicked. */
  setEnabled(enabled: boolean): this {
    if (this.input) this.input.enabled = enabled;
    return this;
  }
}
