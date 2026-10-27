// Turns held directions into discrete steps: one on press, then auto-repeat while the key stays down.
import { DIRECTIONS, type Direction } from './maze';

export type DirectionFlags = Record<Direction, boolean>;

export const noDirections = (): DirectionFlags => ({ up: false, right: false, down: false, left: false });

export class StepRepeater {
  private previous = noDirections();
  /** Directions that were down when discard() ran; ignored until they have been released. */
  private suppressed = noDirections();
  private active: Direction | null = null;
  private pending: Direction | null = null;
  private timerMs = 0;

  /**
   * @param delayMs how long a held direction waits before it starts repeating
   * @param intervalMs time between repeats after that
   */
  constructor(
    private readonly delayMs: number,
    private readonly intervalMs: number,
  ) {}

  /** Feed the directions currently held; call once per frame. */
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

  /** The step waiting to be taken, if any. The caller decides when it is ready to move. */
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
