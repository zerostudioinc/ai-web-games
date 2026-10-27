/**
 * Edge-detected controller input for menu screens, across every connected controller.
 */
import type Phaser from 'phaser';
import { stickDirection } from './padDirection';

/** Number of controller slots that are polled. */
const MAX_PADS = 4;
// Button indices of the standard gamepad mapping.
const FACE_BUTTONS = [0, 1, 2, 3] as const; // A, B, X and Y on a standard controller; any of them confirms
const SELECT_BUTTON = 8; // Back / View
const START_BUTTON = 9;

/** The menu actions a controller can trigger. */
const KEYS = ['confirm', 'select', 'start', 'left', 'right', 'up', 'down'] as const;
/**
 * One flag per menu action: `confirm` is any face button, `select` and `start` are the Back / View and Start buttons,
 * and the four directions come from the D-pad or the left stick.
 */
export type MenuPadEvents = Record<(typeof KEYS)[number], boolean>;

/**
 * A fresh event set with every action off.
 *
 * @returns An object whose flags are all false.
 */
const noEvents = (): MenuPadEvents => ({ confirm: false, select: false, start: false, left: false, right: false, up: false, down: false });

/**
 * Reads every connected controller for menu navigation and reports each press once.
 * Call `poll()` every frame, even when the result is unused, so the held-state baseline never goes stale.
 */
export class MenuPadInput {
  private held: MenuPadEvents; // what was held at the previous poll, used to spot new presses

  /**
   * Snapshots what is already held, so a button down when the screen opens is not reported as a press.
   *
   * @param scene - Scene whose gamepad plugin is read.
   */
  constructor(private readonly scene: Phaser.Scene) {
    // Whatever is held when the screen opens must not count as a press.
    this.held = this.read();
  }

  /**
   * Which inputs went down since the last call. A held button reports once, not every frame.
   *
   * @returns Flags that are true only for inputs pressed since the previous poll.
   */
  poll(): MenuPadEvents {
    const now = this.read();
    const events = noEvents();
    // A press is an input that is down now but was not down at the last poll.
    for (const key of KEYS) events[key] = now[key] && !this.held[key];
    this.held = now;
    return events;
  }

  /**
   * Reads what is held right now, merged across all connected controllers.
   *
   * @returns Flags that are true while any connected controller holds that input.
   */
  private read(): MenuPadEvents {
    const state = noEvents();
    for (let i = 0; i < MAX_PADS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      // Skip empty slots, and the case where the gamepad plugin is not available.
      if (!pad?.connected) continue;

      // Any face button confirms; a button missing from the pad's list counts as not pressed.
      if (FACE_BUTTONS.some((button) => pad.buttons[button]?.pressed)) state.confirm = true;
      if (pad.buttons[SELECT_BUTTON]?.pressed) state.select = true;
      if (pad.buttons[START_BUTTON]?.pressed) state.start = true;

      // The D-pad and the left stick both navigate; the stick counts once it is pushed far enough.
      const stick = stickDirection(pad.leftStick.x, pad.leftStick.y);
      if (pad.left || stick === 'left') state.left = true;
      if (pad.right || stick === 'right') state.right = true;
      if (pad.up || stick === 'up') state.up = true;
      if (pad.down || stick === 'down') state.down = true;
    }
    return state;
  }
}
