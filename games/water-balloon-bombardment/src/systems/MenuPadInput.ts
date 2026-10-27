import type Phaser from 'phaser';
import { MAX_PLAYERS } from '../config';
import { isFireButtonDown } from './PlayerInputSystem';

const STICK_THRESHOLD = 0.5;

export interface MenuPadEvents {
  confirm: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  connectedCount: number;
}

/** Edge-detected controller input for menu screens, across every connected controller. */
export class MenuPadInput {
  private confirmDown: boolean;
  private leftDown: boolean;
  private rightDown: boolean;
  private upDown: boolean;
  private downDown: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    // Whatever is held when the screen opens must not count as a press.
    const held = this.read();
    this.confirmDown = held.confirm;
    this.leftDown = held.left;
    this.rightDown = held.right;
    this.upDown = held.up;
    this.downDown = held.down;
  }

  poll(): MenuPadEvents {
    const now = this.read();
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

  private read(): MenuPadEvents {
    const state: MenuPadEvents = { confirm: false, left: false, right: false, up: false, down: false, connectedCount: 0 };
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;
      state.connectedCount += 1;
      if (isFireButtonDown(pad)) state.confirm = true;
      if (pad.left || pad.leftStick.x < -STICK_THRESHOLD) state.left = true;
      if (pad.right || pad.leftStick.x > STICK_THRESHOLD) state.right = true;
      if (pad.up || pad.leftStick.y < -STICK_THRESHOLD) state.up = true;
      if (pad.down || pad.leftStick.y > STICK_THRESHOLD) state.down = true;
    }
    return state;
  }
}
