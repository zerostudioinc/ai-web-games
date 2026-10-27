// The maze itself: builds a random maze for the level, then runs the clock, the lives and the dead-end trap rule.
import Phaser from 'phaser';
import { Banner } from '../entities/Banner';
import { Hud } from '../entities/Hud';
import { MazeView } from '../entities/MazeView';
import { PauseOverlay } from '../entities/PauseOverlay';
import { Player } from '../entities/Player';
import { TouchPad } from '../entities/TouchPad';
import {
  CLEAR_MS,
  GAME_HEIGHT,
  GAME_OVER_MS,
  GAME_WIDTH,
  INTRO_MS,
  MAX_FRAME_MS,
  MAX_LIVES,
  RESPAWN_BLINK_MS,
  SceneKey,
  TRAP_MS,
  TextureKey,
  themeTextureKey,
} from '../config';
import { DIFFICULTY_SETTINGS, type DifficultySettings } from '../systems/difficulty';
import { mazeLayout } from '../systems/layout';
import { mazeSizeForLevel } from '../systems/levels';
import { OPPOSITE, generateMaze, stepCell, type Cell, type Direction, type Maze } from '../systems/maze';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput, type MenuPadEvents } from '../systems/MenuPadInput';
import { PlayerInputSystem } from '../systems/PlayerInputSystem';
import { createRng, randomSeed } from '../systems/rng';
import { completeLevel, startRun, type LevelResult, type RunState } from '../systems/run';
import { formatScore, levelScore, parTimeMs } from '../systems/score';
import { THEMES, pickTheme, type ThemeId } from '../systems/themes';
import { isTrapImminent, isTrapped } from '../systems/trap';

/**
 * intro    - the banner shows and the clock has not started
 * playing  - the runner can move and the clock runs
 * trapping - a step sprang the dead-end trap; waiting for the runner to arrive in the doomed cell
 * trapped  - the path has sealed; pausing before the runner is sent back to the start
 * escaping - the runner is walking out through the exit gap
 * cleared  - level won; celebrating before the score screen
 * gameOver - out of lives; showing the message before the result screen
 */
type Phase = 'intro' | 'playing' | 'trapping' | 'trapped' | 'escaping' | 'cleared' | 'gameOver';

export interface PlaySceneData {
  run: RunState;
  /** Theme of the level just finished, so the next one looks different. */
  previousTheme?: ThemeId;
}

const WARNING_TOAST_MS = 2400;

export class PlayScene extends Phaser.Scene {
  private run: RunState = startRun('normal');
  private previousTheme: ThemeId | undefined;
  private settings: DifficultySettings = DIFFICULTY_SETTINGS.normal;
  private theme: ThemeId = 'grassland';

  private maze!: Maze;
  private view!: MazeView;
  private player!: Player;
  private hud!: Hud;
  private touchPad!: TouchPad;
  private controls!: PlayerInputSystem;
  private menuPad!: MenuPadInput;
  private pauseOverlay!: PauseOverlay;
  private banner!: Banner;
  private toast!: Banner;
  private warningFrame!: Phaser.GameObjects.Rectangle;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;

  private phase: Phase = 'intro';
  private phaseMs = 0;
  private paused = false;
  private elapsedMs = 0;
  private parMs = 0;
  private lives = MAX_LIVES;
  private cell: Cell = { col: 0, row: 0 };
  private pendingSeal: { cell: Cell; direction: Direction } | null = null;
  private result: LevelResult | null = null;
  private inDanger = false;
  private warningLevel = 0;
  private warningClockMs = 0;

  constructor() {
    super(SceneKey.Play);
  }

  init(data: Partial<PlaySceneData>): void {
    this.run = data.run ?? startRun('normal');
    this.previousTheme = data.previousTheme;

    // Phaser reuses this scene instance for every level and restart, so all state is reset here.
    this.phase = 'intro';
    this.phaseMs = 0;
    this.paused = false;
    this.elapsedMs = 0;
    this.lives = MAX_LIVES;
    this.pendingSeal = null;
    this.result = null;
    this.inDanger = false;
    this.warningLevel = 0;
    this.warningClockMs = 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const random = createRng(randomSeed());
    this.theme = pickTheme(random, this.previousTheme);
    this.settings = DIFFICULTY_SETTINGS[this.run.difficulty];

    // A fresh random maze every time a level is started, sized for the level number.
    const size = mazeSizeForLevel(this.run.level);
    const layout = mazeLayout(size, size);
    this.maze = generateMaze(size, size, random);
    this.cell = this.maze.start;
    // Par follows the length of the solution, so bigger and windier mazes allow more time.
    this.parMs = parTimeMs(this.maze.solution.length - 1);

    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    this.view = new MazeView(this, this.maze, layout, THEMES[this.theme], random);
    this.player = new Player(this, layout, this.maze.start);

    this.hud = new Hud(this, () => this.pause());
    this.hud.setLevel(this.run.level);
    this.hud.setLives(this.lives);
    this.hud.setScore(this.run.totalScore);
    this.hud.setTime(0);

    // The pad only appears on touch devices, or as soon as the first touch is seen.
    this.touchPad = new TouchPad(this, this.sys.game.device.input.touch);
    this.controls = new PlayerInputSystem(this, () => this.touchPad.sample());
    this.menuPad = new MenuPadInput(this);

    this.pauseOverlay = new PauseOverlay(this, {
      onResume: () => this.resume(),
      onRestart: () => this.scene.start(SceneKey.Play, { run: startRun(this.run.difficulty) }),
      onQuit: () => this.scene.start(SceneKey.Menu),
    });

    this.banner = new Banner(this, { x: cx, y: 330, titleSize: 96, subtitleSize: 36 });
    this.toast = new Banner(this, { x: cx, y: 112, titleSize: 30, subtitleSize: 20 });
    this.warningFrame = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 6, GAME_HEIGHT - 6).setStrokeStyle(14, 0xff1744).setDepth(40).setAlpha(0);
    this.confetti = this.add
      .particles(0, 0, TextureKey.Spark, {
        emitting: false,
        lifespan: 1100,
        speed: { min: 120, max: 340 },
        angle: { min: 0, max: 360 },
        gravityY: 380,
        scale: { start: 1.6, end: 0.4 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd54f, 0xff7043, 0x4fc3f7, 0x81c784, 0xf48fb1],
      })
      .setDepth(65);

    this.banner.show(`LEVEL ${this.run.level}`, `${THEMES[this.theme].label} - find the exit!`, INTRO_MS);

    // Keyboard choices for the pause overlay. Steering is polled by PlayerInputSystem instead.
    onKeyPress(this, ['UP', 'W'], () => this.moveMenu(-1));
    onKeyPress(this, ['DOWN', 'S'], () => this.moveMenu(1));
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.confirmMenu());

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    // Pause when the window loses focus so the clock never runs while the player is away.
    this.game.events.on(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.controls.poll(dt);
    // Polled every frame, even when unused, so its idea of what is held is never stale when the pause menu opens.
    const padEvents = this.menuPad.poll();
    // Esc or P, or a controller's Start (which MenuPadInput ignores if it was already held when the level opened).
    const pausePressed = this.controls.pausePressed || padEvents.start;

    if (this.paused) {
      this.updatePauseMenu(padEvents, pausePressed);
      return;
    }
    if (pausePressed && this.pause()) return;

    // Steps only count in the playing phase; anything pressed during a banner or animation is dropped.
    if (this.phase !== 'playing') this.controls.discard();

    // Update the runner first so a step that finishes this frame lets the next one start in the same frame.
    this.player.update(dt);
    this.phaseMs += dt;

    // The clock keeps running through a trap and its banner, which is part of the cost of a wrong turn.
    // It stops once the runner is on the way out, and while a banner or score screen is all that is left.
    if (this.phase === 'playing' || this.phase === 'trapping' || this.phase === 'trapped') {
      this.elapsedMs += dt;
      this.hud.setTime(this.elapsedMs);
    }
    switch (this.phase) {
      case 'intro':
        if (this.phaseMs >= INTRO_MS) this.enter('playing');
        break;
      case 'playing':
        this.updatePlaying();
        break;
      case 'trapping':
        this.updateTrapping();
        break;
      case 'trapped':
        this.updateTrapped();
        break;
      case 'escaping':
        this.updateEscaping();
        break;
      case 'cleared':
        this.updateCleared();
        break;
      case 'gameOver':
        this.updateGameOver();
        break;
    }

    this.view.update(dt);
    this.banner.update(dt);
    this.toast.update(dt);
    this.updateWarning(dt);
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseMs = 0;
  }

  private updatePlaying(): void {
    // One square at a time: wait for the glide to finish before taking the next key press.
    if (this.player.isMoving) return;
    const direction = this.controls.takeStep();
    if (direction) this.tryStep(direction);
  }

  private tryStep(direction: Direction): void {
    if (!this.maze.canMove(this.cell, direction)) {
      this.player.bump(direction);
      return;
    }

    const next = stepCell(this.cell, direction);
    this.player.moveTo(next, direction);

    // Only the exit has a gap in the outer wall, so leaving the grid means the runner is escaping.
    if (!this.maze.contains(next)) {
      this.enter('escaping');
      return;
    }

    this.cell = next;
    if (isTrapped(this.maze.depthAt(next), this.settings.trapDepth)) {
      // The wall goes up behind the runner once they arrive in the doomed cell.
      this.pendingSeal = { cell: next, direction: OPPOSITE[direction] };
      this.inDanger = false;
      this.enter('trapping');
      return;
    }
    this.refreshDanger();
  }

  /**
   * Warns the player when one more step into this dead end would spring the trap.
   * A held key is cancelled at that moment, so the step that springs the trap takes a fresh press rather than an auto-repeat.
   */
  private refreshDanger(): void {
    const danger = isTrapImminent(this.maze, this.cell, this.settings.trapDepth);
    if (danger && !this.inDanger) {
      this.toast.show('Careful! One more step and the path seals behind you!', '', WARNING_TOAST_MS);
      this.controls.discard();
    }
    this.inDanger = danger;
  }

  private updateTrapping(): void {
    // Wait for the runner to reach the doomed cell, then bring the wall down behind them.
    if (this.player.isMoving || !this.pendingSeal) return;
    const { cell, direction } = this.pendingSeal;
    this.pendingSeal = null;

    // The sealed passage stays closed for the rest of the level, so the same dead end cannot be tried again.
    this.maze.seal(cell, direction);
    this.view.sealPassage(cell, direction);
    this.cameras.main.shake(260, 0.006);
    this.player.stun(TRAP_MS);
    this.lives -= 1;
    this.hud.setLives(this.lives);
    this.toast.hide();

    if (this.lives <= 0) {
      this.banner.show('TRAPPED!', 'No lives left', GAME_OVER_MS);
      this.enter('gameOver');
    } else {
      this.banner.show('TRAPPED!', 'The path behind you collapsed', TRAP_MS);
      this.enter('trapped');
    }
  }

  private updateTrapped(): void {
    if (this.phaseMs < TRAP_MS) return;
    // Back to the start; the clock kept running through the trap, which is part of the penalty.
    this.cell = this.maze.start;
    this.player.respawn(this.maze.start, RESPAWN_BLINK_MS);
    this.enter('playing');
  }

  private updateEscaping(): void {
    // Wait for the runner to finish the walk out through the gap.
    if (this.player.isMoving) return;

    const score = levelScore(this.run.level, this.elapsedMs, this.parMs, this.run.difficulty);
    this.result = { level: this.run.level, elapsedMs: this.elapsedMs, parMs: this.parMs, score };
    const exit = this.view.exitPosition;
    this.confetti.explode(48, exit.x, exit.y);
    this.player.cheer(CLEAR_MS);
    this.hud.setScore(this.run.totalScore + score.points);
    this.banner.show('ESCAPED!', `+${formatScore(score.points)} points`, CLEAR_MS);
    this.enter('cleared');
  }

  private updateCleared(): void {
    if (this.phaseMs < CLEAR_MS || !this.result) return;
    this.scene.start(SceneKey.LevelComplete, {
      run: completeLevel(this.run, this.result.score.points),
      result: this.result,
      theme: this.theme,
    });
  }

  private updateGameOver(): void {
    if (this.phaseMs < GAME_OVER_MS) return;
    this.scene.start(SceneKey.Result, { run: this.run, won: false });
  }

  /** Fades a red frame in and out around the screen while a trap is one step away. */
  private updateWarning(dt: number): void {
    this.warningClockMs += dt;
    const target = this.inDanger && this.phase === 'playing' ? 1 : 0;
    // Ease toward the target so the frame fades instead of snapping.
    this.warningLevel += (target - this.warningLevel) * Math.min(1, dt / 120);
    const pulse = 0.65 + 0.35 * Math.sin(this.warningClockMs * 0.012);
    this.warningFrame.setAlpha(this.warningLevel * pulse);
  }

  // ------------------------------------------------------------------ pause

  /** Opens the pause menu. Returns false, doing nothing, once the level has ended and the next screen is about to open. */
  private pause(): boolean {
    if (this.paused || this.phase === 'cleared' || this.phase === 'gameOver') return false;
    this.paused = true;
    this.controls.discard();
    this.touchPad.release();
    this.player.setPaused(true);
    this.pauseOverlay.show();
    return true;
  }

  private resume(): void {
    this.paused = false;
    this.pauseOverlay.hide();
    this.player.setPaused(false);
    this.controls.discard();
  }

  private updatePauseMenu(events: MenuPadEvents, pausePressed: boolean): void {
    if (pausePressed) {
      this.resume();
      return;
    }
    if (events.up) this.pauseOverlay.move(-1);
    if (events.down) this.pauseOverlay.move(1);
    if (events.confirm) this.pauseOverlay.activateSelected();
  }

  private moveMenu(step: number): void {
    if (this.paused) this.pauseOverlay.move(step);
  }

  private confirmMenu(): void {
    if (this.paused) this.pauseOverlay.activateSelected();
  }

  private revealTouchPad(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    this.touchPad.setVisible(true);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
  }

  /** Removes everything that outlives the scene: game-level listeners, claimed keys and the baked maze texture. */
  private cleanUp(): void {
    this.game.events.off(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.pause, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    this.controls.dispose();
    this.view.destroy();
  }
}
