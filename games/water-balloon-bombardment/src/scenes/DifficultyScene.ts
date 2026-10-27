import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, MAX_PLAYERS, SceneKey, TextureKey } from '../config';
import { labelStyle } from '../style';
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';

const INPUT_DELAY_MS = 400;
const BUTTON_COLORS: Record<Difficulty, number> = { easy: 0x81c784, normal: 0xffd54f, hard: 0xef5350 };
const KEY_NAMES = ['ONE', 'TWO', 'THREE'] as const;
const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 170;
const BUTTON_Y = 400;

export class DifficultyScene extends Phaser.Scene {
  private players = 1;
  private selected = 1; // Normal
  private title!: TitleBanner;
  private ring!: Phaser.GameObjects.Graphics;
  private pad!: MenuPadInput;
  private openedAt = 0;

  constructor() {
    super(SceneKey.Difficulty);
  }

  init(data: { players?: number }): void {
    this.players = Phaser.Math.Clamp(data.players ?? 1, 1, MAX_PLAYERS);
    this.selected = 1;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    this.title = new TitleBanner(this, cx, [{ text: 'CHOOSE DIFFICULTY', y: 140, size: 84, top: '#fff59d', bottom: '#ff7043' }]);
    this.add.text(cx, 250, `${this.players} ${this.players === 1 ? 'player' : 'players'}`, labelStyle(32)).setOrigin(0.5);

    this.ring = this.add.graphics();
    DIFFICULTIES.forEach((difficulty, index) => {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      new Button(this, this.buttonX(index), BUTTON_Y, {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        label: settings.label,
        subLabel: `${settings.startSpeed} px/s, +${settings.speedStep}/wave`,
        fontSize: 54,
        color: BUTTON_COLORS[difficulty],
        onClick: () => this.start(index),
      });
      this.input.keyboard?.on(`keydown-${KEY_NAMES[index]}`, () => this.start(index));
    });
    this.drawRing();

    new Button(this, 76, 39, { width: 112, height: 42, label: 'Back', fontSize: 22, color: 0x90caf9, onClick: () => this.back() });
    this.add
      .text(cx, 600, 'Click or press 1-3  |  Left/Right + Enter  |  Controller: D-pad + any button', labelStyle(20))
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.back());

    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    this.title.update(delta);

    const events = this.pad.poll();
    if (!this.acceptingInput()) return;
    if (events.left) this.moveSelection(-1);
    if (events.right) this.moveSelection(1);
    if (events.confirm) this.confirm();
  }

  private buttonX(index: number): number {
    return GAME_WIDTH / 2 + (index - 1) * 300;
  }

  private acceptingInput(): boolean {
    return this.time.now - this.openedAt >= INPUT_DELAY_MS;
  }

  private moveSelection(step: number): void {
    this.selected = Phaser.Math.Clamp(this.selected + step, 0, DIFFICULTIES.length - 1);
    this.drawRing();
  }

  private drawRing(): void {
    this.ring.clear();
    this.ring.lineStyle(6, 0xffffff).strokeRoundedRect(
      this.buttonX(this.selected) - BUTTON_WIDTH / 2 - 10,
      BUTTON_Y - BUTTON_HEIGHT / 2 - 10,
      BUTTON_WIDTH + 20,
      BUTTON_HEIGHT + 20,
      26,
    );
  }

  private confirm(): void {
    if (this.acceptingInput()) this.start(this.selected);
  }

  private start(index: number): void {
    this.scene.start(SceneKey.Play, { players: this.players, difficulty: DIFFICULTIES[index] });
  }

  private back(): void {
    this.scene.start(SceneKey.Menu);
  }
}
