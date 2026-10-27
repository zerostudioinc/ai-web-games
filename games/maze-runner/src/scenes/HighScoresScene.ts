// Top-5 scores for each difficulty, side by side.
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, DIFFICULTY_COLORS, GAME_WIDTH, MAX_FRAME_MS, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { TOP_SCORE_COUNT, loadTopScores } from '../systems/highScores';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { formatScore } from '../systems/score';

const INPUT_DELAY_MS = 400; // after the screen opens, so a key or button held from the previous screen is ignored
const PANEL_WIDTH = 420;
const PANEL_SPACING = 480;
const PANEL_TOP = 190;
const HEADING_HEIGHT = 70;
const ROW_HEIGHT = 66;
const PANEL_HEIGHT = HEADING_HEIGHT + TOP_SCORE_COUNT * ROW_HEIGHT + 20;
const MEDALS = [0xffd54f, 0xcfd8dc, 0xd7955a, 0x90a4ae, 0x90a4ae] as const; // gold, silver, bronze, then plain

export class HighScoresScene extends Phaser.Scene {
  private title!: TitleBanner;
  private pad!: MenuPadInput;
  private sinceOpenMs = 0; // counted from frame deltas

  constructor() {
    super(SceneKey.HighScores);
  }

  init(): void {
    this.sinceOpenMs = 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    this.title = new TitleBanner(this, cx, [{ text: 'HIGH SCORES', y: 105, size: 96, top: '#fff59d', bottom: '#ff7043' }]);

    DIFFICULTIES.forEach((difficulty, index) => {
      this.drawPanel(cx + (index - (DIFFICULTIES.length - 1) / 2) * PANEL_SPACING, difficulty);
    });

    const { width, height, fontSize, margin } = CORNER_BUTTON;
    new Button(this, margin + width / 2, margin + height / 2 - 2, { width, height, label: 'Back', fontSize, color: 0x90caf9, onClick: () => this.back() });
    this.add.text(cx, 664, 'Press Esc, Enter or H (or controller A / Start) to go back', labelStyle(20)).setOrigin(0.5);

    onKeyPress(this, ['ESC', 'ENTER', 'SPACE', 'H'], () => this.back());
    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.sinceOpenMs += dt;
    this.title.update(dt);
    const events = this.pad.poll();
    if (events.confirm || events.start || events.select) this.back();
  }

  private drawPanel(x: number, difficulty: Difficulty): void {
    const left = x - PANEL_WIDTH / 2;
    const ink = hex(COLOR.ink);

    panelImage(this, x, PANEL_TOP + PANEL_HEIGHT / 2, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      radius: 20,
      fill: COLOR.cream,
      heading: { height: HEADING_HEIGHT, color: DIFFICULTY_COLORS[difficulty] },
    });
    this.add.text(x, PANEL_TOP + HEADING_HEIGHT / 2, DIFFICULTY_SETTINGS[difficulty].label, plainStyle(40, ink)).setOrigin(0.5);

    // One row per rank; empty ranks show a dash.
    const scores = loadTopScores(difficulty);
    for (let rank = 0; rank < TOP_SCORE_COUNT; rank++) {
      const y = PANEL_TOP + HEADING_HEIGHT + 10 + rank * ROW_HEIGHT + ROW_HEIGHT / 2;
      const score = scores[rank];
      this.add.circle(left + 44, y, 22, MEDALS[rank]).setStrokeStyle(3, COLOR.ink);
      this.add.text(left + 44, y, `${rank + 1}`, plainStyle(28, ink)).setOrigin(0.5);
      this.add.text(left + PANEL_WIDTH - 32, y, score === undefined ? '-' : formatScore(score), plainStyle(40, score === undefined ? '#9aa9b3' : ink)).setOrigin(1, 0.5);
    }
  }

  private back(): void {
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Menu);
  }
}
