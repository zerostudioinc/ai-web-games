/**
 * The maze itself: builds a random maze for the level, then runs the clock, the lives and the dead-end trap rule.
 * Each level steps through the phases of `Phase`: intro, playing, escaping and cleared, with a detour through
 * trapping and trapped whenever a dead end seals behind the runner, or gameOver once the last life is lost.
 */
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
import { isTrapped, shouldWarn } from '../systems/trap';

/**
 * Stage a level is in; `enter` moves between them. The usual order is intro, playing, escaping, cleared.
 * A sprung trap loops playing -> trapping -> trapped -> playing, or ends in gameOver when the last life is lost.
 *
 * intro    - the banner shows and the clock has not started
 * playing  - the runner can move and the clock runs
 * trapping - a step sprang the dead-end trap; waiting for the runner to arrive in the doomed cell
 * trapped  - the path has sealed; pausing before the runner is sent back to the start (a mode whose seals do not stay reopens the path then)
 * escaping - the runner is walking out through the exit gap
 * cleared  - level won; celebrating before the score screen
 * gameOver - out of lives; showing the message before the result screen
 */
type Phase = 'intro' | 'playing' | 'trapping' | 'trapped' | 'escaping' | 'cleared' | 'gameOver';

/** Scene data for PlayScene: sent by the menu and result screens (a new run), the level-complete screen (the next level) and the pause menu's Restart. */
export interface PlaySceneData {
  /** The run being played: the difficulty, the 1-based level to play and the points banked so far. */
  run: RunState;
  /** Theme of the level just finished, so the next one looks different. Omitted for the first level of a run. */
  previousTheme?: ThemeId;
}

const WARNING_TOAST_MS = 2400; // how long the "Careful!" toast stays up, ms

/**
 * Plays one level of a run: the maze, the runner, the clock, the lives, the dead-end trap rule and the pause menu.
 * Phaser reuses one instance for every level and restart, so `init` resets all per-level state.
 */
export class PlayScene extends Phaser.Scene {
  private run: RunState = startRun('normal'); // progress of the whole run (difficulty, level, points banked); replaced by the scene data in `init`
  private previousTheme: ThemeId | undefined; // theme of the level before this one, which this level must not repeat; undefined on level 1
  private settings: DifficultySettings = DIFFICULTY_SETTINGS.normal; // rules of the chosen difficulty: trap depth, whether it warns, whether sealed paths stay blocked, and the score multiplier
  private theme: ThemeId = 'grassland'; // look of this level (background and walls), picked in `create`

  private maze!: Maze; // this level's maze, including the passages currently sealed
  private view!: MazeView; // draws the maze, the exit portal and the slabs over sealed passages
  private player!: Player; // the runner on screen
  private hud!: Hud; // status bar: level, lives, clock, score and the pause button
  private touchPad!: TouchPad; // on-screen direction pad for touch devices
  private controls!: PlayerInputSystem; // keyboard, controller and touch pad input, turned into one step at a time
  private menuPad!: MenuPadInput; // controller reading for the pause menu and the Start (pause) button
  private pauseOverlay!: PauseOverlay; // the pause menu
  private banner!: Banner; // large message in the middle of the screen: level intro, TRAPPED!, ESCAPED!
  private toast!: Banner; // small message under the status bar: the dead-end warning, which only Easy shows
  private warningFrame!: Phaser.GameObjects.Rectangle; // red outline round the screen, shown while a trap is one step away (Easy only)
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter; // confetti burst at the exit when the level is cleared

  private phase: Phase = 'intro'; // current stage of the level; see `Phase`
  private phaseMs = 0; // time spent in the current phase, ms; reset by `enter`
  private paused = false; // true while the pause menu is open; nothing else advances
  private elapsedMs = 0; // level clock, ms; runs while playing and through a trap, but not during the intro or the exit walk
  private parMs = 0; // par time of this maze, ms; the speed bonus is measured against it
  private lives = MAX_LIVES; // lives left on this level; every level starts with `MAX_LIVES`
  private cell: Cell = { col: 0, row: 0 }; // cell the runner is in (0-based column and row); it changes as soon as a step starts, ahead of the glide
  // Wall to raise once the runner reaches the doomed cell: `direction` is the side of `cell` to close; null when no trap is pending.
  private pendingSeal: { cell: Cell; direction: Direction } | null = null;
  private result: LevelResult | null = null; // how the level went, set when the runner escapes; null before that
  private inDanger = false; // true while one more step would spring the trap and the mode warns (Easy); drives the warning toast and frame, and stays false on the other modes
  private warningLevel = 0; // how visible the warning frame is, 0 (hidden) to 1 (full); eased toward its target
  private warningClockMs = 0; // time driving the pulse of the warning frame, ms

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Play);
  }

  /**
   * Reads the scene data and resets all per-level state; Phaser calls this before `create()` on every start.
   *
   * @param data - Scene data from the menu, level-complete or result screen, or the pause menu's Restart (see `PlaySceneData`); a missing `run` becomes a new Normal run.
   */
  init(data: Partial<PlaySceneData>): void {
    this.run = data.run ?? startRun('normal');
    this.previousTheme = data.previousTheme;

    // Phaser reuses this scene instance for every level and restart, so all state is reset here.
    // (`maze`, `cell`, `parMs`, `theme` and the game objects are rebuilt by `create`.)
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

  /**
   * Builds the level: picks a theme, generates and draws a new maze, creates the runner, HUD, input, pause menu,
   * banners and effects, and announces the level.
   */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    // One generator, seeded afresh for every level, drives the theme pick, the maze and the maze's decoration.
    const random = createRng(randomSeed());
    // The theme never repeats the previous level's; the rules (trap depth, warning, whether seals stay, score multiplier) come from the difficulty.
    this.theme = pickTheme(random, this.previousTheme);
    this.settings = DIFFICULTY_SETTINGS[this.run.difficulty];

    // A fresh random maze every time a level is started, sized for the level number.
    const size = mazeSizeForLevel(this.run.level); // cells per side of the square maze
    const layout = mazeLayout(size, size); // cell size and screen position that fit the maze on screen
    this.maze = generateMaze(size, size, random);
    this.cell = this.maze.start; // the runner begins in the middle of the maze
    // Par follows the length of the solution, so bigger and windier mazes allow more time.
    this.parMs = parTimeMs(this.maze.solution.length - 1); // the solution lists cells, so its length in steps is one fewer

    // Theme background at the bottom; the maze layer, portal and runner all have higher depths.
    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    // The maze is baked into one texture with the exit portal beside it, and the runner stands on the start cell.
    this.view = new MazeView(this, this.maze, layout, THEMES[this.theme], random);
    this.player = new Player(this, layout, this.maze.start);

    // Status bar with the starting values; its pause button opens the pause menu.
    this.hud = new Hud(this, () => this.pause());
    this.hud.setLevel(this.run.level);
    this.hud.setLives(this.lives);
    this.hud.setScore(this.run.totalScore);
    this.hud.setTime(0);

    // The pad only appears on touch devices, or as soon as the first touch is seen.
    this.touchPad = new TouchPad(this, this.sys.game.device.input.touch);
    // Input is polled once per frame from the keyboard, controllers and the touch pad.
    this.controls = new PlayerInputSystem(this, () => this.touchPad.sample());
    // Created now, so a Start button still held from the previous screen is not read as a pause press.
    this.menuPad = new MenuPadInput(this);

    // Pause menu: Resume carries on, Restart run begins a new run on the same difficulty, Quit returns to the main menu.
    this.pauseOverlay = new PauseOverlay(this, {
      onResume: () => this.resume(),
      onRestart: () => this.scene.start(SceneKey.Play, { run: startRun(this.run.difficulty) }),
      onQuit: () => this.scene.start(SceneKey.Menu),
    });

    // A big banner mid-screen for the level events, and a small toast under the status bar for the dead-end warning (Easy only).
    this.banner = new Banner(this, { x: cx, y: 330, titleSize: 96, subtitleSize: 36 });
    this.toast = new Banner(this, { x: cx, y: 112, titleSize: 30, subtitleSize: 20 });
    // Red outline just inside the screen edge, 14 px thick; it starts invisible and `updateWarning` fades it.
    // Depth 40 draws it above the maze and runner, below the touch pad (45) and the status bar (50).
    this.warningFrame = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 6, GAME_HEIGHT - 6).setStrokeStyle(14, 0xff1744).setDepth(40).setAlpha(0);
    // Confetti for the escape: tinted sparks fly out in every direction and fall under gravity. `emitting: false` keeps it
    // silent until `explode` fires a burst at the exit. Depth 65 draws it above the banner (60).
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

    // Announce the level; the banner stays up for INTRO_MS, which is also how long the intro phase lasts.
    this.banner.show(`LEVEL ${this.run.level}`, `${THEMES[this.theme].label} - find the exit!`, INTRO_MS);

    // Keyboard choices for the pause overlay; they act only while paused. Steering is polled by PlayerInputSystem instead.
    onKeyPress(this, ['UP', 'W'], () => this.moveMenu(-1));
    onKeyPress(this, ['DOWN', 'S'], () => this.moveMenu(1));
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.confirmMenu());

    // The first touch reveals the pad on devices that were not detected as touch screens at start-up.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    // Pause when the window loses focus so the clock never runs while the player is away.
    this.game.events.on(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pause, this);
    // Game-level listeners outlive the scene, so `cleanUp` removes them when it shuts down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
  }

  /**
   * Per-frame loop: reads input and handles pause first, then advances the clock, the runner and the logic of the current phase.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms; capped by `MAX_FRAME_MS` before use.
   */
  update(_time: number, delta: number): void {
    // Cap the step so a long frame (e.g. after a tab switch) cannot jump the level clock, the glide or the banner timers.
    const dt = Math.min(delta, MAX_FRAME_MS);
    // Input comes first: this frame's held keys become at most one waiting step.
    this.controls.poll(dt);
    // Polled every frame, even when unused, so its idea of what is held is never stale when the pause menu opens.
    const padEvents = this.menuPad.poll();
    // Esc or P, or a controller's Start (which MenuPadInput ignores if it was already held when the level opened).
    const pausePressed = this.controls.pausePressed || padEvents.start;

    // While paused only the pause menu is driven; the clock, the runner and the banners stay frozen.
    if (this.paused) {
      this.updatePauseMenu(padEvents, pausePressed);
      return;
    }
    // A pause press opens the menu and skips the rest of this frame; `pause` refuses once the level has ended.
    if (pausePressed && this.pause()) return;

    // Steps only count in the playing phase; anything pressed during a banner or animation is dropped,
    // and a key held through it has to be released and pressed again before it counts.
    if (this.phase !== 'playing') this.controls.discard();

    // Update the runner first so a step that finishes this frame lets the next one start in the same frame.
    this.player.update(dt);
    this.phaseMs += dt; // time in the current phase

    // The clock keeps running through a trap and its banner, which is part of the cost of a wrong turn.
    // It stops once the runner is on the way out, and while a banner or score screen is all that is left.
    if (this.phase === 'playing' || this.phase === 'trapping' || this.phase === 'trapped') {
      this.elapsedMs += dt;
      this.hud.setTime(this.elapsedMs);
    }
    // Run the logic of the current phase; each one may call `enter` to move on.
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

    // Animations and timers that run in every phase, except while paused: the portal pulse, the banners and the warning frame.
    this.view.update(dt);
    this.banner.update(dt);
    this.toast.update(dt);
    this.updateWarning(dt);
  }

  /**
   * Switches to another phase and restarts the phase timer.
   *
   * @param phase - The phase to enter.
   */
  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseMs = 0;
  }

  /** Takes the next waiting step, once the runner has finished the previous one. */
  private updatePlaying(): void {
    // One square at a time: wait for the glide to finish before taking the next key press.
    if (this.player.isMoving) return;
    // A press made mid-glide is held by the input system and handed out here once the glide ends.
    const direction = this.controls.takeStep();
    if (direction) this.tryStep(direction);
  }

  /**
   * Tries one step from the runner's cell: nudges against a wall, walks out through the exit, or moves one square
   * and then checks the dead-end trap rule.
   *
   * @param direction - Direction of the step the player asked for.
   */
  private tryStep(direction: Direction): void {
    // A wall in the way: the runner only nudges against it and stays where it is.
    if (!this.maze.canMove(this.cell, direction)) {
      this.player.bump(direction);
      return;
    }

    // The step is allowed: the sprite starts gliding at once, even if the target lies outside the grid (the exit).
    const next = stepCell(this.cell, direction);
    this.player.moveTo(next, direction);

    // Only the exit has a gap in the outer wall, so leaving the grid means the runner is escaping.
    if (!this.maze.contains(next)) {
      this.enter('escaping');
      return;
    }

    // The logical cell moves at once, ahead of the glide, so the trap check below looks at the cell being entered.
    this.cell = next;
    // Depth counts the steps from the solution route; reaching the difficulty's trap depth springs the trap.
    if (isTrapped(this.maze.depthAt(next), this.settings.trapDepth)) {
      // The wall goes up behind the runner, on the side they came in from, once they arrive in the doomed cell.
      this.pendingSeal = { cell: next, direction: OPPOSITE[direction] };
      this.inDanger = false; // the trap has sprung, so the warning is over
      this.enter('trapping');
      return;
    }
    // No trap yet: on a mode that warns, say so if one more step deeper would spring it.
    this.refreshDanger();
  }

  /**
   * On a mode that warns (Easy), warns the player when one more step into this dead end would spring the trap.
   * A held key is cancelled at that moment, so the step that springs the trap takes a fresh press rather than an auto-repeat.
   * The other modes give no warning, so for them `shouldWarn` is always false and nothing here happens: even a cancelled
   * key would give the danger away.
   */
  private refreshDanger(): void {
    // True when the mode warns, the runner is one step short of the trap depth and an open way leads deeper.
    const danger = shouldWarn(this.maze, this.cell, this.settings);
    // Only on entering the danger: show the toast once and drop the held key's auto-repeat.
    if (danger && !this.inDanger) {
      this.toast.show('Careful! One more step and the path seals behind you!', '', WARNING_TOAST_MS);
      this.controls.discard();
    }
    // Remember the state; stepping out of danger switches the warning frame off again.
    this.inDanger = danger;
  }

  /**
   * Waits for the runner to reach the doomed cell, then seals the path behind them, costs a life and shows the TRAPPED banner.
   * The last life ends the run instead of sending the runner back to the start.
   */
  private updateTrapping(): void {
    // Wait for the runner to reach the doomed cell, then bring the wall down behind them.
    if (this.player.isMoving || !this.pendingSeal) return;
    const { cell, direction } = this.pendingSeal; // the doomed cell and the side of it to close
    this.pendingSeal = null; // consumed, so the seal happens only once

    // The wall goes up for real; it stays for the rest of the level unless the mode reopens it (see `updateTrapped`).
    this.maze.seal(cell, direction);
    // The view only draws the slab; the call above is what actually blocks the way.
    this.view.sealPassage(cell, direction);
    // Feedback: a 260 ms camera shake, the runner reeling for TRAP_MS and one heart less.
    this.cameras.main.shake(260, 0.006);
    this.player.stun(TRAP_MS);
    this.lives -= 1;
    this.hud.setLives(this.lives);
    this.toast.hide(); // the dead-end warning no longer applies

    // Out of lives: a longer banner, then the result screen. Otherwise the runner is sent back once the banner is done.
    if (this.lives <= 0) {
      this.banner.show('TRAPPED!', 'No lives left', GAME_OVER_MS);
      this.enter('gameOver');
    } else {
      this.banner.show('TRAPPED!', 'The path behind you collapsed', TRAP_MS);
      this.enter('trapped');
    }
  }

  /**
   * Holds the TRAPPED banner for `TRAP_MS`, then sends the runner back to the start to carry on.
   * Where seals do not stay blocked (Very Hard), the collapsed path opens again at that moment.
   */
  private updateTrapped(): void {
    if (this.phaseMs < TRAP_MS) return;
    // The dead end can be entered again, so the player has to remember which way not to go.
    if (!this.settings.sealsStayBlocked) {
      this.maze.reopenSealed();
      this.view.removeSlabs();
    }
    // Back to the start; the clock kept running through the trap, which is part of the penalty.
    this.cell = this.maze.start;
    this.player.respawn(this.maze.start, RESPAWN_BLINK_MS); // blinks for RESPAWN_BLINK_MS so the restart point is easy to see
    this.enter('playing');
  }

  /** Once the runner has walked out through the exit gap, works out the level's score and starts the celebration. */
  private updateEscaping(): void {
    // Wait for the runner to finish the walk out through the gap.
    if (this.player.isMoving) return;

    // The clock stopped when the exit walk began, so `elapsedMs` is the escape time, with any time lost to traps included.
    const score = levelScore(this.run.level, this.elapsedMs, this.parMs, this.run.difficulty);
    this.result = { level: this.run.level, elapsedMs: this.elapsedMs, parMs: this.parMs, score };
    // Celebrate: 48 confetti sparks burst from the exit portal while the runner hops for joy.
    const exit = this.view.exitPosition;
    this.confetti.explode(48, exit.x, exit.y);
    this.player.cheer(CLEAR_MS);
    // The HUD shows the new total now; `this.run` itself is only advanced when the next scene starts.
    this.hud.setScore(this.run.totalScore + score.points);
    this.banner.show('ESCAPED!', `+${formatScore(score.points)} points`, CLEAR_MS);
    this.enter('cleared');
  }

  /** After the celebration, hands over to the level-complete screen with the run advanced by this level. */
  private updateCleared(): void {
    // Let the banner and the cheer play out first; `result` is always set by now, the check only narrows its type.
    if (this.phaseMs < CLEAR_MS || !this.result) return;
    this.scene.start(SceneKey.LevelComplete, {
      run: completeLevel(this.run, this.result.score.points), // next level, with this level's points added to the total
      result: this.result,
      theme: this.theme,
    });
  }

  /** After the final TRAPPED banner, opens the result screen with a defeat. */
  private updateGameOver(): void {
    if (this.phaseMs < GAME_OVER_MS) return;
    // The run is passed as it stood: the level that was lost earns no points.
    this.scene.start(SceneKey.Result, { run: this.run, won: false });
  }

  /**
   * Fades a red frame in and out around the screen while a trap is one step away. Only Easy ever raises `inDanger`.
   *
   * @param dt - Frame time in ms, already capped by `MAX_FRAME_MS`.
   */
  private updateWarning(dt: number): void {
    this.warningClockMs += dt; // time driving the pulse below
    // The frame shows only while in danger during play; any other phase fades it out.
    const target = this.inDanger && this.phase === 'playing' ? 1 : 0;
    // Ease toward the target so the frame fades instead of snapping (a time constant of about 120 ms).
    this.warningLevel += (target - this.warningLevel) * Math.min(1, dt / 120);
    // A throb between 30% and 100% opacity, about twice a second, scaled by how far the frame has faded in.
    const pulse = 0.65 + 0.35 * Math.sin(this.warningClockMs * 0.012);
    this.warningFrame.setAlpha(this.warningLevel * pulse);
  }

  // ------------------------------------------------------------------ pause

  /**
   * Opens the pause menu and freezes the level. Does nothing, returning false, when the game is already paused or the
   * level has ended and the next screen is about to open.
   *
   * @returns True if the pause menu was opened, false if nothing changed.
   */
  private pause(): boolean {
    // Nothing to pause if the menu is already open, or if the level is over and the next screen is about to start.
    if (this.paused || this.phase === 'cleared' || this.phase === 'gameOver') return false;
    this.paused = true;
    // Drop any waiting step and release the touch pad, so nothing fires when play resumes.
    this.controls.discard();
    this.touchPad.release();
    // Phaser keeps animations running outside the scene's update, so the walk cycle is frozen explicitly.
    this.player.setPaused(true);
    this.pauseOverlay.show();
    return true;
  }

  /** Closes the pause menu and carries on with the level. */
  private resume(): void {
    this.paused = false;
    this.pauseOverlay.hide();
    this.player.setPaused(false);
    // The key or tap that chose Resume, or any key held meanwhile, must not also move the runner.
    this.controls.discard();
  }

  /**
   * Drives the pause menu while the game is paused: Esc, P or Start resume, and the controller moves the highlight.
   * Keyboard choices arrive through `moveMenu` and `confirmMenu` instead.
   *
   * @param events - Controller presses of this frame: up and down move the highlight, confirm activates the choice.
   * @param pausePressed - True when Esc, P or Start was pressed this frame, which resumes the game.
   */
  private updatePauseMenu(events: MenuPadEvents, pausePressed: boolean): void {
    // Esc, P or Start closes the menu again.
    if (pausePressed) {
      this.resume();
      return;
    }
    if (events.up) this.pauseOverlay.move(-1);
    if (events.down) this.pauseOverlay.move(1);
    if (events.confirm) this.pauseOverlay.activateSelected();
  }

  /**
   * Moves the pause-menu highlight from the keyboard; ignored unless the game is paused.
   *
   * @param step - -1 to move up one choice, +1 to move down one.
   */
  private moveMenu(step: number): void {
    if (this.paused) this.pauseOverlay.move(step);
  }

  /** Activates the highlighted pause-menu choice from the keyboard; ignored unless the game is paused. */
  private confirmMenu(): void {
    if (this.paused) this.pauseOverlay.activateSelected();
  }

  /**
   * Shows the touch pad the first time a finger touches the screen, for touch screens that were not detected at start-up,
   * then stops listening.
   *
   * @param pointer - The pointer that went down; a mouse click is ignored.
   */
  private revealTouchPad(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    this.touchPad.setVisible(true);
    // One reveal is enough, so the listener removes itself.
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
  }

  /** Removes everything that outlives the scene: game-level listeners, claimed keys and the baked maze texture. */
  private cleanUp(): void {
    // Game-level events outlive this scene: left in place they would keep calling `pause` on it and pile up with every new level.
    this.game.events.off(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.pause, this);
    // Harmless if `revealTouchPad` already removed it.
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    // Hands the keys back so none is left registered after the scene ends.
    this.controls.dispose();
    // Also removes the baked maze texture, so the next level can bake a new one under the same key.
    this.view.destroy();
  }
}
