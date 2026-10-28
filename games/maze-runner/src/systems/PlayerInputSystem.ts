/**
 * Gathers the keys, controllers and touch pad that steer one player into discrete maze steps.
 * Call poll() once per frame, then read takeStep(). Pausing (Esc, P or a controller's Start) is read by the scene instead.
 */
import Phaser from 'phaser';
import { REPEAT_DELAY_MS, REPEAT_MS } from '../config';
import type { KeyScheme } from './controls';
import { DIRECTIONS, type Direction } from './maze';
import { stickDirection } from './padDirection';
import { StepRepeater, noDirections, type DirectionFlags } from './stepRepeater';

const { KeyCodes } = Phaser.Input.Keyboard; // Phaser's named key codes

/** The key code of each direction in each key set. */
const KEY_CODES: Record<KeyScheme, Record<Direction, number>> = {
  wasd: { up: KeyCodes.W, right: KeyCodes.D, down: KeyCodes.S, left: KeyCodes.A },
  arrows: { up: KeyCodes.UP, right: KeyCodes.RIGHT, down: KeyCodes.DOWN, left: KeyCodes.LEFT },
};

/** Everything that steers one player. */
export interface InputSources {
  keys: readonly KeyScheme[]; // the key sets that steer the player
  pads: readonly number[]; // the controller slots that steer the player
  touch: () => DirectionFlags; // the directions held on the player's on-screen pad; it is asked once per frame like any other source
}

/** Combines one player's input sources into one step at a time for the maze runner. */
export class PlayerInputSystem {
  private readonly repeater = new StepRepeater(REPEAT_DELAY_MS, REPEAT_MS); // turns held directions into steps with auto-repeat
  private readonly directionKeys: Record<Direction, Phaser.Input.Keyboard.Key[]>; // the player's keys for each direction
  /** Keys that went down since the last frame, even if they are already up again. */
  private readonly tapped = noDirections();

  /**
   * Registers the player's keys and starts listening for quick taps.
   *
   * @param scene - Scene whose keyboard and gamepad plugins are used.
   * @param sources - The key sets, controller slots and touch pad that steer this player.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sources: InputSources,
  ) {
    const keyboard = scene.input.keyboard;
    /**
     * Registers the player's keys for one direction, one for each key set.
     *
     * @param direction - The direction the keys steer.
     * @returns The registered keys; empty when keyboard input is unavailable.
     */
    const keysFor = (direction: Direction): Phaser.Input.Keyboard.Key[] =>
      keyboard ? sources.keys.map((scheme) => keyboard.addKey(KEY_CODES[scheme][direction])) : [];
    this.directionKeys = { up: keysFor('up'), right: keysFor('right'), down: keysFor('down'), left: keysFor('left') };

    // A quick tap can go down and up between two frames, which polling alone would never see, so each press is remembered.
    for (const direction of DIRECTIONS) {
      for (const key of this.directionKeys[direction]) {
        key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
          this.tapped[direction] = true;
        });
      }
    }
  }

  /**
   * Reads every input source for this frame and feeds the combined held directions to the repeater.
   * Call once per frame, before `takeStep()`.
   *
   * @param deltaMs - Time since the previous frame, in ms; drives the auto-repeat timing.
   */
  poll(deltaMs: number): void {
    const touched = this.sources.touch();
    const held = noDirections();
    // A direction is held if it was tapped since the last frame, the touch pad is down, or one of its keys is down.
    for (const direction of DIRECTIONS) {
      held[direction] = this.tapped[direction] || touched[direction] || this.directionKeys[direction].some((key) => key.isDown);
      this.tapped[direction] = false; // the tap has now been seen
    }

    // Any of the player's controllers can steer, with the D-pad or the left stick. Phaser keeps the last reading of a controller
    // that was switched off or unplugged, which would hold a direction down for good, so the browser's own list says who is there.
    const listed = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (const slot of this.sources.pads) {
      const pad = this.scene.input.gamepad?.getPad(slot);
      if (!pad?.connected || !listed[slot]?.connected) continue;
      if (pad.up) held.up = true;
      if (pad.right) held.right = true;
      if (pad.down) held.down = true;
      if (pad.left) held.left = true;
      // The stick counts as one direction at most, once it is pushed far enough.
      const stick = stickDirection(pad.leftStick.x, pad.leftStick.y);
      if (stick) held[stick] = true;
    }

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

  /** Hands the player's keys back so none is left registered after the scene ends. */
  dispose(): void {
    const keyboard = this.scene.input.keyboard;
    for (const key of DIRECTIONS.flatMap((direction) => this.directionKeys[direction])) {
      keyboard?.removeKey(key, true);
    }
  }
}
