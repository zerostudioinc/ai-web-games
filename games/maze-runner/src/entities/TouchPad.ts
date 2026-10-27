// On-screen direction pad for touch devices. It records which directions are held; the input system samples that every frame.
import Phaser from 'phaser';
import { TOUCH_PAD, TextureKey } from '../config';
import { DIRECTIONS, type Direction } from '../systems/maze';
import { noDirections, type DirectionFlags } from '../systems/stepRepeater';

const DEPTH = 45;
const IDLE_ALPHA = 0.85;

// Offset from the pad's centre (in key spacings) and rotation of the up-arrow texture for each key.
const KEY_LAYOUT: Record<Direction, { dx: number; dy: number; angle: number }> = {
  up: { dx: 0, dy: -1, angle: 0 },
  right: { dx: 1, dy: 0, angle: 90 },
  down: { dx: 0, dy: 1, angle: 180 },
  left: { dx: -1, dy: 0, angle: 270 },
};

export class TouchPad {
  /** Directions currently pressed on the pad. */
  private readonly held = noDirections();
  /** Directions pressed since the last sample, even if the finger has already lifted. */
  private readonly latched = noDirections();
  private readonly keys: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, visible: boolean) {
    const spacing = TOUCH_PAD.buttonSize + TOUCH_PAD.gap;
    for (const direction of DIRECTIONS) {
      const { dx, dy, angle } = KEY_LAYOUT[direction];
      const key = scene.add
        .image(TOUCH_PAD.x + dx * spacing, TOUCH_PAD.y + dy * spacing, TextureKey.DpadButton)
        .setAngle(angle)
        .setAlpha(IDLE_ALPHA)
        .setDepth(DEPTH)
        .setInteractive();

      // Sliding a finger off a key releases it, so a direction can never stay stuck on.
      const press = (): void => {
        this.held[direction] = true;
        this.latched[direction] = true;
        key.setScale(0.92).setAlpha(1);
      };
      const release = (): void => {
        this.held[direction] = false;
        key.setScale(1).setAlpha(IDLE_ALPHA);
      };
      key.on(Phaser.Input.Events.POINTER_DOWN, press);
      // A finger sliding in from a neighbouring key presses this one too.
      key.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) press();
      });
      key.on(Phaser.Input.Events.POINTER_UP, release);
      key.on(Phaser.Input.Events.POINTER_OUT, release);
      this.keys.push(key);
    }
    this.setVisible(visible);
  }

  /**
   * What is pressed right now, plus any key tapped and lifted since the previous call.
   * The extra latch means a quick tap that starts and ends between two frames still counts.
   */
  sample(): DirectionFlags {
    const flags = noDirections();
    for (const direction of DIRECTIONS) {
      flags[direction] = this.held[direction] || this.latched[direction];
      this.latched[direction] = false;
    }
    return flags;
  }

  /** Shows or hides the pad; hidden keys also stop reacting to touches. */
  setVisible(visible: boolean): void {
    for (const key of this.keys) {
      key.setVisible(visible);
      if (key.input) key.input.enabled = visible;
    }
    if (!visible) this.release();
  }

  /** Lets go of every key, e.g. when the game pauses. */
  release(): void {
    for (const direction of DIRECTIONS) {
      this.held[direction] = false;
      this.latched[direction] = false;
    }
    for (const key of this.keys) key.setScale(1).setAlpha(IDLE_ALPHA);
  }
}
