import Phaser from 'phaser';
import {
  CATAPULT_X,
  FIELD_BOUNDS,
  FIELD_TOP,
  GAME_WIDTH,
  LANE_COUNT,
  LANE_HEIGHT,
  MAX_PLAYERS,
  PLAYER_COLORS,
  RETICLE_SPEED,
  SceneKey,
  catapultY,
} from '../config';
import { Catapult } from '../entities/Catapult';
import { Reticle } from '../entities/Reticle';
import { clampToBounds, stepReticle } from '../systems/movement';
import { PlayerInputSystem } from '../systems/PlayerInputSystem';

const FONT = 'sans-serif';

export class PlayScene extends Phaser.Scene {
  private playerCount = 1;
  private controls!: PlayerInputSystem;
  private reticles: Reticle[] = [];
  private statusTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SceneKey.Play);
  }

  init(data: { players?: number }): void {
    this.playerCount = Phaser.Math.Clamp(data.players ?? 1, 1, MAX_PLAYERS);
    this.reticles = [];
    this.statusTexts = [];
  }

  create(): void {
    this.drawLanes();

    for (let i = 0; i < this.playerCount; i++) {
      const color = PLAYER_COLORS[i];
      const y = catapultY(i, this.playerCount);
      new Catapult(this, CATAPULT_X, y, color);
      this.reticles.push(new Reticle(this, GAME_WIDTH * 0.55, y, color, `P${i + 1}`));
      this.statusTexts.push(
        this.add.text(20 + i * 300, 14, '', { fontFamily: FONT, fontSize: '20px', color: Phaser.Display.Color.IntegerToColor(color).rgba }),
      );
    }

    this.add
      .text(GAME_WIDTH - 20, 14, 'Menu', { fontFamily: FONT, fontSize: '24px', color: '#10222d', backgroundColor: '#b0d4e3', padding: { x: 12, y: 6 } })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, () => this.scene.start(SceneKey.Menu));

    this.controls = new PlayerInputSystem(this, this.playerCount);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  update(_time: number, delta: number): void {
    for (let i = 0; i < this.playerCount; i++) {
      const reticle = this.reticles[i];
      const aim = this.controls.consumeAim(i);
      const next = aim
        ? clampToBounds(aim, FIELD_BOUNDS)
        : stepReticle({ x: reticle.x, y: reticle.y }, this.controls.getMove(i), RETICLE_SPEED, delta, FIELD_BOUNDS);
      reticle.setPosition(next.x, next.y);

      this.statusTexts[i].setText(this.statusLabel(i));
    }
  }

  private statusLabel(player: number): string {
    if (this.controls.isControllerConnected(player)) return `P${player + 1}: controller`;
    return player === 0 ? 'P1: keyboard / touch' : `P${player + 1}: press a controller button`;
  }

  private drawLanes(): void {
    const g = this.add.graphics();
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      g.fillStyle(lane % 2 === 0 ? 0x1c4a5e : 0x18404f).fillRect(0, FIELD_TOP + lane * LANE_HEIGHT, GAME_WIDTH, LANE_HEIGHT);
    }
    g.lineStyle(2, 0x0b1d2a);
    for (let lane = 0; lane <= LANE_COUNT; lane++) {
      g.lineBetween(0, FIELD_TOP + lane * LANE_HEIGHT, GAME_WIDTH, FIELD_TOP + lane * LANE_HEIGHT);
    }
  }
}
