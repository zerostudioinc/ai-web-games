// End of a run: final score, whether it earned a place in the top five, and options to play again or return to the menu.
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, MAX_FRAME_MS, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { recordScore, type RecordedScore } from '../systems/highScores';
import { LEVEL_COUNT } from '../systems/levels';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { startRun, type RunState } from '../systems/run';
import { formatScore } from '../systems/score';

export interface ResultData {
  run: RunState;
  /** True when all ten mazes were cleared; false when the runner ran out of lives. */
  won: boolean;
}

const INPUT_DELAY_MS = 700; // after the screen opens, so the key or button that ended the run cannot skip it

export class ResultScene extends Phaser.Scene {
  private run!: RunState;
  private won = false;
  private recorded!: RecordedScore;
  private title!: TitleBanner;
  private pad!: MenuPadInput;
  private sinceOpenMs = 0; // counted from frame deltas

  constructor() {
    super(SceneKey.Result);
  }

  init(data: ResultData): void {
    this.run = data.run;
    this.won = data.won;
    this.sinceOpenMs = 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const ink = hex(COLOR.ink);
    const label = DIFFICULTY_SETTINGS[this.run.difficulty].label;

    // The score is saved once, when the screen opens; replaying starts a brand new run.
    this.recorded = recordScore(this.run.difficulty, this.run.totalScore);

    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    this.title = new TitleBanner(
      this,
      cx,
      this.won
        ? [{ text: 'YOU ESCAPED!', y: 110, size: 100, top: '#fff59d', bottom: '#ff7043' }]
        : [{ text: 'GAME OVER', y: 110, size: 100, top: '#ffcdd2', bottom: '#e53935' }],
    );
    this.add
      .text(cx, 200, this.won ? `All ${LEVEL_COUNT} mazes cleared on ${label}!` : `You reached level ${this.run.level} of ${LEVEL_COUNT} on ${label}`, labelStyle(32))
      .setOrigin(0.5);

    // Score card.
    panelImage(this, cx, 350, { width: 540, height: 200, radius: 24, fill: COLOR.cream });
    this.add.text(cx, 290, 'FINAL SCORE', plainStyle(30, '#6b7f8c')).setOrigin(0.5);
    this.add.text(cx, 365, formatScore(this.run.totalScore), plainStyle(96, ink)).setOrigin(0.5);

    const { rank, top } = this.recorded;
    const note =
      rank !== null ? `NEW HIGH SCORE!  #${rank + 1} on ${label}` : `Best on ${label}: ${top[0] === undefined ? '-' : formatScore(top[0])}`;
    this.add.text(cx, 506, note, labelStyle(rank !== null ? 38 : 28, rank !== null ? '#ffd54f' : undefined)).setOrigin(0.5);

    new Button(this, cx - 200, 610, { width: 340, height: 80, label: 'Play again', fontSize: 40, color: 0x81c784, onClick: () => this.playAgain() });
    new Button(this, cx + 200, 610, { width: 340, height: 80, label: 'Menu', fontSize: 40, color: 0x90caf9, onClick: () => this.toMenu() });
    this.add.text(cx, 680, 'Enter or controller A / Start: play again  |  Esc: menu', labelStyle(18)).setOrigin(0.5);

    onKeyPress(this, ['ENTER', 'SPACE'], () => this.playAgain());
    onKeyPress(this, ['ESC'], () => this.toMenu());
    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.sinceOpenMs += dt;
    this.title.update(dt);
    const events = this.pad.poll();
    if (events.confirm || events.start) this.playAgain();
  }

  private playAgain(): void {
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Play, { run: startRun(this.run.difficulty) });
  }

  private toMenu(): void {
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Menu);
  }
}
