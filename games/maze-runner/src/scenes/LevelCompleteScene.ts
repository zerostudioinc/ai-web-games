/**
 * Level-complete screen, shown after each cleared level: time, par and how the level's score was worked out.
 */
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_HEIGHT, GAME_WIDTH, MAX_FRAME_MS, SceneKey, themeTextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { isRunComplete, type LevelResult, type RunState } from '../systems/run';
import { formatScore, formatTime } from '../systems/score';
import type { ThemeId } from '../systems/themes';
import type { PlaySceneData } from './PlayScene';

/** Scene data sent by PlayScene when the runner escapes a maze. */
export interface LevelCompleteData {
  /** The run after the cleared level has been added to it: the level counter has moved on and the total includes this level's points. */
  run: RunState;
  result: LevelResult; // how the cleared level went: its number, escape time, par time and score breakdown
  theme: ThemeId; // theme of the cleared level: it backs this screen and is passed on so the next level looks different
}

const INPUT_DELAY_MS = 700; // ms after the screen opens during which input is ignored, so the press that ended the level cannot skip this screen
/** The score card: `x`/`y` is its top-left corner and `width`/`height` its size, all in px. */
const PANEL = { x: 340, y: 165, width: 600, height: 420 } as const;
const ROW_START = 36; // distance from the card's top edge to the centre of the first row, px
const ROW_STEP = 44; // distance between the centres of neighbouring rows, px
const PADDING = 40; // space between the card's left and right edges and the text, px

/** Summary of the level just cleared; continues to the next level, or to the final result after the last one. */
export class LevelCompleteScene extends Phaser.Scene {
  private run!: RunState; // the run after the cleared level was added to it
  private result!: LevelResult; // how the cleared level went
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
    this.result = data.result;
    this.theme = data.theme;
    this.sinceOpenMs = 0;
  }

  /** Builds the dimmed backdrop, the heading, the score card, the continue button and the key hint, then starts listening for input. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px

    // The level's own background, dimmed, keeps the sense of where the runner just was.
    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    // Black layer at 55% opacity over the whole screen.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
    // Heading names the level just cleared (1-based).
    this.title = new TitleBanner(this, cx, [{ text: `LEVEL ${this.result.level} CLEARED!`, y: 90, size: 80, top: '#fff59d', bottom: '#ff7043' }]);

    // The score card in the middle of the screen.
    this.drawPanel();

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
   * A cream card listing each step of the score calculation, ending with the level score and the running total.
   * The rows follow the formula: base value x speed bonus x difficulty multiplier = level score.
   */
  private drawPanel(): void {
    const { score, elapsedMs, parMs, level } = this.result; // score breakdown, escape and par times (ms), 1-based level number
    const ink = hex(COLOR.ink); // dark text colour as a CSS string
    const left = PANEL.x + PADDING; // x of the labels' left edge, px
    const right = PANEL.x + PANEL.width - PADDING; // x of the values' right edge, px

    // Plain cream card, drawn first so the text lands on top; `panelImage` wants the card's centre, not its corner.
    panelImage(this, PANEL.x + PANEL.width / 2, PANEL.y + PANEL.height / 2, { width: PANEL.width, height: PANEL.height, radius: 24, fill: COLOR.cream });

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
      const y = PANEL.y + ROW_START + index * ROW_STEP;
      this.add.text(left, y, label, plainStyle(28, ink)).setOrigin(0, 0.5);
      this.add.text(right, y, value, plainStyle(28, ink)).setOrigin(1, 0.5);
    });

    // A thin rule just under the last row, 3 px tall and half opaque, separates the workings from the result.
    const dividerY = PANEL.y + ROW_START + rows.length * ROW_STEP - 8;
    this.add.rectangle(PANEL.x + PANEL.width / 2, dividerY, right - left, 3, COLOR.ink, 0.5);

    // Result lines: this level's points (large, orange), then the running total, which already includes them.
    const scoreY = dividerY + 44;
    this.add.text(left, scoreY, 'Level score', plainStyle(34, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY, `+${formatScore(score.points)}`, plainStyle(50, '#c2410c')).setOrigin(1, 0.5);
    this.add.text(left, scoreY + 56, 'Total score', plainStyle(28, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY + 56, formatScore(this.run.totalScore), plainStyle(34, ink)).setOrigin(1, 0.5);
  }

  /**
   * Moves on: to the next level, or to the result screen once the final level has been cleared.
   * Ignored until `INPUT_DELAY_MS` has passed, so the press that ended the level cannot skip this screen.
   */
  private proceed(): void {
    // A key or button still held from the gameplay must not skip this screen straight away.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    // Every level cleared: the run is won.
    if (isRunComplete(this.run)) {
      this.scene.start(SceneKey.Result, { run: this.run, won: true });
      return;
    }
    // The next level gets the updated run and this level's theme, so it picks a different look.
    const next: PlaySceneData = { run: this.run, previousTheme: this.theme };
    this.scene.start(SceneKey.Play, next);
  }
}
