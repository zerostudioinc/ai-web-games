// Edge-detected controller input for menu screens, across every connected controller.
import type Phaser from 'phaser';
import { stickDirection } from './padDirection';

const MAX_PADS = 4;
const FACE_BUTTONS = [0, 1, 2, 3] as const; // A, B, X and Y on a standard controller
const SELECT_BUTTON = 8; // Back / View
const START_BUTTON = 9;

const KEYS = ['confirm', 'select', 'start', 'left', 'right', 'up', 'down'] as const;
export type MenuPadEvents = Record<(typeof KEYS)[number], boolean>;

const noEvents = (): MenuPadEvents => ({ confirm: false, select: false, start: false, left: false, right: false, up: false, down: false });

export class MenuPadInput {
  private held: MenuPadEvents;

  constructor(private readonly scene: Phaser.Scene) {
    // Whatever is held when the screen opens must not count as a press.
    this.held = this.read();
  }

  /** Which inputs went down since the last call. A held button reports once, not every frame. */
  poll(): MenuPadEvents {
    const now = this.read();
    const events = noEvents();
    for (const key of KEYS) events[key] = now[key] && !this.held[key];
    this.held = now;
    return events;
  }

  /** Reads what is held right now, merged across all connected controllers. */
  private read(): MenuPadEvents {
    const state = noEvents();
    for (let i = 0; i < MAX_PADS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;

      if (FACE_BUTTONS.some((button) => pad.buttons[button]?.pressed)) state.confirm = true;
      if (pad.buttons[SELECT_BUTTON]?.pressed) state.select = true;
      if (pad.buttons[START_BUTTON]?.pressed) state.start = true;

      const stick = stickDirection(pad.leftStick.x, pad.leftStick.y);
      if (pad.left || stick === 'left') state.left = true;
      if (pad.right || stick === 'right') state.right = true;
      if (pad.up || stick === 'up') state.up = true;
      if (pad.down || stick === 'down') state.down = true;
    }
    return state;
  }
}
