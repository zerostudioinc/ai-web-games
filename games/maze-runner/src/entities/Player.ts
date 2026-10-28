/**
 * The runner on screen: glides between cells, plays the walk cycle, and reacts to bumps, traps and respawns.
 */
import type Phaser from 'phaser';
import { IDLE_FRAME, RUNNER_FIGURE_HEIGHT, runnerFrameKey, runnerWalkKey } from '../assets/runnerArt';
import { STEP_MS } from '../config';
import { cellCenter, type MazeLayout } from '../systems/layout';
import { stepCell, type Cell, type Direction } from '../systems/maze';

const DEPTH = 11; // above the maze walls, below the HUD; the shadow sits one level lower
/** The walk cycle keeps going this long after a step, so held keys read as one continuous run. */
const REST_MS = 70; // ms
const BUMP_MS = 110; // length of the nudge when walking into a wall, ms
const BLINK_MS = 90; // length of one on/off phase of the respawn blink, ms
const STUN_TINT = 0xff8a80; // reddish tint while reeling from a trap, 0xRRGGBB
const NO_STEP: Cell = { col: 0, row: 0 }; // the origin cell; stepping from it turns a direction into a column/row offset

/**
 * The runner as seen on screen. The scene says where to go (`moveTo`, `teleport`, `respawn`) and what happened
 * (`bump`, `stun`, `cheer`), and calls `update` every frame; the runner only animates and knows nothing of the maze rules.
 */
export class Player {
  private readonly sprite: Phaser.GameObjects.Sprite; // the figure, showing walk-cycle or standing frames
  private readonly shadow: Phaser.GameObjects.Ellipse; // dark oval on the floor under the runner's feet
  private readonly baseScale: number; // sprite scale that makes the figure fit the cell size

  // Where the runner is drawn, and the two ends of the step in progress (screen px).
  private x = 0; // drawn x of the runner, before the bump, shake and hop offsets
  private y = 0; // drawn y of the runner, before the offsets
  private fromX = 0; // x of the cell centre the current step started from
  private fromY = 0; // y of the cell centre the current step started from
  private toX = 0; // x of the cell centre the current step is heading to
  private toY = 0; // y of the cell centre the current step is heading to
  private stepMs = 0; // time spent on the current step, ms
  private moving = false; // true while gliding between two cells

  private facing: Direction = 'down'; // direction the figure faces
  private restMs = 0; // time left before the walk cycle stops after a step, ms
  private bumpMs = 0; // time left in the wall-bump nudge, ms
  private bumpDirection: Direction = 'down'; // direction the bump pushes toward
  private shakeMs = 0; // time left shaking after a trap, ms
  private blinkMs = 0; // time left blinking after a respawn, ms
  private cheerMs = 0; // time left hopping for joy, ms
  private clockMs = 0; // total time since creation, ms; drives the standing-still breathing

  /**
   * Creates the runner standing on `cell`, sized to fit the maze's cells.
   *
   * @param scene - Scene the runner and its shadow are added to.
   * @param layout - Maze layout; it turns cells into screen positions and sets the figure's size.
   * @param cell - Cell the runner starts on (0-based column and row).
   * @param variant - 0-based outfit: 0 for player one (and a solo runner), 1 for player two.
   */
  constructor(
    scene: Phaser.Scene,
    private readonly layout: MazeLayout,
    cell: Cell,
    private readonly variant = 0,
  ) {
    const size = layout.cellSize;
    // The figure fills most of a cell, whatever the maze size: 90% of the cell height.
    this.baseScale = (size * 0.9) / RUNNER_FIGURE_HEIGHT;
    // Soft oval under the feet, 55% of a cell wide, drawn one level below the figure.
    this.shadow = scene.add.ellipse(0, 0, size * 0.55, size * 0.2, 0x000000, 0.3).setDepth(DEPTH - 1);
    // Starts in the standing pose facing down; `teleport` below sets the real position.
    this.sprite = scene.add.sprite(0, 0, runnerFrameKey('down', IDLE_FRAME, variant)).setScale(this.baseScale).setDepth(DEPTH);
    this.teleport(cell);
  }

  /**
   * True while gliding between two cells; the scene waits for this to clear before accepting the next step.
   *
   * @returns Whether a step is in progress.
   */
  get isMoving(): boolean {
    return this.moving;
  }

  /**
   * Starts the glide to `cell`. It may lie outside the grid, which is how the runner walks out of the exit.
   *
   * @param cell - Destination cell (0-based column and row); it may lie one step outside the grid for the exit walk.
   * @param direction - Direction of travel; the figure turns to face it and plays that direction's walk cycle.
   */
  moveTo(cell: Cell, direction: Direction): void {
    const target = cellCenter(this.layout, cell);
    // The glide starts from wherever the runner is drawn now.
    this.fromX = this.x;
    this.fromY = this.y;
    this.toX = target.x;
    this.toY = target.y;
    this.stepMs = 0;
    this.moving = true;
    this.restMs = 0;
    this.facing = direction;
    // `true` keeps an already-running cycle going instead of restarting it on every step.
    this.sprite.anims.play(runnerWalkKey(direction, this.variant), true);
  }

  /**
   * Turns to face a wall and nudges toward it, to show the key press registered.
   *
   * @param direction - Direction of the blocked step; the figure turns this way and the nudge pushes this way.
   */
  bump(direction: Direction): void {
    this.facing = direction;
    this.bumpDirection = direction;
    this.bumpMs = BUMP_MS;
    // Show the standing pose for the new facing, unless a glide is playing its own walk cycle.
    if (!this.moving) this.settle();
  }

  /**
   * Reels from a trap: shakes and flushes red for `durationMs`.
   *
   * @param durationMs - How long the shaking lasts, in ms; the red tint is cleared when it ends.
   */
  stun(durationMs: number): void {
    this.shakeMs = durationMs;
    this.sprite.setTint(STUN_TINT);
  }

  /**
   * Places the runner on `cell` at once and clears every effect.
   *
   * @param cell - Cell to stand on (0-based column and row); the figure faces down afterwards.
   */
  teleport(cell: Cell): void {
    const target = cellCenter(this.layout, cell);
    this.x = this.fromX = this.toX = target.x;
    this.y = this.fromY = this.toY = target.y;
    this.moving = false;
    this.restMs = 0;
    this.bumpMs = 0;
    this.shakeMs = 0;
    this.blinkMs = 0;
    this.cheerMs = 0;
    this.facing = 'down';
    this.sprite.clearTint().setAlpha(1);
    this.settle();
  }

  /**
   * Back to `cell`, blinking for `blinkDurationMs` so the player can see where they restarted.
   *
   * @param cell - Cell to return to (0-based column and row), normally the maze's start.
   * @param blinkDurationMs - How long the runner blinks, in ms.
   */
  respawn(cell: Cell, blinkDurationMs: number): void {
    this.teleport(cell);
    this.blinkMs = blinkDurationMs;
  }

  /**
   * Hops for joy for `durationMs`.
   *
   * @param durationMs - How long the hopping lasts, in ms.
   */
  cheer(durationMs: number): void {
    this.cheerMs = durationMs;
    this.settle();
  }

  /**
   * Freezes or resumes the walk cycle; Phaser runs animations outside the scene's own update, so pausing needs this.
   *
   * @param paused - True to freeze the walk cycle, false to let it continue.
   */
  setPaused(paused: boolean): void {
    if (paused) this.sprite.anims.pause();
    else this.sprite.anims.resume();
  }

  /**
   * Advances the glide and every short effect, then places the sprite and its shadow. Call once per frame.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  update(deltaMs: number): void {
    const size = this.layout.cellSize;
    this.clockMs += deltaMs;

    let hop = 0; // upward lift of the sprite this frame, px; the stride bounce and the cheer hop add to it
    if (this.moving) {
      // Glide: move a straight line from the old cell centre to the new one, `t` being the progress from 0 to 1.
      this.stepMs += deltaMs;
      const t = Math.min(1, this.stepMs / STEP_MS);
      this.x = this.fromX + (this.toX - this.fromX) * t;
      this.y = this.fromY + (this.toY - this.fromY) * t;
      hop = Math.sin(t * Math.PI) * size * 0.08; // a tiny hop mid-stride
      // Arrived: stop gliding, but keep the walk cycle going for REST_MS in case another step follows at once.
      if (t >= 1) {
        this.moving = false;
        this.restMs = REST_MS;
      }
    } else if (this.restMs > 0) {
      // Between steps: once REST_MS passes with no new step, switch to the standing pose.
      this.restMs -= deltaMs;
      if (this.restMs <= 0) this.settle();
    }

    // Short-lived offsets layered on top of the cell position.
    let offsetX = 0; // px
    let offsetY = 0; // px
    if (this.bumpMs > 0) {
      // Bump: push toward the wall and back, peaking mid-way at 14% of a cell.
      this.bumpMs -= deltaMs;
      const progress = 1 - Math.max(0, this.bumpMs) / BUMP_MS; // 0 at the start of the bump, 1 at its end
      const push = Math.sin(progress * Math.PI) * size * 0.14;
      // Column/row offset of the bump direction, used as a unit vector.
      const toward = stepCell(NO_STEP, this.bumpDirection);
      offsetX += toward.col * push;
      offsetY += toward.row * push;
    }
    if (this.shakeMs > 0) {
      // Trap shake: random jitter of up to 8% of a cell either way, each frame.
      this.shakeMs -= deltaMs;
      offsetX += (Math.random() - 0.5) * size * 0.16;
      offsetY += (Math.random() - 0.5) * size * 0.16;
      if (this.shakeMs <= 0) this.sprite.clearTint();
    }
    if (this.cheerMs > 0) {
      // Cheer: a string of hops up to 40% of a cell high.
      this.cheerMs -= deltaMs;
      hop += Math.abs(Math.sin(this.cheerMs * 0.012)) * size * 0.4;
    }
    if (this.blinkMs > 0) {
      // Respawn blink: alternate faded (35% opaque) and solid every BLINK_MS, ending solid.
      this.blinkMs -= deltaMs;
      const faded = this.blinkMs > 0 && Math.floor(this.blinkMs / BLINK_MS) % 2 === 0;
      this.sprite.setAlpha(faded ? 0.35 : 1);
    }

    // A slow breathing squash while standing still: the figure's height varies by up to 3%.
    const resting = !this.moving && this.restMs <= 0;
    const breathe = resting ? 1 + 0.03 * Math.sin(this.clockMs * 0.006) : 1;
    this.sprite.setPosition(this.x + offsetX, this.y + offsetY - hop).setScale(this.baseScale, this.baseScale * breathe);
    // The shadow stays on the floor, 40% of a cell below the cell centre: it ignores the hop and the vertical offset.
    this.shadow.setPosition(this.x + offsetX, this.y + size * 0.4);
  }

  /** Stops the walk cycle and shows the standing pose for the current facing. */
  private settle(): void {
    this.sprite.anims.stop();
    this.sprite.setTexture(runnerFrameKey(this.facing, IDLE_FRAME, this.variant));
  }
}
