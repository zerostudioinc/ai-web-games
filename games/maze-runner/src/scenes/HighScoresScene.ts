/**
 * High-score screen: the top-5 scores of each difficulty, side by side.
 */
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

const INPUT_DELAY_MS = 400; // ms after the screen opens during which input is ignored, so a key or button held from the previous screen does nothing
const PANEL_WIDTH = 420; // width of one score panel, px
const PANEL_SPACING = 480; // distance between the centres of neighbouring panels, px
const PANEL_TOP = 190; // y of the panels' top edge, px
const HEADING_HEIGHT = 70; // height of the coloured strip holding the difficulty name, px
const ROW_HEIGHT = 66; // height of one score row, px
// Heading, one row per rank, and 20 px of padding (10 px above the first row and 10 px below the last), px.
const PANEL_HEIGHT = HEADING_HEIGHT + TOP_SCORE_COUNT * ROW_HEIGHT + 20;
// Fill colour (0xRRGGBB) of each rank's medal, rank 1 first: gold, silver, bronze, then plain.
const MEDALS = [0xffd54f, 0xcfd8dc, 0xd7955a, 0x90a4ae, 0x90a4ae] as const;

/** Shows the saved top-5 scores of every difficulty; Back, Esc, Enter, Space, H or a controller button returns to the menu. */
export class HighScoresScene extends Phaser.Scene {
  private title!: TitleBanner; // animated "HIGH SCORES" heading
  private pad!: MenuPadInput; // controller input; a confirm, Start or Back/View press leaves the screen
  // Time since the screen opened, ms. Counted from frame deltas, since `time.now` can be stale right after a restart.
  private sinceOpenMs = 0;

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.HighScores);
  }

  /** Restarts the open-time counter; Phaser reuses this scene instance each time the screen opens. */
  init(): void {
    this.sinceOpenMs = 0;
  }

  /** Builds the backdrop, the title, one panel per difficulty, the Back button and the key hint, then starts listening for input. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    // Same backdrop as the menu.
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    // One-line title with a pale-yellow to orange gradient.
    this.title = new TitleBanner(this, cx, [{ text: 'HIGH SCORES', y: 105, size: 96, top: '#fff59d', bottom: '#ff7043' }]);

    // One panel per difficulty, spread evenly around the centre line (Normal on the left, Hard on the right).
    DIFFICULTIES.forEach((difficulty, index) => {
      this.drawPanel(cx + (index - (DIFFICULTIES.length - 1) / 2) * PANEL_SPACING, difficulty);
    });

    // Back button in the top-left corner, the same size and place as the menu's High Scores button.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    new Button(this, margin + width / 2, margin + height / 2 - 2, { width, height, label: 'Back', fontSize, color: 0x90caf9, onClick: () => this.back() });
    // Key hint near the bottom edge.
    this.add.text(cx, 664, 'Press Esc, Enter or H (or controller A / Start) to go back', labelStyle(20)).setOrigin(0.5);

    // Keyboard shortcuts; `onKeyPress` ignores auto-repeat and removes the listeners when the scene shuts down.
    onKeyPress(this, ['ESC', 'ENTER', 'SPACE', 'H'], () => this.back());
    // Created last, so a controller button already held when the screen opens is not read as a press.
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and leaves the screen when a controller button asks to.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    // Cap the step so a long frame (e.g. after a tab switch) cannot jump the animation or the input delay.
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.sinceOpenMs += dt;
    this.title.update(dt);
    // Polled every frame so a held button reports once, as a press, instead of every frame.
    const events = this.pad.poll();
    // Any face button, Start or Back/View goes back.
    if (events.confirm || events.start || events.select) this.back();
  }

  /**
   * Draws one difficulty's panel: a cream card with a coloured heading and one row per rank, filled from the saved scores.
   *
   * @param x - Centre x of the panel, px.
   * @param difficulty - Difficulty whose table is shown; it sets the heading's name and colour.
   */
  private drawPanel(x: number, difficulty: Difficulty): void {
    const left = x - PANEL_WIDTH / 2; // x of the panel's left edge, px
    const ink = hex(COLOR.ink); // dark text colour as a CSS string

    // Cream card with a heading strip in the difficulty's colour; its top edge sits at PANEL_TOP.
    panelImage(this, x, PANEL_TOP + PANEL_HEIGHT / 2, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      radius: 20,
      fill: COLOR.cream,
      heading: { height: HEADING_HEIGHT, color: DIFFICULTY_COLORS[difficulty] },
    });
    // Difficulty name centred in the heading strip.
    this.add.text(x, PANEL_TOP + HEADING_HEIGHT / 2, DIFFICULTY_SETTINGS[difficulty].label, plainStyle(40, ink)).setOrigin(0.5);

    // One row per rank; empty ranks show a dash.
    // `scores` is sorted highest first and holds fewer than TOP_SCORE_COUNT entries until the table fills up.
    const scores = loadTopScores(difficulty);
    for (let rank = 0; rank < TOP_SCORE_COUNT; rank++) {
      const y = PANEL_TOP + HEADING_HEIGHT + 10 + rank * ROW_HEIGHT + ROW_HEIGHT / 2; // centre y of this row, which starts 10 px below the heading
      const score = scores[rank]; // undefined when this rank is empty
      // Medal disc (44 px in from the left edge, 22 px radius) with the 1-based rank on it.
      this.add.circle(left + 44, y, 22, MEDALS[rank]).setStrokeStyle(3, COLOR.ink);
      this.add.text(left + 44, y, `${rank + 1}`, plainStyle(28, ink)).setOrigin(0.5);
      // The score is right-aligned 32 px in from the panel's right edge, in grey when the rank is empty.
      this.add.text(left + PANEL_WIDTH - 32, y, score === undefined ? '-' : formatScore(score), plainStyle(40, score === undefined ? '#9aa9b3' : ink)).setOrigin(1, 0.5);
    }
  }

  /** Returns to the main menu, unless the screen opened less than `INPUT_DELAY_MS` ago. */
  private back(): void {
    // A key or button still held from the previous screen must not close this one straight away.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Menu);
  }
}
