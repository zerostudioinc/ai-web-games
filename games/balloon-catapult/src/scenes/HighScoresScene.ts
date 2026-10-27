import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, DIFFICULTY_COLORS, GAME_WIDTH, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTIES, DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';
import { TOP_SCORE_COUNT, loadTopScores } from '../systems/score';

const INPUT_DELAY_MS = 400;
const PANEL_WIDTH = 270;
const PANEL_SPACING = 295;
const PANEL_TOP = 235;
const HEADING_HEIGHT = 64;
const ROW_HEIGHT = 78;
const PANEL_HEIGHT = HEADING_HEIGHT + TOP_SCORE_COUNT * ROW_HEIGHT + 20;
const MEDALS = [0xffd54f, 0xcfd8dc, 0xd7955a] as const; // gold, silver, bronze

export class HighScoresScene extends Phaser.Scene {
  private title!: TitleBanner;
  private pad!: MenuPadInput;
  private openedAt = 0;

  constructor() {
    super(SceneKey.HighScores);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    this.title = new TitleBanner(this, cx, [{ text: 'HIGH SCORES', y: 125, size: 96, top: '#fff59d', bottom: '#ff7043' }]);

    DIFFICULTIES.forEach((difficulty, index) => {
      const x = cx + (index - (DIFFICULTIES.length - 1) / 2) * PANEL_SPACING;
      this.drawPanel(x, difficulty);
    });

    const { width, height, fontSize, margin } = CORNER_BUTTON;
    new Button(this, margin + width / 2, margin + height / 2 - 2, { width, height, label: 'Back', fontSize, color: 0x90caf9, onClick: () => this.back() });
    this.add.text(cx, 660, 'Press Esc or any controller button to go back', labelStyle(20)).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.input.keyboard?.on('keydown-ENTER', () => this.back());
    this.input.keyboard?.on('keydown-SPACE', () => this.back());
    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    this.title.update(delta);
    if (this.pad.poll().confirm && this.time.now - this.openedAt >= INPUT_DELAY_MS) this.back();
  }

  private drawPanel(x: number, difficulty: (typeof DIFFICULTIES)[number]): void {
    const left = x - PANEL_WIDTH / 2;
    const ink = hex(COLOR.ink);
    const panel = this.add.graphics();
    panel.fillStyle(COLOR.ink, 0.35).fillRoundedRect(left, PANEL_TOP + 8, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.fillStyle(COLOR.cream).fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.fillStyle(DIFFICULTY_COLORS[difficulty]).fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, HEADING_HEIGHT, { tl: 20, tr: 20, bl: 0, br: 0 });
    panel.lineStyle(4, COLOR.ink).strokeRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.lineBetween(left, PANEL_TOP + HEADING_HEIGHT, left + PANEL_WIDTH, PANEL_TOP + HEADING_HEIGHT);
    this.add.text(x, PANEL_TOP + HEADING_HEIGHT / 2, DIFFICULTY_SETTINGS[difficulty].label, plainStyle(36, ink)).setOrigin(0.5);

    const scores = loadTopScores(difficulty);
    for (let rank = 0; rank < TOP_SCORE_COUNT; rank++) {
      const y = PANEL_TOP + HEADING_HEIGHT + 10 + rank * ROW_HEIGHT + ROW_HEIGHT / 2;
      const score = scores[rank];
      this.add.circle(left + 42, y, 22, MEDALS[rank]).setStrokeStyle(3, COLOR.ink);
      this.add.text(left + 42, y, `${rank + 1}`, plainStyle(28, ink)).setOrigin(0.5);
      this.add.text(left + PANEL_WIDTH - 30, y, score === undefined ? '-' : `${score}`, plainStyle(44, score === undefined ? '#9aa9b3' : ink)).setOrigin(1, 0.5);
    }
  }

  private back(): void {
    this.scene.start(SceneKey.Menu);
  }
}
