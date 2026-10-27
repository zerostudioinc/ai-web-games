/**
 * Gathers keyboard, controller and touch pad input into discrete maze steps plus an Esc/P pause press.
 * A controller's Start button is read by MenuPadInput instead. Call poll() once per frame, then read takeStep() and pausePressed.
 */
import Phaser from 'phaser';
import { REPEAT_DELAY_MS, REPEAT_MS } from '../config';
import { DIRECTIONS, type Direction } from './maze';
import { stickDirection } from './padDirection';
import { StepRepeater, noDirections, type DirectionFlags } from './stepRepeater';

const MAX_PADS = 4; // how many controller slots are checked
const { KeyCodes } = Phaser.Input.Keyboard; // Phaser's named key codes

/** Combines every input source into one step at a time for the maze runner. */
export class PlayerInputSystem {
  private readonly repeater = new StepRepeater(REPEAT_DELAY_MS, REPEAT_MS); // turns held directions into steps with auto-repeat
  private readonly directionKeys: Record<Direction, Phaser.Input.Keyboard.Key[]>; // arrow and WASD keys for each direction
  private readonly pauseKeys: Phaser.Input.Keyboard.Key[]; // Esc and P
  /** Keys that went down since the last frame, even if they are already up again. */
  private readonly tapped = noDirections();
  private pauseTapped = false; // Esc or P went down since the last poll
  private pauseEdge = false; // true for the one frame in which a pause press was seen

  /**
   * Registers the keys and starts listening for quick taps.
   *
   * @param scene - Scene whose keyboard and gamepad plugins are used.
   * @param touch - Reports the directions held on the on-screen pad; it is asked once per frame like any other source.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly touch: () => DirectionFlags,
  ) {
    const keyboard = scene.input.keyboard;
    /**
     * Registers a set of keys with the keyboard plugin.
     *
     * @param codes - Phaser key codes to register.
     * @returns The registered keys; empty when keyboard input is unavailable.
     */
    const keysFor = (codes: readonly number[]): Phaser.Input.Keyboard.Key[] => (keyboard ? codes.map((code) => keyboard.addKey(code)) : []);

    // Arrow keys and WASD both steer.
    this.directionKeys = {
      up: keysFor([KeyCodes.UP, KeyCodes.W]),
      right: keysFor([KeyCodes.RIGHT, KeyCodes.D]),
      down: keysFor([KeyCodes.DOWN, KeyCodes.S]),
      left: keysFor([KeyCodes.LEFT, KeyCodes.A]),
    };
    this.pauseKeys = keysFor([KeyCodes.ESC, KeyCodes.P]);

    // A quick tap can go down and up between two frames, which polling alone would never see, so each press is remembered.
    for (const direction of DIRECTIONS) {
      for (const key of this.directionKeys[direction]) {
        key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
          this.tapped[direction] = true;
        });
      }
    }
    for (const key of this.pauseKeys) {
      key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
        this.pauseTapped = true;
      });
    }
  }

  /** True for the one frame in which Esc or P went down. */
  get pausePressed(): boolean {
    return this.pauseEdge;
  }

  /**
   * Reads every input source for this frame and feeds the combined held directions to the repeater.
   * Call once per frame, before `takeStep()` and `pausePressed`.
   *
   * @param deltaMs - Time since the previous frame, in ms; drives the auto-repeat timing.
   */
  poll(deltaMs: number): void {
    const touched = this.touch();
    const held = noDirections();
    // A direction is held if it was tapped since the last frame, the touch pad is down, or one of its keys is down.
    for (const direction of DIRECTIONS) {
      held[direction] = this.tapped[direction] || touched[direction] || this.directionKeys[direction].some((key) => key.isDown);
      this.tapped[direction] = false; // the tap has now been seen
    }

    // Any connected controller can steer, with the D-pad or the left stick.
    for (let i = 0; i < MAX_PADS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;
      if (pad.up) held.up = true;
      if (pad.right) held.right = true;
      if (pad.down) held.down = true;
      if (pad.left) held.left = true;
      // The stick counts as one direction at most, once it is pushed far enough.
      const stick = stickDirection(pad.leftStick.x, pad.leftStick.y);
      if (stick) held[stick] = true;
    }

    // Publish the pause press for this frame only, then clear the latch.
    this.pauseEdge = this.pauseTapped;
    this.pauseTapped = false;
    this.repeater.update(deltaMs, held);
  }

  /**
   * The step waiting to be taken, if any.
   *
   * @returns The direction to step in, or null when no step is waiting; a step is handed out only once.
   */
  takeStep(): Direction | null {
    return this.repeater.take();
  }

  /** Throws away waiting steps; held keys must be released and pressed again before they count. */
  discard(): void {
    this.repeater.discard();
  }

  /** Hands the keys back so none is left registered after the scene ends. */
  dispose(): void {
    const keyboard = this.scene.input.keyboard;
    for (const key of [...this.pauseKeys, ...DIRECTIONS.flatMap((direction) => this.directionKeys[direction])]) {
      keyboard?.removeKey(key, true);
    }
  }
}
