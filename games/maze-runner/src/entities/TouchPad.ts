/**
 * On-screen direction pad for touch devices. It records which directions are held; the input system samples that every frame.
 */
import Phaser from 'phaser';
import { TOUCH_PAD, TextureKey } from '../config';
import type { PadLayout } from '../systems/layout';
import { DIRECTIONS, type Direction } from '../systems/maze';
import { noDirections, type DirectionFlags } from '../systems/stepRepeater';

const DEPTH = 45; // draw order: above the maze and the runner, below the HUD (50)
const IDLE_ALPHA = 0.85; // opacity of a key that is not being pressed

/** Rotation, in degrees clockwise, that turns the up-arrow texture to point each way. */
const KEY_ANGLE: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 };

/**
 * Four arrow keys. It stores which directions are held or tapped; the input system reads them through `sample` every frame.
 */
export class TouchPad {
  /** Directions currently pressed on the pad. */
  private readonly held = noDirections();
  /** Directions pressed since the last sample, even if the finger has already lifted. */
  private readonly latched = noDirections();
  private readonly keys: Phaser.GameObjects.Image[] = []; // the four arrow buttons, in `DIRECTIONS` order
  private readonly keyScale: number; // size of a key relative to its texture, which is `TOUCH_PAD.buttonSize` px across

  /**
   * Builds the four arrow keys where `layout` puts them and wires up their touch events.
   *
   * @param scene - Scene the keys are added to.
   * @param visible - Whether the pad starts shown (true on touch devices); `setVisible` can reveal it later.
   * @param layout - Where the keys sit and how large they are.
   */
  constructor(scene: Phaser.Scene, visible: boolean, layout: PadLayout) {
    this.keyScale = layout.keySize / TOUCH_PAD.buttonSize;
    for (const direction of DIRECTIONS) {
      const { x, y } = layout.centers[direction];
      // All four keys share the up-arrow texture; each is rotated to point its own way.
      const key = scene.add
        .image(x, y, TextureKey.DpadButton)
        .setAngle(KEY_ANGLE[direction])
        .setScale(this.keyScale)
        .setAlpha(IDLE_ALPHA)
        .setDepth(DEPTH)
        .setInteractive();

      /** Marks this direction as held and latched (so even a very short tap is seen) and shows the key pressed in. */
      const press = (): void => {
        this.held[direction] = true;
        this.latched[direction] = true;
        key.setScale(this.keyScale * 0.92).setAlpha(1);
      };
      /** Clears the held state and restores the key's look. Sliding a finger off a key releases it, so a direction can never stay stuck on. */
      const release = (): void => {
        this.held[direction] = false;
        key.setScale(this.keyScale).setAlpha(IDLE_ALPHA);
      };
      // A touch or click on the key presses it.
      key.on(Phaser.Input.Events.POINTER_DOWN, press);
      // A finger sliding in from a neighbouring key presses this one too.
      key.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) press();
      });
      // Lifting the finger, or sliding off the key, releases it.
      key.on(Phaser.Input.Events.POINTER_UP, release);
      key.on(Phaser.Input.Events.POINTER_OUT, release);
      this.keys.push(key);
    }
    // Apply the starting visibility; this also switches input off on hidden keys.
    this.setVisible(visible);
  }

  /**
   * What is pressed right now, plus any key tapped and lifted since the previous call.
   * The extra latch means a quick tap that starts and ends between two frames still counts.
   *
   * @returns A fresh set of flags: true for each direction that is held now or was tapped since the last call.
   */
  sample(): DirectionFlags {
    const flags = noDirections();
    for (const direction of DIRECTIONS) {
      flags[direction] = this.held[direction] || this.latched[direction];
      // Reading the latch clears it, so each tap is reported once.
      this.latched[direction] = false;
    }
    return flags;
  }

  /**
   * Shows or hides the pad; hidden keys also stop reacting to touches.
   *
   * @param visible - True to show the pad and accept touches, false to hide it and ignore them.
   */
  setVisible(visible: boolean): void {
    for (const key of this.keys) {
      key.setVisible(visible);
      if (key.input) key.input.enabled = visible;
    }
    // A hidden pad must not leave a direction held.
    if (!visible) this.release();
  }

  /** Lets go of every key, e.g. when the game pauses: clears the held and latched directions and restores the keys' look. */
  release(): void {
    for (const direction of DIRECTIONS) {
      this.held[direction] = false;
      this.latched[direction] = false;
    }
    for (const key of this.keys) key.setScale(this.keyScale).setAlpha(IDLE_ALPHA);
  }
}
