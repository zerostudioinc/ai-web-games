import Phaser from 'phaser';
import {
  BALLOON_SPEED,
  BOMB_STOP_X,
  CATAPULT_X,
  FIELD_BOUNDS,
  FIELD_TOP,
  GAME_WIDTH,
  LANE_COUNT,
  MAX_FLIGHT_MS,
  MAX_FRAME_MS,
  MAX_PLAYERS,
  MIN_FLIGHT_MS,
  PLAYER_COLORS,
  RETICLE_SPEED,
  SPLASH_RADIUS,
  SceneKey,
  TextureKey,
  catapultY,
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
import { POINTS_PER_BOMB, loadHighScore, recordScore } from '../systems/score';
import { TOTAL_WAVES, WaveDirector, bombSpeed } from '../systems/waves';

const END_DELAY_MS = 1500;
const EXPLOSION_COLOR = 0xff7043;
const EXPLOSION_RADIUS = 60;

type Outcome = 'won' | 'lost';

export class PlayScene extends Phaser.Scene {
  private playerCount = 1;
  private controls!: PlayerInputSystem;
  private hud!: Hud;
  private pauseOverlay!: PauseOverlay;
  private director!: WaveDirector;

  private catapults: Catapult[] = [];
  private reticles: Reticle[] = [];
  private bombs: Bomb[] = [];
  private balloons: Balloon[] = [];
  private splashes: Splash[] = [];

  private score = 0;
  private startingHighScore = 0;
  private paused = false;
  private outcome: Outcome | null = null;
  private endTimerMs = 0;

  constructor() {
    super(SceneKey.Play);
  }

  init(data: { players?: number }): void {
    this.playerCount = Phaser.Math.Clamp(data.players ?? 1, 1, MAX_PLAYERS);
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

  create(): void {
    this.add.image(0, FIELD_TOP, TextureKey.Field).setOrigin(0);

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
    this.director = new WaveDirector(LANE_COUNT);
    this.startingHighScore = loadHighScore();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  update(_time: number, delta: number): void {
    this.controls.poll();

    if (this.controls.pausePressed() && this.outcome === null) this.setPaused(!this.paused);
    if (this.paused) {
      this.controls.discard();
      return;
    }

    const dt = Math.min(delta, MAX_FRAME_MS);

    if (this.outcome !== null) {
      this.updateSplashes(dt);
      this.endTimerMs += dt;
      if (this.endTimerMs >= END_DELAY_MS) this.showResult(this.outcome);
      return;
    }

    this.updatePlayers(dt);
    this.updateBalloons(dt);
    this.updateBombs(dt);
    this.updateSplashes(dt);
    this.updateWaves(dt);
    if (this.outcome === null) this.refreshHud();
  }

  private updatePlayers(dt: number): void {
    for (let i = 0; i < this.playerCount; i++) {
      const catapult = this.catapults[i];
      const reticle = this.reticles[i];
      catapult.tick(dt);
      if (catapult.isWrecked) {
        reticle.setVisible(false);
        continue;
      }

      const aim = this.controls.consumeAim(i);
      const next = aim
        ? clampToBounds(aim, FIELD_BOUNDS)
        : stepReticle({ x: reticle.x, y: reticle.y }, this.controls.getMove(i), RETICLE_SPEED, dt, FIELD_BOUNDS);
      reticle.setPosition(next.x, next.y);

      if (this.controls.firePressed(i) && catapult.canFire) this.fire(i);
      reticle.setReady(catapult.canFire);
    }
  }

  private fire(playerIndex: number): void {
    const catapult = this.catapults[playerIndex];
    const reticle = this.reticles[playerIndex];
    const origin = catapult.launchPoint;
    const target = { x: reticle.x, y: reticle.y };
    const duration = flightTimeMs(Math.hypot(target.x - origin.x, target.y - origin.y), BALLOON_SPEED, MIN_FLIGHT_MS, MAX_FLIGHT_MS);

    this.balloons.push(new Balloon(this, origin, target, duration, PLAYER_COLORS[playerIndex]));
    catapult.startCooldown();
  }

  private updateBalloons(dt: number): void {
    this.balloons = this.balloons.filter((balloon) => {
      if (!balloon.advance(dt)) return true;
      this.splash(balloon.target.x, balloon.target.y, balloon.color);
      balloon.destroy();
      return false;
    });
  }

  private splash(x: number, y: number, color: number): void {
    this.splashes.push(new Splash(this, x, y, SPLASH_RADIUS, color));

    const hits = new Set(indicesInRadius(this.bombs.map((bomb) => ({ x: bomb.x, y: bomb.y })), { x, y }, SPLASH_RADIUS));
    this.bombs = this.bombs.filter((bomb, index) => {
      if (!hits.has(index)) return true;
      this.score += POINTS_PER_BOMB;
      bomb.destroy();
      return false;
    });
  }

  private updateBombs(dt: number): void {
    this.bombs = this.bombs.filter((bomb) => {
      bomb.advance(dt);
      if (bomb.x > BOMB_STOP_X) return true;
      this.hitCatapult(bomb);
      bomb.destroy();
      return false;
    });

    if (this.catapults.every((catapult) => catapult.isWrecked)) this.finish('lost');
  }

  private hitCatapult(bomb: Bomb): void {
    const catapult = this.catapults[targetPlayerForLane(bomb.lane, this.playerCount)];
    this.splashes.push(new Splash(this, bomb.x, bomb.y, EXPLOSION_RADIUS, EXPLOSION_COLOR));
    if (!catapult.isWrecked) catapult.takeHit();
  }

  private updateSplashes(dt: number): void {
    this.splashes = this.splashes.filter((splash) => {
      if (!splash.advance(dt)) return true;
      splash.destroy();
      return false;
    });
  }

  private updateWaves(dt: number): void {
    if (this.outcome !== null) return;

    const update = this.director.update(dt, this.bombs.length);
    for (const lane of update.spawnLanes) {
      this.bombs.push(new Bomb(this, lane, bombSpeed(this.director.wave)));
    }
    if (this.director.phase === 'victory') this.finish('won');
  }

  private finish(outcome: Outcome): void {
    if (this.outcome !== null) return;
    this.outcome = outcome;
    this.hud.setScore(this.score);
    this.hud.setBanner(outcome === 'won' ? 'Victory!' : 'Game Over');
  }

  private showResult(outcome: Outcome): void {
    const highScore = recordScore(this.score);
    this.scene.start(SceneKey.Result, {
      won: outcome === 'won',
      score: this.score,
      highScore,
      newHighScore: this.score > this.startingHighScore,
      wave: Math.max(1, this.director.wave),
      players: this.playerCount,
    });
  }

  private quitToMenu(): void {
    recordScore(this.score);
    this.scene.start(SceneKey.Menu);
  }

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

  private refreshHud(): void {
    this.hud.setScore(this.score);
    this.hud.setHighScore(Math.max(this.startingHighScore, this.score));
    this.hud.setWave(Math.max(1, this.director.wave), TOTAL_WAVES);
    this.hud.setBanner(this.director.phase === 'intermission' ? `Wave ${this.director.wave + 1}` : null);

    for (let i = 0; i < this.playerCount; i++) {
      this.hud.setPlayerStatus(i, this.statusLabel(i));
    }
  }

  private statusLabel(player: number): string {
    if (this.catapults[player].isWrecked) return `P${player + 1}: out`;
    if (this.controls.isControllerConnected(player)) return `P${player + 1}: controller`;
    if (player === 0) return this.playerCount === 1 ? 'P1: touch / keyboard / controller' : 'P1: keyboard / controller';
    return `P${player + 1}: press a button`;
  }
}
