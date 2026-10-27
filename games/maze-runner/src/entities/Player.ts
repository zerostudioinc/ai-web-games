// The runner on screen: glides between cells, plays the walk cycle, and reacts to bumps, traps and respawns.
import type Phaser from 'phaser';
import { IDLE_FRAME, RUNNER_FIGURE_HEIGHT, runnerFrameKey, runnerWalkKey } from '../assets/runnerArt';
import { STEP_MS } from '../config';
import { cellCenter, type MazeLayout } from '../systems/layout';
import { stepCell, type Cell, type Direction } from '../systems/maze';

const DEPTH = 11; // above the maze walls, below the HUD
/** The walk cycle keeps going this long after a step, so held keys read as one continuous run. */
const REST_MS = 70;
const BUMP_MS = 110;
const BLINK_MS = 90; // length of one on/off phase of the respawn blink
const STUN_TINT = 0xff8a80;
const NO_STEP: Cell = { col: 0, row: 0 };

export class Player {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly baseScale: number;

  // Where the runner is drawn, and the two ends of the step in progress.
  private x = 0;
  private y = 0;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private stepMs = 0;
  private moving = false;

  private facing: Direction = 'down';
  private restMs = 0;
  private bumpMs = 0;
  private bumpDirection: Direction = 'down';
  private shakeMs = 0;
  private blinkMs = 0;
  private cheerMs = 0;
  private clockMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly layout: MazeLayout,
    cell: Cell,
  ) {
    const size = layout.cellSize;
    // The figure fills most of a cell, whatever the maze size.
    this.baseScale = (size * 0.9) / RUNNER_FIGURE_HEIGHT;
    this.shadow = scene.add.ellipse(0, 0, size * 0.55, size * 0.2, 0x000000, 0.3).setDepth(DEPTH - 1);
    this.sprite = scene.add.sprite(0, 0, runnerFrameKey('down', IDLE_FRAME)).setScale(this.baseScale).setDepth(DEPTH);
    this.teleport(cell);
  }

  /** True while gliding between two cells; the scene waits for this to clear before accepting the next step. */
  get isMoving(): boolean {
    return this.moving;
  }

  /** Starts the glide to `cell`. It may lie outside the grid, which is how the runner walks out of the exit. */
  moveTo(cell: Cell, direction: Direction): void {
    const target = cellCenter(this.layout, cell);
    this.fromX = this.x;
    this.fromY = this.y;
    this.toX = target.x;
    this.toY = target.y;
    this.stepMs = 0;
    this.moving = true;
    this.restMs = 0;
    this.facing = direction;
    // `true` keeps an already-running cycle going instead of restarting it on every step.
    this.sprite.anims.play(runnerWalkKey(direction), true);
  }

  /** Turns to face a wall and nudges toward it, to show the key press registered. */
  bump(direction: Direction): void {
    this.facing = direction;
    this.bumpDirection = direction;
    this.bumpMs = BUMP_MS;
    if (!this.moving) this.settle();
  }

  /** Reels from a trap: shakes and flushes red for `durationMs`. */
  stun(durationMs: number): void {
    this.shakeMs = durationMs;
    this.sprite.setTint(STUN_TINT);
  }

  /** Places the runner on `cell` at once and clears every effect. */
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

  /** Back to `cell`, blinking for `blinkDurationMs` so the player can see where they restarted. */
  respawn(cell: Cell, blinkDurationMs: number): void {
    this.teleport(cell);
    this.blinkMs = blinkDurationMs;
  }

  /** Hops for joy for `durationMs`. */
  cheer(durationMs: number): void {
    this.cheerMs = durationMs;
    this.settle();
  }

  /** Freezes or resumes the walk cycle; Phaser runs animations outside the scene's own update, so pausing needs this. */
  setPaused(paused: boolean): void {
    if (paused) this.sprite.anims.pause();
    else this.sprite.anims.resume();
  }

  update(deltaMs: number): void {
    const size = this.layout.cellSize;
    this.clockMs += deltaMs;

    let hop = 0;
    if (this.moving) {
      this.stepMs += deltaMs;
      const t = Math.min(1, this.stepMs / STEP_MS);
      this.x = this.fromX + (this.toX - this.fromX) * t;
      this.y = this.fromY + (this.toY - this.fromY) * t;
      hop = Math.sin(t * Math.PI) * size * 0.08; // a tiny hop mid-stride
      if (t >= 1) {
        this.moving = false;
        this.restMs = REST_MS;
      }
    } else if (this.restMs > 0) {
      this.restMs -= deltaMs;
      if (this.restMs <= 0) this.settle();
    }

    // Short-lived offsets layered on top of the cell position.
    let offsetX = 0;
    let offsetY = 0;
    if (this.bumpMs > 0) {
      this.bumpMs -= deltaMs;
      const progress = 1 - Math.max(0, this.bumpMs) / BUMP_MS;
      const push = Math.sin(progress * Math.PI) * size * 0.14;
      const toward = stepCell(NO_STEP, this.bumpDirection);
      offsetX += toward.col * push;
      offsetY += toward.row * push;
    }
    if (this.shakeMs > 0) {
      this.shakeMs -= deltaMs;
      offsetX += (Math.random() - 0.5) * size * 0.16;
      offsetY += (Math.random() - 0.5) * size * 0.16;
      if (this.shakeMs <= 0) this.sprite.clearTint();
    }
    if (this.cheerMs > 0) {
      this.cheerMs -= deltaMs;
      hop += Math.abs(Math.sin(this.cheerMs * 0.012)) * size * 0.4;
    }
    if (this.blinkMs > 0) {
      this.blinkMs -= deltaMs;
      const faded = this.blinkMs > 0 && Math.floor(this.blinkMs / BLINK_MS) % 2 === 0;
      this.sprite.setAlpha(faded ? 0.35 : 1);
    }

    // A slow breathing squash while standing still.
    const resting = !this.moving && this.restMs <= 0;
    const breathe = resting ? 1 + 0.03 * Math.sin(this.clockMs * 0.006) : 1;
    this.sprite.setPosition(this.x + offsetX, this.y + offsetY - hop).setScale(this.baseScale, this.baseScale * breathe);
    this.shadow.setPosition(this.x + offsetX, this.y + size * 0.4);
  }

  /** Stops the walk cycle and shows the standing pose for the current facing. */
  private settle(): void {
    this.sprite.anims.stop();
    this.sprite.setTexture(runnerFrameKey(this.facing, IDLE_FRAME));
  }
}
