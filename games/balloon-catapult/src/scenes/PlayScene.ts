/**
 * The game itself: catapults, reticles, bombs, balloons, waves, scoring, pause, and the end-of-game flow.
 */
import Phaser from 'phaser';
import {
  BALLOON_SPEED,
  BOMB_STOP_X,
  CATAPULT_X,
  FIELD_BOUNDS,
  FIELD_TOP,
  GAME_WIDTH,
  MAX_FLIGHT_MS,
  MAX_FRAME_MS,
  MAX_PLAYERS,
  MIN_FLIGHT_MS,
  PLAYER_COLORS,
  RETICLE_SPEED,
  SPLASH_RADIUS,
  SceneKey,
  catapultY,
  fieldTextureKey,
  laneCenterY,
  laneCountFor,
} from '../config';
import { Balloon } from '../entities/Balloon';
import { Bomb } from '../entities/Bomb';
import { Catapult } from '../entities/Catapult';
import { Hud } from '../entities/Hud';
import { PauseOverlay } from '../entities/PauseOverlay';
import { Reticle } from '../entities/Reticle';
import { Splash } from '../entities/Splash';
import { flightTimeMs, indicesInRadius, targetPlayerForLane } from '../systems/combat';
import { clampToBounds, stepReticle } from '../systems/movement';
import { PlayerInputSystem } from '../systems/PlayerInputSystem';
import { MenuPadInput } from '../systems/MenuPadInput';
import { POINTS_PER_BOMB, bestScore, recordScore } from '../systems/score';
import { TOTAL_WAVES, WaveDirector } from '../systems/waves';
import { bombLanes, bombSpeed, isDifficulty, type Difficulty } from '../systems/difficulty';

const END_DELAY_MS = 1500; // pause between the game being decided and the result screen, so the banner can be read
const EXPLOSION_COLOR = 0xff7043; // colour of the ring when a bomb explodes on a catapult
const EXPLOSION_RADIUS = 60; // px

/** How a game ended. */
type Outcome = 'won' | 'lost';

/** Runs one game from the first wave to victory or defeat. */
export class PlayScene extends Phaser.Scene {
  private playerCount = 1; // number of players (1 to 4)
  private laneCount = laneCountFor(1); // lanes on the field, derived from the player count
  private difficulty: Difficulty = 'normal'; // chosen on the difficulty screen
  private controls!: PlayerInputSystem; // keyboard, mouse, touch and controller input for every player
  private pauseNav!: MenuPadInput; // controller navigation of the pause menu
  private hud!: Hud; // score, wave and per-player status display
  private pauseOverlay!: PauseOverlay; // the pause menu
  private director!: WaveDirector; // decides when waves start and bombs spawn

  // Live game objects; catapults and reticles have one entry per player, in player order.
  private catapults: Catapult[] = [];
  private reticles: Reticle[] = []; // aiming crosshairs
  private bombs: Bomb[] = []; // bombs currently walking
  private balloons: Balloon[] = []; // balloons currently in flight
  private splashes: Splash[] = []; // splash and explosion rings currently playing

  private score = 0; // bombs destroyed this game
  private startingHighScore = 0; // best saved score when the game began
  private paused = false; // true while the pause menu is open
  private outcome: Outcome | null = null; // set once the game is won or lost
  private endTimerMs = 0; // time since the outcome was decided

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Play);
  }

  /**
   * Reads the scene data and resets all per-game state; Phaser calls this before `create()` on every start.
   *
   * @param data - Scene data from the difficulty screen: `players` (clamped to 1 to 4) and `difficulty` (defaults to normal when missing or invalid).
   */
  init(data: { players?: number; difficulty?: Difficulty }): void {
    this.playerCount = Phaser.Math.Clamp(data.players ?? 1, 1, MAX_PLAYERS);
    this.laneCount = laneCountFor(this.playerCount);
    this.difficulty = isDifficulty(data.difficulty) ? data.difficulty : 'normal';
    this.catapults = [];
    this.reticles = [];
    this.bombs = [];
    this.balloons = [];
    this.splashes = [];
    this.score = 0;
    this.paused = false;
    this.outcome = null;
    this.endTimerMs = 0;
  }

  /** Builds the field, one catapult and reticle per player, the HUD, the pause menu, input handling and the wave director. */
  create(): void {
    this.add.image(0, FIELD_TOP, fieldTextureKey(this.laneCount)).setOrigin(0);

    // Each player's catapult stands in their lane; their reticle starts in the same row, 55% of the way across.
    for (let i = 0; i < this.playerCount; i++) {
      const y = catapultY(i, this.playerCount);
      this.catapults.push(new Catapult(this, CATAPULT_X, y, PLAYER_COLORS[i]));
      this.reticles.push(new Reticle(this, GAME_WIDTH * 0.55, y, PLAYER_COLORS[i], `P${i + 1}`));
    }

    this.hud = new Hud(this, this.playerCount, () => this.setPaused(!this.paused));
    this.pauseOverlay = new PauseOverlay(
      this,
      () => this.setPaused(false),
      () => this.quitToMenu(),
    );
    this.controls = new PlayerInputSystem(this, this.playerCount);
    this.pauseNav = new MenuPadInput(this);

    // While paused, Up/Down move the pause-menu highlight and Enter activates it.
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', () => this.paused && this.pauseOverlay.move(-1));
    keyboard?.on('keydown-DOWN', () => this.paused && this.pauseOverlay.move(1));
    keyboard?.on('keydown-ENTER', () => this.paused && this.pauseOverlay.activateSelected());
    this.director = new WaveDirector(bombLanes(this.difficulty, this.laneCount));
    this.startingHighScore = bestScore(this.difficulty);

    // Release the input listeners when the scene stops so restarts do not stack handlers.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  /**
   * Per-frame game loop: input and pause handling first, then movement, combat, waves and the HUD.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    this.controls.poll();
    const nav = this.pauseNav.poll(); // polled every frame so held buttons never read as new presses

    // Esc / P / Start toggles the pause, except once the game has been decided.
    if (this.controls.pausePressed() && this.outcome === null) this.setPaused(!this.paused);
    // While paused nothing moves; taps are discarded and the controller drives the pause menu instead.
    if (this.paused) {
      this.controls.discard();
      if (nav.up) this.pauseOverlay.move(-1);
      if (nav.down) this.pauseOverlay.move(1);
      if (nav.confirm) this.pauseOverlay.activateSelected();
      return;
    }

    // Cap the step so a long frame (e.g. after switching tabs) cannot teleport everything.
    const dt = Math.min(delta, MAX_FRAME_MS);

    // Once decided, only the visual effects play out until the result screen opens.
    if (this.outcome !== null) {
      this.updateSplashes(dt);
      this.endTimerMs += dt;
      if (this.endTimerMs >= END_DELAY_MS) this.showResult(this.outcome);
      return;
    }

    // Normal frame: players act, things move and collide, waves progress, then the HUD refreshes.
    this.updatePlayers(dt);
    this.updateBalloons(dt);
    this.updateBombs(dt);
    this.updateSplashes(dt);
    this.updateWaves(dt);
    if (this.outcome === null) this.refreshHud();
  }

  /**
   * Steers each player's reticle and fires their catapult when asked.
   *
   * @param dt - Frame time in ms, already capped by `MAX_FRAME_MS`.
   */
  private updatePlayers(dt: number): void {
    for (let i = 0; i < this.playerCount; i++) {
      const catapult = this.catapults[i];
      const reticle = this.reticles[i];
      catapult.tick(dt);
      // A wrecked catapult can no longer aim or fire.
      if (catapult.isWrecked) {
        reticle.setVisible(false);
        continue;
      }

      // A touch/mouse aim point jumps the reticle there; otherwise keyboard or controller input steers it.
      const aim = this.controls.consumeAim(i);
      const next = aim
        ? clampToBounds(aim, FIELD_BOUNDS)
        : stepReticle({ x: reticle.x, y: reticle.y }, this.controls.getMove(i), RETICLE_SPEED, dt, FIELD_BOUNDS);
      reticle.setPosition(next.x, next.y);

      // Fire when requested and reloaded; the reticle dims while the catapult reloads.
      if (this.controls.firePressed(i) && catapult.canFire) this.fire(i);
      reticle.setReady(catapult.canFire);
    }
  }

  /**
   * Launches a balloon from a player's catapult at their reticle and starts the reload.
   *
   * @param playerIndex - 0-based index of the player who fired.
   */
  private fire(playerIndex: number): void {
    const catapult = this.catapults[playerIndex];
    const reticle = this.reticles[playerIndex];
    const origin = catapult.launchPoint;
    const target = { x: reticle.x, y: reticle.y };
    // Farther shots stay in the air longer, within the min and max flight time.
    const duration = flightTimeMs(Math.hypot(target.x - origin.x, target.y - origin.y), BALLOON_SPEED, MIN_FLIGHT_MS, MAX_FLIGHT_MS);

    this.balloons.push(new Balloon(this, origin, target, duration, PLAYER_COLORS[playerIndex]));
    catapult.startCooldown();
  }

  /**
   * Advances every balloon in flight; one that lands splashes and is removed.
   *
   * @param dt - Frame time in ms.
   */
  private updateBalloons(dt: number): void {
    // Keep the balloons still flying; a landed one splashes and is destroyed.
    this.balloons = this.balloons.filter((balloon) => {
      if (!balloon.advance(dt)) return true;
      this.splash(balloon.target.x, balloon.target.y, balloon.color);
      balloon.destroy();
      return false;
    });
  }

  /**
   * Shows a splash ring and destroys every bomb inside it, scoring a point for each.
   *
   * @param x - Splash centre x in px.
   * @param y - Splash centre y in px.
   * @param color - Ring colour (the shooter's colour).
   */
  private splash(x: number, y: number, color: number): void {
    this.splashes.push(new Splash(this, x, y, SPLASH_RADIUS, color));

    // Find the bombs inside the splash, then drop them from the list (and the scene) while scoring.
    const hits = new Set(indicesInRadius(this.bombs.map((bomb) => ({ x: bomb.x, y: bomb.y })), { x, y }, SPLASH_RADIUS));
    // Keep the bombs outside the splash; each one inside scores and is destroyed.
    this.bombs = this.bombs.filter((bomb, index) => {
      if (!hits.has(index)) return true;
      this.score += POINTS_PER_BOMB;
      bomb.destroy();
      return false;
    });
  }

  /**
   * Walks every bomb; one that reaches the catapults explodes and damages one.
   * The game is lost when every catapult is wrecked.
   *
   * @param dt - Frame time in ms.
   */
  private updateBombs(dt: number): void {
    // Walk every bomb; one that has reached the catapults explodes there and leaves the list.
    this.bombs = this.bombs.filter((bomb) => {
      bomb.advance(dt);
      if (bomb.x > BOMB_STOP_X) return true;
      this.hitCatapult(bomb);
      bomb.destroy();
      return false;
    });

    if (this.catapults.every((catapult) => catapult.isWrecked)) this.finish('lost');
  }

  /**
   * Applies a bomb's explosion: shows the effect and damages the nearest catapult still standing.
   *
   * @param bomb - The bomb that reached the catapults.
   */
  private hitCatapult(bomb: Bomb): void {
    const target = targetPlayerForLane(
      bomb.lane,
      this.playerCount,
      this.catapults.map((catapult) => !catapult.isWrecked),
    );
    this.splashes.push(new Splash(this, bomb.x, bomb.y, EXPLOSION_RADIUS, EXPLOSION_COLOR));
    if (target !== null) this.catapults[target].takeHit();
  }

  /**
   * Advances the splash and explosion rings; finished ones are removed.
   *
   * @param dt - Frame time in ms.
   */
  private updateSplashes(dt: number): void {
    // Keep the rings still playing; a finished one is destroyed.
    this.splashes = this.splashes.filter((splash) => {
      if (!splash.advance(dt)) return true;
      splash.destroy();
      return false;
    });
  }

  /**
   * Lets the wave director spawn bombs; ends the game in victory once the last wave is cleared.
   *
   * @param dt - Frame time in ms.
   */
  private updateWaves(dt: number): void {
    if (this.outcome !== null) return;

    const update = this.director.update(dt, this.bombs.length);
    // Bombs spawn at the wave's current speed, in the lane centres the director chose.
    for (const lane of update.spawnLanes) {
      this.bombs.push(new Bomb(this, lane, laneCenterY(lane, this.laneCount), bombSpeed(this.difficulty, this.director.wave)));
    }
    if (this.director.phase === 'victory') this.finish('won');
  }

  /**
   * Marks the game as won or lost and shows the banner; the result screen opens after `END_DELAY_MS`.
   * Only the first call counts.
   *
   * @param outcome - How the game ended.
   */
  private finish(outcome: Outcome): void {
    if (this.outcome !== null) return;
    this.outcome = outcome;
    this.hud.setScore(this.score);
    this.hud.setBanner(outcome === 'won' ? 'Victory!' : 'Game Over');
  }

  /**
   * Saves the score and opens the result screen.
   *
   * @param outcome - How the game ended.
   */
  private showResult(outcome: Outcome): void {
    const { top, rank } = recordScore(this.difficulty, this.score);
    this.scene.start(SceneKey.Result, {
      won: outcome === 'won',
      score: this.score,
      highScore: top[0] ?? 0,
      rank,
      wave: Math.max(1, this.director.wave),
      players: this.playerCount,
      difficulty: this.difficulty,
    });
  }

  /** Saves the score reached so far (quitting still counts) and returns to the main menu. */
  private quitToMenu(): void {
    recordScore(this.difficulty, this.score);
    this.scene.start(SceneKey.Menu);
  }

  /**
   * Pauses or resumes the game by showing or hiding the pause menu. Ignored once the game is decided.
   *
   * @param paused - True to pause, false to resume.
   */
  private setPaused(paused: boolean): void {
    if (this.outcome !== null) return;
    this.paused = paused;
    if (paused) {
      this.pauseOverlay.show();
    } else {
      this.pauseOverlay.hide();
      this.controls.discard(); // a tap on Resume must not aim or fire
    }
  }

  /** Copies the current score, wave, bomb count and per-player status onto the HUD. */
  private refreshHud(): void {
    this.hud.setScore(this.score);
    // The best score updates live once the player beats the saved one.
    this.hud.setHighScore(Math.max(this.startingHighScore, this.score));
    this.hud.setWave(Math.max(1, this.director.wave), TOTAL_WAVES);
    this.hud.setBombsRemaining(this.director.bombsRemaining(this.bombs.length));
    // Between waves the banner announces the next wave.
    this.hud.setBanner(this.director.phase === 'intermission' ? `Wave ${this.director.wave + 1}` : null);

    for (let i = 0; i < this.playerCount; i++) {
      this.hud.setPlayerStatus(i, this.statusLabel(i));
    }
  }

  /**
   * Text for a player's HUD status line: out, or which controls they are using.
   *
   * @param player - 0-based player index.
   * @returns The status text.
   */
  private statusLabel(player: number): string {
    if (this.catapults[player].isWrecked) return `P${player + 1}: out`;
    if (this.controls.isControllerConnected(player)) return `P${player + 1}: controller`;
    // Only player 1 has a keyboard/mouse/touch fallback; the others are prompted to wake a controller.
    if (player === 0) return this.playerCount === 1 ? 'P1: touch / keyboard / controller' : 'P1: keyboard / mouse / touch';
    return `P${player + 1}: press a button`;
  }
}
