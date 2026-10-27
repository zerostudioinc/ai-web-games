import Phaser from 'phaser';
import { Bomb } from '../entities/Bomb';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, MAX_PLAYERS, PLAYER_COLORS, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { loadHighScore } from '../systems/score';
import { isFireButtonDown } from '../systems/PlayerInputSystem';

const INPUT_DELAY_MS = 700; // so a button held from the previous screen doesn't start a game
const HOME_URL = '../../index.html'; // from games/<name>/index.html to the site homepage

const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR'] as const;
const CLOUDS = [
  { x: 180, y: 90, scale: 1, speed: 14 },
  { x: 620, y: 40, scale: 0.8, speed: 9 },
  { x: 980, y: 230, scale: 1.2, speed: 18 },
  { x: 420, y: 250, scale: 0.7, speed: 11 },
];

export class MenuScene extends Phaser.Scene {
  private title!: TitleBanner;
  private clouds: { image: Phaser.GameObjects.Image; speed: number }[] = [];
  private walkers: Bomb[] = [];
  private openedAt = 0;

  constructor() {
    super(SceneKey.Menu);
  }

  init(): void {
    this.clouds = [];
    this.walkers = [];
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    for (const cloud of CLOUDS) {
      this.clouds.push({ image: this.add.image(cloud.x, cloud.y, TextureKey.Cloud).setScale(cloud.scale).setAlpha(0.95), speed: cloud.speed });
    }

    this.title = new TitleBanner(this, cx, [
      { text: 'WATER BALLOON', y: 120, size: 92, top: '#ffffff', bottom: '#81d4fa' },
      { text: 'BOMBARDMENT', y: 235, size: 118, top: '#fff59d', bottom: '#ff7043' },
    ]);

    new Button(this, GAME_WIDTH - 76, 39, {
      width: 112,
      height: 42,
      label: 'Home',
      fontSize: 22,
      color: 0x90caf9,
      onClick: () => window.location.assign(HOME_URL),
    });
    this.add.image(cx - 500, 130, TextureKey.Balloon).setScale(2.6).setTint(PLAYER_COLORS[0]).setRotation(-0.25);
    this.add.image(cx + 500, 130, TextureKey.Balloon).setScale(2.6).setTint(PLAYER_COLORS[1]).setRotation(0.25);
    this.add.image(cx + 470, 245, TextureKey.BombBody).setScale(1.5).setRotation(0.15);
    this.add.image(cx - 470, 245, TextureKey.Balloon).setScale(2.2).setTint(PLAYER_COLORS[2]).setRotation(-0.15);

    this.add.text(cx, 345, 'How many players?', labelStyle(36)).setOrigin(0.5);
    for (let n = 1; n <= MAX_PLAYERS; n++) {
      new Button(this, cx - 330 + (n - 1) * 220, 440, {
        width: 170,
        height: 120,
        label: `${n}`,
        subLabel: n === 1 ? 'PLAYER' : 'PLAYERS',
        fontSize: 56,
        color: PLAYER_COLORS[n - 1],
        onClick: () => this.startGame(n),
      });
      this.input.keyboard?.on(`keydown-${KEY_NAMES[n - 1]}`, () => this.startGame(n));
    }

    this.drawBestScoreSign(cx, 548);
    this.add.text(cx, 600, 'Tap a number or press 1-4  |  Controller: any button starts one player per controller', labelStyle(20)).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const walker = new Bomb(this, 0, 40 + i * 10);
      walker.setPosition(150 + i * 480, 678);
      this.walkers.push(walker);
    }
  }

  update(_time: number, delta: number): void {
    this.title.update(delta);

    for (const { image, speed } of this.clouds) {
      image.x += speed * (delta / 1000);
      if (image.x > GAME_WIDTH + 140) image.x = -140;
    }
    for (const walker of this.walkers) {
      walker.advance(delta);
      if (walker.x < -50) walker.x = GAME_WIDTH + 50;
    }

    if (this.time.now - this.openedAt >= INPUT_DELAY_MS) this.pollControllers();
  }

  private pollControllers(): void {
    let connected = 0;
    let pressed = false;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.input.gamepad?.getPad(i);
      if (!pad?.connected) continue;
      connected += 1;
      if (isFireButtonDown(pad)) pressed = true;
    }
    if (pressed) this.startGame(connected);
  }

  private drawBestScoreSign(x: number, y: number): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLOR.ink, 0.35).fillRoundedRect(x - 150, y - 20, 300, 52, 14);
    panel.fillStyle(COLOR.cream).fillRoundedRect(x - 150, y - 26, 300, 52, 14);
    panel.lineStyle(3, COLOR.ink).strokeRoundedRect(x - 150, y - 26, 300, 52, 14);
    this.add.text(x, y, `BEST SCORE: ${loadHighScore()}`, plainStyle(28, hex(COLOR.ink))).setOrigin(0.5);
  }

  private startGame(players: number): void {
    this.scene.start(SceneKey.Play, { players });
  }
}
