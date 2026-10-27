// Shown after each cleared level: time, par and how the level's score was worked out.
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

export interface LevelCompleteData {
  /** The run after the cleared level has been added to it. */
  run: RunState;
  result: LevelResult;
  theme: ThemeId;
}

const INPUT_DELAY_MS = 700; // so the press that ended the level cannot skip this screen
const PANEL = { x: 340, y: 165, width: 600, height: 420 } as const;
const ROW_START = 36;
const ROW_STEP = 44;
const PADDING = 40;

export class LevelCompleteScene extends Phaser.Scene {
  private run!: RunState;
  private result!: LevelResult;
  private theme!: ThemeId;
  private title!: TitleBanner;
  private pad!: MenuPadInput;
  private sinceOpenMs = 0; // counted from frame deltas

  constructor() {
    super(SceneKey.LevelComplete);
  }

  init(data: LevelCompleteData): void {
    this.run = data.run;
    this.result = data.result;
    this.theme = data.theme;
    this.sinceOpenMs = 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // The level's own background, dimmed, keeps the sense of where the runner just was.
    this.add.image(0, 0, themeTextureKey(this.theme)).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
    this.title = new TitleBanner(this, cx, [{ text: `LEVEL ${this.result.level} CLEARED!`, y: 90, size: 80, top: '#fff59d', bottom: '#ff7043' }]);

    this.drawPanel();

    const last = isRunComplete(this.run);
    new Button(this, cx, 640, {
      width: 340,
      height: 76,
      label: last ? 'See results' : 'Next level',
      fontSize: 40,
      color: 0x81c784,
      onClick: () => this.proceed(),
    });
    this.add.text(cx, 696, 'Press Enter or controller A / Start to continue', labelStyle(18)).setOrigin(0.5);

    onKeyPress(this, ['ENTER', 'SPACE'], () => this.proceed());
    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.sinceOpenMs += dt;
    this.title.update(dt);
    const events = this.pad.poll();
    if (events.confirm || events.start) this.proceed();
  }

  /** A cream card listing each step of the score calculation, ending with the level score and the running total. */
  private drawPanel(): void {
    const { score, elapsedMs, parMs, level } = this.result;
    const ink = hex(COLOR.ink);
    const left = PANEL.x + PADDING;
    const right = PANEL.x + PANEL.width - PADDING;

    panelImage(this, PANEL.x + PANEL.width / 2, PANEL.y + PANEL.height / 2, { width: PANEL.width, height: PANEL.height, radius: 24, fill: COLOR.cream });

    const rows: [string, string][] = [
      ['Escape time', formatTime(elapsedMs)],
      ['Par time', formatTime(parMs)],
      [`Level ${level} value`, formatScore(score.base)],
      ['Speed bonus', `x${score.timeFactor.toFixed(2)}`],
      [`${DIFFICULTY_SETTINGS[this.run.difficulty].label} mode`, `x${score.difficultyMultiplier.toFixed(1)}`],
    ];
    rows.forEach(([label, value], index) => {
      const y = PANEL.y + ROW_START + index * ROW_STEP;
      this.add.text(left, y, label, plainStyle(28, ink)).setOrigin(0, 0.5);
      this.add.text(right, y, value, plainStyle(28, ink)).setOrigin(1, 0.5);
    });

    const dividerY = PANEL.y + ROW_START + rows.length * ROW_STEP - 8;
    this.add.rectangle(PANEL.x + PANEL.width / 2, dividerY, right - left, 3, COLOR.ink, 0.5);

    const scoreY = dividerY + 44;
    this.add.text(left, scoreY, 'Level score', plainStyle(34, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY, `+${formatScore(score.points)}`, plainStyle(50, '#c2410c')).setOrigin(1, 0.5);
    this.add.text(left, scoreY + 56, 'Total score', plainStyle(28, ink)).setOrigin(0, 0.5);
    this.add.text(right, scoreY + 56, formatScore(this.run.totalScore), plainStyle(34, ink)).setOrigin(1, 0.5);
  }

  private proceed(): void {
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    if (isRunComplete(this.run)) {
      this.scene.start(SceneKey.Result, { run: this.run, won: true });
      return;
    }
    const next: PlaySceneData = { run: this.run, previousTheme: this.theme };
    this.scene.start(SceneKey.Play, next);
  }
}
