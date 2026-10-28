/**
 * The level itself: builds one random maze, gives each player a board with their own copy of it, and runs the stages of the
 * level and the pause menu. A solo game has one board; a versus game has two, side by side, racing through the same maze.
 * Each level steps through the phases of `Phase`: intro, then playing until everyone has escaped (cleared) or a player runs
 * out of lives and the match ends (gameOver).
 */
import Phaser from 'phaser';
import { Hud } from '../entities/Hud';
import { PauseOverlay } from '../entities/PauseOverlay';
import { PlayerBoard } from '../entities/PlayerBoard';
import { TouchPad } from '../entities/TouchPad';
import { CLEAR_MS, GAME_OVER_MS, INTRO_MS, MAX_FRAME_MS, SceneKey, themeTextureKey } from '../config';
import { keySchemesFor, padSlotsFor } from '../systems/controls';
import { boardAreas, mazeLayout, touchPadLayout } from '../systems/layout';
import { mazeSizeForLevel } from '../systems/levels';
import { generateMaze } from '../systems/maze';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput, type MenuPadEvents } from '../systems/MenuPadInput';
import { PlayerInputSystem } from '../systems/PlayerInputSystem';
import { createRng, randomSeed } from '../systems/rng';
import { bankPoints, completeLevel, startRun, themeOfLevel, type RunState } from '../systems/run';
import { parTimeMs } from '../systems/score';
import { THEMES, type ThemeId } from '../systems/themes';
import { decideLevelEnd, type MatchResult } from '../systems/versus';
import type { LevelCompleteData } from './LevelCompleteScene';
import type { ResultData } from './ResultScene';

/**
 * Stage a level is in; `enter` moves between them. The usual order is intro, playing, cleared.
 *
 * intro    - the level banners show and the clocks have not started
 * playing  - the players race: each board runs its own clock, trap rule and lives
 * cleared  - everyone still in the game has escaped; celebrating before the score screen
 * gameOver - the match ended because a player ran out of lives; showing the message before the result screen
 */
type Phase = 'intro' | 'playing' | 'cleared' | 'gameOver';

/** Scene data for PlayScene: sent by the menu and result screens (a new run), the level-complete screen (the next level) and the pause menu's Restart. */
export interface PlaySceneData {
  /** The run being played: the difficulty, the players, the 1-based level to play and the points banked so far. */
  run: RunState;
}

/**
 * Plays one level of a run: the maze, one board per player, the status bar, the level stages and the pause menu.
 * Phaser reuses one instance for every level and restart, so `init` resets all per-level state.
 */
export class PlayScene extends Phaser.Scene {
  private run: RunState = startRun('normal'); // progress of the whole run (difficulty, players, level, points banked); replaced by the scene data in `init`
  private theme: ThemeId = 'grassland'; // look of this level (background and walls), taken from the run's theme schedule in `create`

  private boards: PlayerBoard[] = []; // one per player, player one first (on the left in versus)
  private inputs: PlayerInputSystem[] = []; // each player's keys, controllers and touch pad, turned into one step at a time; same order as `boards`
  private touchPads: TouchPad[] = []; // each player's on-screen direction pad for touch devices; same order as `boards`
  private hud!: Hud; // status bar: level, and each player's lives, clock and score, plus the pause button
  private menuPad!: MenuPadInput; // controller reading for the pause menu and the Start (pause) button
  private pauseOverlay!: PauseOverlay; // the pause menu

  private phase: Phase = 'intro'; // current stage of the level; see `Phase`
  private phaseMs = 0; // time spent in the current phase, ms; reset by `enter`
  private paused = false; // true while the pause menu is open; nothing else advances
  private pauseRequested = false; // true when Esc or P went down since the last frame
  private firstEscaper: number | null = null; // versus: the player who escaped first on this level; null until someone has
  private match: MatchResult | null = null; // versus: how the match ended, set when a player runs out of lives; null before that and in a solo game

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Play);
  }

  /**
   * Reads the scene data and resets all per-level state; Phaser calls this before `create()` on every start.
   *
   * @param data - Scene data from the menu, level-complete or result screen, or the pause menu's Restart (see `PlaySceneData`); a missing `run` becomes a new solo Normal run.
   */
  init(data: Partial<PlaySceneData>): void {
    this.run = data.run ?? startRun('normal');

    // Phaser reuses this scene instance for every level and restart, so all state is reset here.
    // (`theme` and the game objects are rebuilt by `create`.)
    this.boards = [];
    this.inputs = [];
    this.touchPads = [];
    this.phase = 'intro';
    this.phaseMs = 0;
    this.paused = false;
    this.pauseRequested = false;
    this.firstEscaper = null;
    this.match = null;
  }

  /**
   * Builds the level: one random maze, a board for each player with their own copy of it, the status bar, input, the pause
   * menu and the level banners.
   */
  create(): void {
    const { run } = this;
    const players = run.playerCount;
    this.theme = themeOfLevel(run, run.level);
    // Touch devices get an on-screen pad per player; in versus it takes a strip under each maze.
    const touch = this.sys.game.device.input.touch;
    const areas = boardAreas(players, touch);
    // Every board is built from the same two seeds, so all players get the same maze with the same decoration.
    const mazeSeed = randomSeed();
    const decorSeed = randomSeed();
    const size = mazeSizeForLevel(run.level); // cells per side of the square maze

    // Theme background at the bottom; the maze layers, portals and runners all have higher depths.
    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    for (let player = 0; player < players; player++) {
      const area = areas[player];
      // The pad only appears on touch devices, or as soon as the first touch is seen.
      const touchPad = new TouchPad(this, touch, touchPadLayout(players, area));
      // Input is polled once per frame from this player's keys, controllers and touch pad.
      const input = new PlayerInputSystem(this, { keys: keySchemesFor(player, players), pads: padSlotsFor(player, players), touch: () => touchPad.sample() });
      // A fresh random maze every time a level is started, sized for the level number; a generator with the same seed gives the same maze.
      const maze = generateMaze(size, size, createRng(mazeSeed));
      this.touchPads.push(touchPad);
      this.inputs.push(input);
      this.boards.push(
        new PlayerBoard(this, {
          index: player,
          area,
          layout: mazeLayout(size, size, area.maze), // cell size and screen position that fit the maze into this player's area
          maze,
          palette: THEMES[this.theme],
          random: createRng(decorSeed),
          textureKey: `maze-layer-${player}`,
          difficulty: run.difficulty,
          level: run.level,
          // Par follows the length of the solution, so bigger and windier mazes allow more time.
          parMs: parTimeMs(maze.solution.length - 1), // the solution lists cells, so its length in steps is one fewer
          input,
          compact: players > 1,
          claimFirstPlace: players > 1 ? () => this.claimFirstPlace(player) : undefined,
        }),
      );
    }

    // Status bar with the starting values; its pause button opens the pause menu.
    this.hud = new Hud(this, players, () => this.pause());
    this.hud.setLevel(run.level);
    this.syncHud();

    // Created now, so a Start button still held from the previous screen is not read as a pause press.
    this.menuPad = new MenuPadInput(this);
    // Pause menu: Resume carries on, Restart run begins a new run on the same difficulty and players, Quit returns to the main menu.
    this.pauseOverlay = new PauseOverlay(this, {
      onResume: () => this.resume(),
      onRestart: () => this.scene.start(SceneKey.Play, { run: startRun(run.difficulty, run.playerCount) }),
      onQuit: () => this.scene.start(SceneKey.Menu),
    });

    // Announce the level on every board; the banners stay up for INTRO_MS, which is also how long the intro phase lasts.
    for (const board of this.boards) board.announce(`LEVEL ${run.level}`, `${THEMES[this.theme].label} - find the exit!`, INTRO_MS);

    // Esc or P pauses (and resumes). The press is read in `update`, together with a controller's Start button.
    onKeyPress(this, ['ESC', 'P'], () => {
      this.pauseRequested = true;
    });
    // Keyboard choices for the pause overlay; they act only while paused. Steering is polled by PlayerInputSystem instead.
    onKeyPress(this, ['UP', 'W'], () => this.moveMenu(-1));
    onKeyPress(this, ['DOWN', 'S'], () => this.moveMenu(1));
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.confirmMenu());

    // The first touch reveals the pads on devices that were not detected as touch screens at start-up.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    // Pause when the window loses focus so the clock never runs while the player is away.
    this.game.events.on(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pause, this);
    // Game-level listeners outlive the scene, so `cleanUp` removes them when it shuts down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
  }

  /**
   * Per-frame loop: reads input and handles pause first, then advances every board and the logic of the current phase.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms; capped by `MAX_FRAME_MS` before use.
   */
  update(_time: number, delta: number): void {
    // Cap the step so a long frame (e.g. after a tab switch) cannot jump the level clocks, the glides or the banner timers.
    const dt = Math.min(delta, MAX_FRAME_MS);
    // Input comes first: this frame's held keys become at most one waiting step for each player.
    for (const input of this.inputs) input.poll(dt);
    // Polled every frame, even when unused, so its idea of what is held is never stale when the pause menu opens.
    const padEvents = this.menuPad.poll();
    // Esc or P, or a controller's Start (which MenuPadInput ignores if it was already held when the level opened).
    const pausePressed = this.pauseRequested || padEvents.start;
    this.pauseRequested = false;

    // While paused only the pause menu is driven; the clocks, the runners and the banners stay frozen.
    if (this.paused) {
      this.updatePauseMenu(padEvents, pausePressed);
      return;
    }
    // A pause press opens the menu and skips the rest of this frame; `pause` refuses once the level has ended.
    if (pausePressed && this.pause()) return;

    this.phaseMs += dt; // time in the current phase
    // Each board moves its runner and applies its own rules every frame, in every phase (a board that is not playing only animates).
    for (const board of this.boards) board.update(dt);
    // Run the logic of the current phase; each one may call `enter` to move on.
    switch (this.phase) {
      case 'intro':
        if (this.phaseMs >= INTRO_MS) {
          for (const board of this.boards) board.begin();
          this.enter('playing');
        }
        break;
      case 'playing':
        this.updatePlaying();
        break;
      case 'cleared':
        this.updateCleared();
        break;
      case 'gameOver':
        this.updateGameOver();
        break;
    }
    this.syncHud();
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

  /** Checks every board once they have moved: the level goes on, is cleared when everyone has escaped, or ends the match. */
  private updatePlaying(): void {
    const end = decideLevelEnd(this.boards.map((board) => board.status));
    if (end.kind === 'cleared') {
      // Everyone is out, so the first escaper's "waiting for the other player" note no longer applies.
      for (const board of this.boards) board.stop();
      this.enter('cleared');
    } else if (end.kind === 'over') {
      this.endMatch(end.winner);
    }
  }

  /**
   * Ends the match because a player ran out of lives: the boards of everyone still running freeze, and a versus game says who won.
   *
   * @param winner - The 0-based player who won, or null when nobody did (a lone player who lost, or both at once).
   */
  private endMatch(winner: number | null): void {
    const versus = this.run.playerCount > 1;
    if (versus) this.match = { winner, reason: 'eliminated' };
    this.boards.forEach((board, player) => {
      board.stop();
      // A solo player's TRAPPED banner is already up, and so is a versus loser's; the winner, or both after a draw, get a message.
      if (!versus) return;
      if (winner === null) board.announce('DRAW!', 'Nobody has any lives left', GAME_OVER_MS);
      else if (player === winner) board.announce('YOU WIN!', 'The other player ran out of lives', GAME_OVER_MS);
    });
    this.enter('gameOver');
  }

  /** After the celebration, hands over to the level-complete screen with the run advanced by this level. */
  private updateCleared(): void {
    if (this.phaseMs < CLEAR_MS) return;
    // Every board has a result by now, since the level is only cleared once everyone has escaped; the check only narrows the type.
    const results = this.boards.flatMap((board) => (board.result ? [board.result] : []));
    if (results.length !== this.boards.length) return;
    const data: LevelCompleteData = {
      run: completeLevel(this.run, results.map((result) => result.score.points)), // next level, with this level's points added to each total
      results,
      firstEscaper: this.firstEscaper,
      theme: this.theme,
    };
    this.scene.start(SceneKey.LevelComplete, data);
  }

  /** After the final banners, opens the result screen with the end of the match. */
  private updateGameOver(): void {
    if (this.phaseMs < GAME_OVER_MS) return;
    // The run stays on the level that was being played. A player who had already escaped keeps that level's points; the others earn nothing for it.
    const earned = this.boards.map((board) => board.result?.score.points ?? 0);
    const data: ResultData = { run: bankPoints(this.run, earned), won: false, match: this.match ?? undefined };
    this.scene.start(SceneKey.Result, data);
  }

  /**
   * Called by a board when its player escapes, to find out whether anyone was out before them.
   *
   * @param player - 0-based number of the player who has just escaped.
   * @returns True when they are the first out; the first claim is remembered for the level-complete screen.
   */
  private claimFirstPlace(player: number): boolean {
    if (this.firstEscaper !== null) return false;
    this.firstEscaper = player;
    return true;
  }

  /** Copies every board's lives, clock and score to the status bar; the bar only redraws what changed. */
  private syncHud(): void {
    this.boards.forEach((board, player) => {
      this.hud.setTime(player, board.elapsedMs);
      this.hud.setLives(player, board.lives);
      // The score on screen includes this level's points as soon as the runner is out; `run` itself only advances when the next scene starts.
      this.hud.setScore(player, this.run.totals[player] + (board.result?.score.points ?? 0));
    });
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
    // Drop any waiting step and release the touch pads, so nothing fires when play resumes.
    for (const input of this.inputs) input.discard();
    for (const touchPad of this.touchPads) touchPad.release();
    // Phaser keeps animations running outside the scene's update, so the walk cycles are frozen explicitly.
    for (const board of this.boards) board.setPaused(true);
    this.pauseOverlay.show();
    return true;
  }

  /** Closes the pause menu and carries on with the level. */
  private resume(): void {
    this.paused = false;
    this.pauseOverlay.hide();
    for (const board of this.boards) board.setPaused(false);
    // The key or tap that chose Resume, or any key held meanwhile, must not also move a runner.
    for (const input of this.inputs) input.discard();
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
   * Shows the touch pads the first time a finger touches the screen, for touch screens that were not detected at start-up,
   * then stops listening.
   *
   * @param pointer - The pointer that went down; a mouse click is ignored.
   */
  private revealTouchPad(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    for (const touchPad of this.touchPads) touchPad.setVisible(true);
    // One reveal is enough, so the listener removes itself.
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
  }

  /** Removes everything that outlives the scene: game-level listeners, claimed keys and the baked maze textures. */
  private cleanUp(): void {
    // Game-level events outlive this scene: left in place they would keep calling `pause` on it and pile up with every new level.
    this.game.events.off(Phaser.Core.Events.BLUR, this.pause, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.pause, this);
    // Harmless if `revealTouchPad` already removed it.
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.revealTouchPad, this);
    // Hands the keys back so none is left registered after the scene ends.
    for (const input of this.inputs) input.dispose();
    // Also removes the baked maze textures, so the next level can bake new ones under the same keys.
    for (const board of this.boards) board.destroy();
  }
}
