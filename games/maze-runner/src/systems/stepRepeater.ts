/**
 * Turns held directions into discrete steps: one on press, then auto-repeat while the key stays down.
 */
import { DIRECTIONS, type Direction } from './maze';

/** Which of the four directions are currently held. */
export type DirectionFlags = Record<Direction, boolean>;

/**
 * Creates a flag set with every direction released.
 *
 * @returns A fresh object (never shared) with all four directions false.
 */
export const noDirections = (): DirectionFlags => ({ up: false, right: false, down: false, left: false });

/** Converts the directions held each frame into single steps, with a hold delay and then a repeat rate. */
export class StepRepeater {
  private previous = noDirections(); // directions that were live at the previous update, to spot fresh presses
  /** Directions that were down when discard() ran; ignored until they have been released. */
  private suppressed = noDirections();
  private active: Direction | null = null; // the direction currently auto-repeating, if any
  private pending: Direction | null = null; // the step waiting for `take()`
  private timerMs = 0; // time left until the next repeat

  /**
   * Creates a repeater with the given timing.
   *
   * @param delayMs - How long a held direction waits, in ms, before it starts repeating.
   * @param intervalMs - Time between repeats after that, in ms.
   */
  constructor(
    private readonly delayMs: number,
    private readonly intervalMs: number,
  ) {}

  /**
   * Feeds the directions currently held; call once per frame.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   * @param held - Which directions are held right now, from any input source.
   */
  update(deltaMs: number, held: DirectionFlags): void {
    // A direction ignored by discard() counts again only once it has been let go.
    const live = noDirections();
    for (const direction of DIRECTIONS) {
      if (!held[direction]) this.suppressed[direction] = false;
      live[direction] = held[direction] && !this.suppressed[direction];
    }

    // When several keys go down in the same frame the later one in DIRECTIONS order wins.
    let pressed: Direction | null = null;
    for (const direction of DIRECTIONS) {
      if (live[direction] && !this.previous[direction]) pressed = direction;
    }
    this.previous = live;

    if (pressed) {
      // A fresh press steps straight away and restarts the hold delay.
      this.active = pressed;
      this.pending = pressed;
      this.timerMs = this.delayMs;
      return;
    }

    if (this.active && !live[this.active]) {
      // The active key came up: carry on with another one that is still held, if any.
      this.active = DIRECTIONS.find((direction) => live[direction]) ?? null;
      this.timerMs = this.delayMs;
    }
    if (!this.active) return;

    this.timerMs -= deltaMs;
    if (this.timerMs <= 0) {
      this.pending = this.active;
      this.timerMs = this.intervalMs;
    }
  }

  /**
   * The step waiting to be taken, if any. The caller decides when it is ready to move.
   *
   * @returns The direction to step in, or null when nothing is waiting; a step is handed out only once.
   */
  take(): Direction | null {
    const step = this.pending;
    this.pending = null;
    return step;
  }

  /**
   * Drops any waiting step and stops repeating. Keys still held stay ignored, even if another key is
   * tapped meanwhile, until they are released and pressed again, so nothing fires by surprise after a pause or a banner.
   */
  discard(): void {
    this.active = null;
    this.pending = null;
    for (const direction of DIRECTIONS) {
      this.suppressed[direction] = this.suppressed[direction] || this.previous[direction];
    }
  }
}
