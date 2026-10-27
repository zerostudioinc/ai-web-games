/**
 * Controller input for the menu screens, shared by every menu scene.
 */
import type Phaser from 'phaser';
import { MAX_PLAYERS } from '../config';
import { isFireButtonDown } from './PlayerInputSystem';

/** How far a stick must be pushed (0 to 1) before it counts as a menu direction. */
const STICK_THRESHOLD = 0.5;

/**
 * Menu-relevant controller state. From `MenuPadInput.poll()` each flag is a fresh press this frame;
 * the raw `read()` result uses the same shape for the currently held state.
 */
export interface MenuPadEvents {
  confirm: boolean; // any fire button
  left: boolean; // D-pad or stick pushed left
  right: boolean; // D-pad or stick pushed right
  up: boolean; // D-pad or stick pushed up
  down: boolean; // D-pad or stick pushed down
  connectedCount: number; // how many controllers are connected
}

/** Edge-detected controller input for menu screens, across every connected controller. */
export class MenuPadInput {
  // Whether each input was held at the previous poll; used to turn "held" into "just pressed".
  private confirmDown: boolean; // any fire button
  private leftDown: boolean; // D-pad or stick left
  private rightDown: boolean; // D-pad or stick right
  private upDown: boolean; // D-pad or stick up
  private downDown: boolean; // D-pad or stick down

  /**
   * Creates the poller and records what is already held so it is not reported as a press.
   *
   * @param scene - The menu scene whose gamepad plugin is polled.
   */
  constructor(private readonly scene: Phaser.Scene) {
    // Whatever is held when the screen opens must not count as a press.
    const held = this.read();
    this.confirmDown = held.confirm;
    this.leftDown = held.left;
    this.rightDown = held.right;
    this.upDown = held.up;
    this.downDown = held.down;
  }

  /**
   * Reads the controllers and reports which inputs went down since the previous call.
   * Call once per frame.
   *
   * @returns Fresh presses this frame, plus the number of connected controllers.
   */
  poll(): MenuPadEvents {
    const now = this.read();
    // A press is "down now but not down last time".
    const events: MenuPadEvents = {
      confirm: now.confirm && !this.confirmDown,
      left: now.left && !this.leftDown,
      right: now.right && !this.rightDown,
      up: now.up && !this.upDown,
      down: now.down && !this.downDown,
      connectedCount: now.connectedCount,
    };
    this.confirmDown = now.confirm;
    this.leftDown = now.left;
    this.rightDown = now.right;
    this.upDown = now.up;
    this.downDown = now.down;
    return events;
  }

  /**
   * Merges the live state of every connected controller, so any pad can drive the menu.
   *
   * @returns The currently held (not edge-detected) state of each menu input.
   */
  private read(): MenuPadEvents {
    const state: MenuPadEvents = { confirm: false, left: false, right: false, up: false, down: false, connectedCount: 0 };
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;
      state.connectedCount += 1;
      if (isFireButtonDown(pad)) state.confirm = true;
      // The D-pad and the left stick both count as a direction; stick y is negative when pushed up.
      if (pad.left || pad.leftStick.x < -STICK_THRESHOLD) state.left = true;
      if (pad.right || pad.leftStick.x > STICK_THRESHOLD) state.right = true;
      if (pad.up || pad.leftStick.y < -STICK_THRESHOLD) state.up = true;
      if (pad.down || pad.leftStick.y > STICK_THRESHOLD) state.down = true;
    }
    return state;
  }
}
