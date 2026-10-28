/**
 * One player's side of a level: their own copy of the maze, the runner, the dead-end trap rule, the warning and the banners.
 * A solo game has one board in the middle of the screen; a versus game has two, side by side. The scene creates the boards,
 * starts them, feeds them the frame time and reads their status.
 */
import type Phaser from 'phaser';
import { Banner } from './Banner';
import { MazeView } from './MazeView';
import { Player } from './Player';
import { CLEAR_MS, GAME_OVER_MS, MAX_LIVES, RESPAWN_BLINK_MS, TRAP_MS, TextureKey, WAITING_MS } from '../config';
import { DIFFICULTY_SETTINGS, type Difficulty, type DifficultySettings } from '../systems/difficulty';
import type { BoardArea, MazeLayout } from '../systems/layout';
import { OPPOSITE, stepCell, type Cell, type Direction, type Maze } from '../systems/maze';
import type { Random } from '../systems/rng';
import type { LevelResult } from '../systems/run';
import { formatScore, levelScore } from '../systems/score';
import type { ThemePalette } from '../systems/themes';
import { isTrapped, shouldWarn } from '../systems/trap';
import type { PlayerStatus } from '../systems/versus';
import type { PlayerInputSystem } from '../systems/PlayerInputSystem';

/**
 * Stage of one player's level; `enter` moves between them.
 *
 * waiting    - the level intro is showing; the runner cannot move yet
 * playing    - the runner can move and the clock runs
 * trapping   - a step sprang the dead-end trap; waiting for the runner to arrive in the doomed cell
 * trapped    - the path has sealed; pausing before the runner is sent back to the start
 * escaping   - the runner is walking out through the exit gap
 * escaped    - the runner is out: the level score is known and the player waits for the others
 * eliminated - out of lives
 * stopped    - the match ended while this player was still running; nothing moves any more
 */
type BoardPhase = 'waiting' | 'playing' | 'trapping' | 'trapped' | 'escaping' | 'escaped' | 'eliminated' | 'stopped';

/** The part of a player's input the board uses: the next step to take, and a way to drop the ones that arrived too early. */
export type StepSource = Pick<PlayerInputSystem, 'takeStep' | 'discard'>;

/** What a board needs to be built. */
export interface BoardOptions {
  index: number; // 0-based player number; it picks the runner's outfit
  area: BoardArea; // the part of the screen that belongs to this player
  layout: MazeLayout; // where the maze sits and how large its cells are
  maze: Maze; // this player's own copy of the level's maze; the board seals passages in it
  palette: ThemePalette; // colours and wall style of the level's theme
  random: Random; // random source for the maze decoration; the same sequence paints the same picture
  textureKey: string; // key of the baked maze texture; every board on screen needs its own
  difficulty: Difficulty; // the mode being played: it sets the trap depth, the warning and the score multiplier
  level: number; // 1-based level being played
  parMs: number; // par time of the level's maze, ms
  input: StepSource; // where this player's steps come from
  compact: boolean; // true on a half-width board, which uses smaller banners and a thinner warning frame
  /** Versus only: called when this player escapes; it returns true if nobody has escaped before them. */
  claimFirstPlace?: () => boolean;
}

const WARNING_TOAST_MS = 2400; // how long the "Careful!" toast stays up, ms

/** One player's maze, runner and rules. Create one per player per level, call `update` every frame and `destroy` when the level ends. */
export class PlayerBoard {
  readonly maze: Maze; // this player's maze, including the passages currently sealed
  private readonly view: MazeView; // draws the maze, the exit portal and the slabs over sealed passages
  private readonly runner: Player; // the runner on screen
  private readonly banner: Banner; // large message over the board: the level intro, TRAPPED!, ESCAPED!
  private readonly toast: Banner; // small message at the top of the board: the dead-end warning, which only Easy shows
  private readonly warningFrame: Phaser.GameObjects.Rectangle; // red outline round the board, shown while a trap is one step away (Easy only)
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter; // confetti burst at the exit when the player escapes
  private readonly settings: DifficultySettings; // rules of the chosen difficulty: trap depth, whether it warns, whether seals stay blocked
  private readonly input: StepSource; // where this player's steps come from
  private readonly claimFirstPlace?: () => boolean; // see `BoardOptions`

  private phase: BoardPhase = 'waiting'; // current stage; see `BoardPhase`
  private phaseMs = 0; // time spent in the current phase, ms; reset by `enter`
  private clockMs = 0; // this player's level clock, ms; it runs while playing and through a trap, but not during the intro or the exit walk
  private livesLeft = MAX_LIVES; // lives left on this level; every level starts with `MAX_LIVES`
  private cell: Cell; // cell the runner is in (0-based column and row); it changes as soon as a step starts, ahead of the glide
  // Wall to raise once the runner reaches the doomed cell: `direction` is the side of `cell` to close; null when no trap is pending.
  private pendingSeal: { cell: Cell; direction: Direction } | null = null;
  private levelResult: LevelResult | null = null; // how the level went, set when the runner escapes; null before that
  private inDanger = false; // true while one more step would spring the trap and the mode warns (Easy); stays false on the other modes
  private warningLevel = 0; // how visible the warning frame is, 0 (hidden) to 1 (full); eased toward its target
  private warningClockMs = 0; // time driving the pulse of the warning frame, ms

  /**
   * Builds the board's maze, runner, banners and effects. The runner stands on the start cell, waiting for `begin`.
   *
   * @param scene - Scene everything is added to.
   * @param options - See `BoardOptions`.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: BoardOptions,
  ) {
    const { index, area, layout, maze, palette, random, textureKey, difficulty, compact } = options;
    this.maze = maze;
    this.settings = DIFFICULTY_SETTINGS[difficulty];
    this.input = options.input;
    this.claimFirstPlace = options.claimFirstPlace;
    this.cell = maze.start; // the runner begins in the middle of the maze

    // The maze is baked into one texture with the exit portal beside it, and the runner stands on the start cell.
    this.view = new MazeView(scene, maze, layout, palette, random, textureKey);
    this.runner = new Player(scene, layout, maze.start, index);

    // A big banner for the board's events, and a small toast near the top of the board for the dead-end warning.
    const cx = area.frame.x + area.frame.width / 2; // x of the board's centre line, px
    this.banner = new Banner(scene, compact ? { x: cx, y: area.maze.y + area.maze.height * 0.45, titleSize: 56, subtitleSize: 24 } : { x: cx, y: 330, titleSize: 96, subtitleSize: 36 });
    this.toast = new Banner(scene, compact ? { x: cx, y: area.maze.y + 26, titleSize: 20, subtitleSize: 14 } : { x: cx, y: 112, titleSize: 30, subtitleSize: 20 });

    // Red outline just inside the board's frame; it starts invisible and `updateWarning` fades it.
    // Depth 40 draws it above the maze and runner, below the touch pad (45) and the status bar (50).
    const { frame } = area;
    this.warningFrame = scene.add
      .rectangle(frame.x + frame.width / 2, frame.y + frame.height / 2, frame.width - 6, frame.height - 6)
      .setStrokeStyle(compact ? 10 : 14, 0xff1744)
      .setDepth(40)
      .setAlpha(0);
    // Confetti for the escape: tinted sparks fly out in every direction and fall under gravity. `emitting: false` keeps it
    // silent until `explode` fires a burst at the exit. Depth 65 draws it above the banner (60).
    this.confetti = scene.add
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
  }

  /**
   * Where the player stands in the level.
   *
   * @returns `escaped` once the runner is out, `eliminated` when no lives are left, otherwise `racing`.
   */
  get status(): PlayerStatus {
    if (this.phase === 'escaped') return 'escaped';
    if (this.phase === 'eliminated') return 'eliminated';
    return 'racing';
  }

  /**
   * Lives left on this level.
   *
   * @returns A number from 0 to `MAX_LIVES`.
   */
  get lives(): number {
    return this.livesLeft;
  }

  /**
   * The player's level clock.
   *
   * @returns Time in ms since the level began, including time lost to traps; it stops when the runner leaves the maze.
   */
  get elapsedMs(): number {
    return this.clockMs;
  }

  /**
   * How the level went for this player.
   *
   * @returns The escape time, par time and score breakdown, or null until the runner has escaped.
   */
  get result(): LevelResult | null {
    return this.levelResult;
  }

  /**
   * Shows a message over the board.
   *
   * @param title - Main line of text.
   * @param subtitle - Smaller second line; an empty string leaves it out.
   * @param durationMs - How long the message stays up, ms.
   */
  announce(title: string, subtitle: string, durationMs: number): void {
    this.banner.show(title, subtitle, durationMs);
  }

  /** Lets the runner move and starts the clock; the scene calls it when the level intro ends. */
  begin(): void {
    this.enter('playing');
  }

  /**
   * Ends the level for this board from outside, once the level or the match is over: hides the warning or "waiting" note, and
   * freezes a runner who is still running, so nothing moves and no trap can spring any more.
   */
  stop(): void {
    this.toast.hide(); // a warning or a "waiting" note no longer applies
    // A player who has escaped or been eliminated is already still.
    if (this.phase === 'eliminated' || this.phase === 'escaped') return;
    this.pendingSeal = null;
    this.inDanger = false;
    this.enter('stopped');
  }

  /**
   * Advances the runner, the clock and the rules by one frame. Call it every frame the game is not paused.
   *
   * @param deltaMs - Time since the previous frame, in ms, already capped by the scene.
   */
  update(deltaMs: number): void {
    // Steps only count in the playing phase; anything pressed during a banner or animation is dropped,
    // and a key held through it has to be released and pressed again before it counts.
    if (this.phase !== 'playing') this.input.discard();

    // Update the runner first so a step that finishes this frame lets the next one start in the same frame.
    this.runner.update(deltaMs);
    this.phaseMs += deltaMs; // time in the current phase

    // The clock keeps running through a trap and its banner, which is part of the cost of a wrong turn.
    // It stops once the runner is on the way out, and while a banner is all that is left.
    if (this.phase === 'playing' || this.phase === 'trapping' || this.phase === 'trapped') this.clockMs += deltaMs;
    // Run the logic of the current phase; each one may call `enter` to move on.
    switch (this.phase) {
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
      default:
        break; // waiting, escaped, eliminated and stopped have nothing to run
    }

    // Animations and timers that run in every phase: the portal pulse, the banners and the warning frame.
    this.view.update(deltaMs);
    this.banner.update(deltaMs);
    this.toast.update(deltaMs);
    this.updateWarning(deltaMs);
  }

  /**
   * Freezes or resumes the runner's walk cycle and the confetti; Phaser runs both outside the scene's own update, so pausing needs this.
   *
   * @param paused - True to freeze them, false to let them continue.
   */
  setPaused(paused: boolean): void {
    this.runner.setPaused(paused);
    if (paused) this.confetti.pause();
    else this.confetti.resume();
  }

  /** Removes what outlives the scene: the baked maze texture, which the next level replaces. */
  destroy(): void {
    this.view.destroy();
  }

  /**
   * Switches to another phase and restarts the phase timer.
   *
   * @param phase - The phase to enter.
   */
  private enter(phase: BoardPhase): void {
    this.phase = phase;
    this.phaseMs = 0;
  }

  /** Takes the next waiting step, once the runner has finished the previous one. */
  private updatePlaying(): void {
    // One square at a time: wait for the glide to finish before taking the next key press.
    if (this.runner.isMoving) return;
    // A press made mid-glide is held by the input system and handed out here once the glide ends.
    const direction = this.input.takeStep();
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
      this.runner.bump(direction);
      return;
    }

    // The step is allowed: the sprite starts gliding at once, even if the target lies outside the grid (the exit).
    const next = stepCell(this.cell, direction);
    this.runner.moveTo(next, direction);

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
      this.toast.show(this.options.compact ? 'Careful! One more step seals the path!' : 'Careful! One more step and the path seals behind you!', '', WARNING_TOAST_MS);
      this.input.discard();
    }
    // Remember the state; stepping out of danger switches the warning frame off again.
    this.inDanger = danger;
  }

  /**
   * Waits for the runner to reach the doomed cell, then seals the path behind them, costs a life and shows the TRAPPED banner.
   * The last life eliminates the player instead of sending the runner back to the start.
   */
  private updateTrapping(): void {
    // Wait for the runner to reach the doomed cell, then bring the wall down behind them.
    if (this.runner.isMoving || !this.pendingSeal) return;
    const { cell, direction } = this.pendingSeal; // the doomed cell and the side of it to close
    this.pendingSeal = null; // consumed, so the seal happens only once

    // The wall goes up for real; it stays for the rest of the level unless the mode reopens it (see `updateTrapped`).
    this.maze.seal(cell, direction);
    // The view only draws the slab; the call above is what actually blocks the way.
    this.view.sealPassage(cell, direction);
    // Feedback: a 260 ms camera shake (solo only: it would shake the other player's board too), the runner reeling for TRAP_MS and one heart less.
    if (!this.options.compact) this.scene.cameras.main.shake(260, 0.006);
    this.runner.stun(TRAP_MS);
    this.livesLeft -= 1;
    this.toast.hide(); // the dead-end warning no longer applies

    // Out of lives: a longer banner, and the player is out. Otherwise the runner is sent back once the banner is done.
    if (this.livesLeft <= 0) {
      this.banner.show('TRAPPED!', 'No lives left', GAME_OVER_MS);
      this.enter('eliminated');
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
    this.runner.respawn(this.maze.start, RESPAWN_BLINK_MS); // blinks for RESPAWN_BLINK_MS so the restart point is easy to see
    this.enter('playing');
  }

  /** Once the runner has walked out through the exit gap, works out the level's score and starts the celebration. */
  private updateEscaping(): void {
    // Wait for the runner to finish the walk out through the gap.
    if (this.runner.isMoving) return;

    // The clock stopped when the exit walk began, so `clockMs` is the escape time, with any time lost to traps included.
    const { level, parMs, difficulty } = this.options;
    const score = levelScore(level, this.clockMs, parMs, difficulty);
    this.levelResult = { level, elapsedMs: this.clockMs, parMs, score };
    // Celebrate: 48 confetti sparks burst from the exit portal while the runner hops for joy.
    const exit = this.view.exitPosition;
    this.confetti.explode(48, exit.x, exit.y);
    this.runner.cheer(CLEAR_MS);
    // In versus the first player out says so; the other has to wait for the rest of the race.
    const first = this.claimFirstPlace?.() ?? false;
    this.banner.show(first ? 'ESCAPED FIRST!' : 'ESCAPED!', `+${formatScore(score.points)} points`, CLEAR_MS);
    if (this.claimFirstPlace) this.toast.show('Waiting for the other player...', '', WAITING_MS);
    this.enter('escaped');
  }

  /**
   * Fades a red frame in and out around the board while a trap is one step away. Only Easy ever raises `inDanger`.
   *
   * @param deltaMs - Frame time in ms, already capped by the scene.
   */
  private updateWarning(deltaMs: number): void {
    this.warningClockMs += deltaMs; // time driving the pulse below
    // The frame shows only while in danger during play; any other phase fades it out.
    const target = this.inDanger && this.phase === 'playing' ? 1 : 0;
    // Ease toward the target so the frame fades instead of snapping (a time constant of about 120 ms).
    this.warningLevel += (target - this.warningLevel) * Math.min(1, deltaMs / 120);
    // A throb between 30% and 100% opacity, about twice a second, scaled by how far the frame has faded in.
    const pulse = 0.65 + 0.35 * Math.sin(this.warningClockMs * 0.012);
    this.warningFrame.setAlpha(this.warningLevel * pulse);
  }
}
