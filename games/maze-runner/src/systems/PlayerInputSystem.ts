// Gathers keyboard, controller and touch pad input into discrete maze steps plus an Esc/P pause press.
// A controller's Start button is read by MenuPadInput instead. Call poll() once per frame, then read takeStep() and pausePressed.
import Phaser from 'phaser';
import { REPEAT_DELAY_MS, REPEAT_MS } from '../config';
import { DIRECTIONS, type Direction } from './maze';
import { stickDirection } from './padDirection';
import { StepRepeater, noDirections, type DirectionFlags } from './stepRepeater';

const MAX_PADS = 4;
const { KeyCodes } = Phaser.Input.Keyboard;

export class PlayerInputSystem {
  private readonly repeater = new StepRepeater(REPEAT_DELAY_MS, REPEAT_MS);
  private readonly directionKeys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private readonly pauseKeys: Phaser.Input.Keyboard.Key[];
  /** Keys that went down since the last frame, even if they are already up again. */
  private readonly tapped = noDirections();
  private pauseTapped = false;
  private pauseEdge = false;

  /**
   * @param touch reports the directions held on the on-screen pad; it is asked once per frame like any other source
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly touch: () => DirectionFlags,
  ) {
    const keyboard = scene.input.keyboard;
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

  poll(deltaMs: number): void {
    const touched = this.touch();
    const held = noDirections();
    for (const direction of DIRECTIONS) {
      held[direction] = this.tapped[direction] || touched[direction] || this.directionKeys[direction].some((key) => key.isDown);
      this.tapped[direction] = false;
    }

    // Any connected controller can steer, with the D-pad or the left stick.
    for (let i = 0; i < MAX_PADS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;
      if (pad.up) held.up = true;
      if (pad.right) held.right = true;
      if (pad.down) held.down = true;
      if (pad.left) held.left = true;
      const stick = stickDirection(pad.leftStick.x, pad.leftStick.y);
      if (stick) held[stick] = true;
    }

    this.pauseEdge = this.pauseTapped;
    this.pauseTapped = false;
    this.repeater.update(deltaMs, held);
  }

  /** The step waiting to be taken, if any. */
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
