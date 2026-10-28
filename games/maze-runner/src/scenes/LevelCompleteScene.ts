/**
 * Level-complete screen, shown after each cleared level: time, par and how each player's score was worked out.
 * A solo game shows one card; a versus game shows one per player, side by side, and marks who escaped first.
 */
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_HEIGHT, GAME_WIDTH, MAX_FRAME_MS, PLAYER_COLORS, SceneKey, themeTextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { isRunComplete, type LevelResult, type RunState } from '../systems/run';
import { formatScore, formatTime } from '../systems/score';
import type { ThemeId } from '../systems/themes';
import { matchWinner } from '../systems/versus';
import type { PlaySceneData } from './PlayScene';
import type { ResultData } from './ResultScene';

/** Scene data sent by PlayScene when every player has escaped a maze. */
export interface LevelCompleteData {
  /** The run after the cleared level has been added to it: the level counter has moved on and each total includes this level's points. */
  run: RunState;
  results: LevelResult[]; // how the cleared level went for each player, in player order: its number, escape time, par time and score breakdown
  firstEscaper: number | null; // versus: the 0-based player who escaped first; null in a solo game
  theme: ThemeId; // theme of the cleared level: it backs this screen
}

/** The position and size of a score card, in px; `x` and `y` are its top-left corner. */
interface PanelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const INPUT_DELAY_MS = 700; // ms after the screen opens during which input is ignored, so the press that ended the level cannot skip this screen
const SOLO_PANEL: PanelBox = { x: 340, y: 165, width: 600, height: 420 }; // the score card of a solo game
const VERSUS_PANELS: readonly PanelBox[] = [
  { x: 90, y: 150, width: 520, height: 440 },
  { x: 670, y: 150, width: 520, height: 440 },
]; // the two cards of a versus game, one per player, side by side
const HEADING_HEIGHT = 56; // height of the coloured strip with the player's name on a versus card, px
const ROW_START = 36; // distance from the card's top edge (or the bottom of its name strip) to the centre of the first row, px
const ROW_STEP = 44; // distance between the centres of neighbouring rows on a solo card, px
const PADDING = 40; // space between a solo card's left and right edges and the text, px

/** Summary of the level just cleared; continues to the next level, or to the final result after the last one. */
export class LevelCompleteScene extends Phaser.Scene {
  private run!: RunState; // the run after the cleared level was added to it
  private results!: LevelResult[]; // how the cleared level went for each player
  private firstEscaper: number | null = null; // versus: the player who escaped first
  private theme!: ThemeId; // theme of the cleared level
  private title!: TitleBanner; // animated "LEVEL n CLEARED!" heading
  private pad!: MenuPadInput; // controller input; a confirm or Start press continues
  // Time since the screen opened, ms. Counted from frame deltas, since `time.now` can be stale right after a restart.
  private sinceOpenMs = 0;

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.LevelComplete);
  }

  /**
   * Stores the cleared level's data and restarts the open-time counter; Phaser calls this before `create()` on every start.
   *
   * @param data - Scene data from PlayScene (see `LevelCompleteData`).
   */
  init(data: LevelCompleteData): void {
    this.run = data.run;
    this.results = data.results;
    this.firstEscaper = data.firstEscaper;
    this.theme = data.theme;
    this.sinceOpenMs = 0;
  }

  /** Builds the dimmed backdrop, the heading, the score cards, the continue button and the key hint, then starts listening for input. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px

    // The level's own background, dimmed, keeps the sense of where the runner just was.
    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    // Black layer at 55% opacity over the whole screen.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
    // Heading names the level just cleared (1-based); every player cleared the same one.
    this.title = new TitleBanner(this, cx, [{ text: `LEVEL ${this.results[0].level} CLEARED!`, y: 90, size: 80, top: '#fff59d', bottom: '#ff7043' }]);

    // One score card per player: in the middle of the screen when solo, side by side in versus.
    this.results.forEach((_, player) => this.drawPanel(player));

    // `run` is already advanced, so this is true after the final level, when the next stop is the result screen.
    const last = isRunComplete(this.run);
    // Continue button; its label tells the player what comes next.
    new Button(this, cx, 640, {
      width: 340,
      height: 76,
      label: last ? 'See results' : 'Next level',
      fontSize: 40,
      color: 0x81c784,
      onClick: () => this.proceed(),
    });
    // Key hint under the button.
    this.add.text(cx, 696, 'Press Enter or controller A / Start to continue', labelStyle(18)).setOrigin(0.5);

    // Keyboard shortcuts; `onKeyPress` ignores auto-repeat and removes the listeners when the scene shuts down.
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.proceed());
    // Created last, so a controller button already held when the screen opens is not read as a press.
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and continues when a controller button asks to.
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
    // Any face button or Start continues.
    if (events.confirm || events.start) this.proceed();
  }

  /**
   * A cream card listing each step of one player's score calculation, ending with the level score and the running total.
   * The rows follow the formula: base value x speed bonus x difficulty multiplier = level score.
   * A versus card is a little smaller, and has a strip with the player's name (and a marker for the first one out) on top.
   *
   * @param player - 0-based player number whose card is drawn.
   */
  private drawPanel(player: number): void {
    const versus = this.results.length > 1;
    const panel = versus ? VERSUS_PANELS[player] : SOLO_PANEL; // where the card goes
    const { score, elapsedMs, parMs, level } = this.results[player]; // score breakdown, escape and par times (ms), 1-based level number
    const ink = hex(COLOR.ink); // dark text colour as a CSS string
    const padding = versus ? 30 : PADDING; // space between the card's edges and the text, px
    const rowStep = versus ? 40 : ROW_STEP; // distance between the centres of neighbouring rows, px
    const left = panel.x + padding; // x of the labels' left edge, px
    const right = panel.x + panel.width - padding; // x of the values' right edge, px
    const top = panel.y + (versus ? HEADING_HEIGHT : 0); // y where the rows start counting from, px

    // Cream card, drawn first so the text lands on top; `panelImage` wants the card's centre, not its corner.
    // On a versus card the top strip is in the player's colour.
    panelImage(this, panel.x + panel.width / 2, panel.y + panel.height / 2, {
      width: panel.width,
      height: panel.height,
      radius: 24,
      fill: COLOR.cream,
      heading: versus ? { height: HEADING_HEIGHT, color: PLAYER_COLORS[player] } : undefined,
    });
    if (versus) {
      this.add.text(left, panel.y + HEADING_HEIGHT / 2, `PLAYER ${player + 1}`, plainStyle(34, ink)).setOrigin(0, 0.5);
      // The first one out of the maze gets a marker at the right end of the strip.
      if (this.firstEscaper === player) this.add.text(right, panel.y + HEADING_HEIGHT / 2, 'FIRST OUT!', plainStyle(28, ink)).setOrigin(1, 0.5);
    }

    // Label and value of each row: the two times, the level's base value, then the speed and difficulty multipliers.
    const rows: [string, string][] = [
      ['Escape time', formatTime(elapsedMs)],
      ['Par time', formatTime(parMs)],
      [`Level ${level} value`, formatScore(score.base)],
      ['Speed bonus', `x${score.timeFactor.toFixed(2)}`],
      [`${DIFFICULTY_SETTINGS[this.run.difficulty].label} mode`, `x${score.difficultyMultiplier.toFixed(2)}`],
    ];
    // Labels are left-aligned and values right-aligned, each row centred on its own y.
    rows.forEach(([label, value], index) => {
      const y = top + ROW_START + index * rowStep;
      this.add.text(left, y, label, plainStyle(versus ? 26 : 28, ink)).setOrigin(0, 0.5);
      this.add.text(right, y, value, plainStyle(versus ? 26 : 28, ink)).setOrigin(1, 0.5);
    });

    // A thin rule just under the last row, 3 px tall and half opaque, separates the workings from the result.
    const dividerY = top + ROW_START + rows.length * rowStep - 8;
    this.add.rectangle(panel.x + panel.width / 2, dividerY, right - left, 3, COLOR.ink, 0.5);

    // Result lines: this level's points (large, orange), then the running total, which already includes them.
    const scoreY = dividerY + (versus ? 40 : 44);
    this.add.text(left, scoreY, 'Level score', plainStyle(versus ? 30 : 34, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY, `+${formatScore(score.points)}`, plainStyle(versus ? 44 : 50, '#c2410c')).setOrigin(1, 0.5);
    this.add.text(left, scoreY + (versus ? 50 : 56), 'Total score', plainStyle(versus ? 26 : 28, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY + (versus ? 50 : 56), formatScore(this.run.totals[player]), plainStyle(versus ? 30 : 34, ink)).setOrigin(1, 0.5);
  }

  /**
   * Moves on: to the next level, or to the result screen once the final level has been cleared.
   * Ignored until `INPUT_DELAY_MS` has passed, so the press that ended the level cannot skip this screen.
   */
  private proceed(): void {
    // A key or button still held from the gameplay must not skip this screen straight away.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    // Every level cleared: the run is won. In versus the higher total takes the match (a tie is a draw).
    if (isRunComplete(this.run)) {
      const versus = this.run.playerCount > 1;
      const data: ResultData = {
        run: this.run,
        won: true,
        match: versus ? { winner: matchWinner(this.run.totals), reason: 'completed' } : undefined,
      };
      this.scene.start(SceneKey.Result, data);
      return;
    }
    // The next level gets the updated run, which carries the theme of every level.
    const next: PlaySceneData = { run: this.run };
    this.scene.start(SceneKey.Play, next);
  }
}
