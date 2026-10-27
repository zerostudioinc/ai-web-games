/**
 * High-score screen: the saved top three scores for every difficulty.
 */
import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, DIFFICULTY_COLORS, GAME_WIDTH, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTIES, DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';
import { TOP_SCORE_COUNT, loadTopScores } from '../systems/score';

const INPUT_DELAY_MS = 400; // ignore input this long after opening, so a button held from the last screen does not close it
const PANEL_WIDTH = 270; // width of one difficulty's panel, px
const PANEL_SPACING = 295; // distance between panel centres, px
const PANEL_TOP = 235; // y of the panels' top edge, px
const HEADING_HEIGHT = 64; // coloured strip with the difficulty name, px
const ROW_HEIGHT = 78; // height of one score row, px
const PANEL_HEIGHT = HEADING_HEIGHT + TOP_SCORE_COUNT * ROW_HEIGHT + 20; // heading, score rows and bottom padding
const MEDALS = [0xffd54f, 0xcfd8dc, 0xd7955a] as const; // gold, silver, bronze

/** Read-only screen listing the best scores of each difficulty. */
export class HighScoresScene extends Phaser.Scene {
  private title!: TitleBanner; // animated heading
  private pad!: MenuPadInput; // controller input, polled every frame
  private openedAt = 0; // scene time when it opened, for the input delay

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.HighScores);
  }

  /** Builds the title, one panel per difficulty, the Back button and the input bindings. */
  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    this.title = new TitleBanner(this, cx, [{ text: 'HIGH SCORES', y: 125, size: 96, top: '#fff59d', bottom: '#ff7043' }]);

    // Panels sit side by side, centred as a group.
    DIFFICULTIES.forEach((difficulty, index) => {
      const x = cx + (index - (DIFFICULTIES.length - 1) / 2) * PANEL_SPACING;
      this.drawPanel(x, difficulty);
    });

    // Back button in the top-left corner; Esc, Enter and Space also go back.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    new Button(this, margin + width / 2, margin + height / 2 - 2, { width, height, label: 'Back', fontSize, color: 0x90caf9, onClick: () => this.back() });
    this.add.text(cx, 660, 'Press Esc or any controller button to go back', labelStyle(20)).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.input.keyboard?.on('keydown-ENTER', () => this.back());
    this.input.keyboard?.on('keydown-SPACE', () => this.back());
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and goes back when a controller button is pressed.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    this.title.update(delta);
    // Polled every frame so a button held on arrival never counts as a press; the delay then guards the exit.
    if (this.pad.poll().confirm && this.time.now - this.openedAt >= INPUT_DELAY_MS) this.back();
  }

  /**
   * Draws one difficulty's card: a coloured heading, then a medal and score for each rank.
   *
   * @param x - Centre x of the card in px.
   * @param difficulty - The difficulty whose saved scores are shown.
   */
  private drawPanel(x: number, difficulty: (typeof DIFFICULTIES)[number]): void {
    const left = x - PANEL_WIDTH / 2;
    const ink = hex(COLOR.ink);
    // Card: soft drop shadow, cream body, coloured heading strip, outline and a divider under the heading.
    const panel = this.add.graphics();
    panel.fillStyle(COLOR.ink, 0.35).fillRoundedRect(left, PANEL_TOP + 8, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.fillStyle(COLOR.cream).fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.fillStyle(DIFFICULTY_COLORS[difficulty]).fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, HEADING_HEIGHT, { tl: 20, tr: 20, bl: 0, br: 0 });
    panel.lineStyle(4, COLOR.ink).strokeRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 20);
    panel.lineBetween(left, PANEL_TOP + HEADING_HEIGHT, left + PANEL_WIDTH, PANEL_TOP + HEADING_HEIGHT);
    this.add.text(x, PANEL_TOP + HEADING_HEIGHT / 2, DIFFICULTY_SETTINGS[difficulty].label, plainStyle(36, ink)).setOrigin(0.5);

    // One row per rank: a medal with the rank number on the left, the score on the right (a grey dash when empty).
    const scores = loadTopScores(difficulty);
    for (let rank = 0; rank < TOP_SCORE_COUNT; rank++) {
      const y = PANEL_TOP + HEADING_HEIGHT + 10 + rank * ROW_HEIGHT + ROW_HEIGHT / 2;
      const score = scores[rank];
      this.add.circle(left + 42, y, 22, MEDALS[rank]).setStrokeStyle(3, COLOR.ink);
      this.add.text(left + 42, y, `${rank + 1}`, plainStyle(28, ink)).setOrigin(0.5);
      this.add.text(left + PANEL_WIDTH - 30, y, score === undefined ? '-' : `${score}`, plainStyle(44, score === undefined ? '#9aa9b3' : ink)).setOrigin(1, 0.5);
    }
  }

  /** Returns to the main menu. */
  private back(): void {
    this.scene.start(SceneKey.Menu);
  }
}
