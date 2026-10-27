/**
 * End of a run: final score, whether it earned a place in the top five, and options to play again or return to the menu.
 */
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

/** Scene data sent when a run ends: by LevelCompleteScene after the final level (a win) or by PlayScene when the last life is lost. */
export interface ResultData {
  /** The run that ended: `difficulty` picks the score table, `totalScore` is the final score, and after a defeat `level` is the level being played. */
  run: RunState;
  /** True when every level was cleared; false when the runner ran out of lives. */
  won: boolean;
}

const INPUT_DELAY_MS = 700; // ms after the screen opens during which input is ignored, so the key or button that ended the run cannot skip it

/** Shows how a run ended, saves its score to the high-score table, and offers Play again or Menu. */
export class ResultScene extends Phaser.Scene {
  private run!: RunState; // the run that ended
  private won = false; // true when every maze was cleared, false when the runner ran out of lives
  private recorded!: RecordedScore; // outcome of saving the final score: the updated top-5 table and the rank earned
  private title!: TitleBanner; // animated "YOU ESCAPED!" or "GAME OVER" heading
  private pad!: MenuPadInput; // controller input; a confirm or Start press plays again
  // Time since the screen opened, ms. Counted from frame deltas, since `time.now` can be stale right after a restart.
  private sinceOpenMs = 0;

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Result);
  }

  /**
   * Stores how the run ended and restarts the open-time counter; Phaser calls this before `create()` on every start.
   *
   * @param data - Scene data from LevelCompleteScene (a win) or PlayScene (a defeat); see `ResultData`.
   */
  init(data: ResultData): void {
    this.run = data.run;
    this.won = data.won;
    this.sinceOpenMs = 0;
  }

  /** Saves the final score, then builds the heading, the score card, the high-score note, the buttons and the key hint. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    const ink = hex(COLOR.ink); // dark text colour as a CSS string
    const label = DIFFICULTY_SETTINGS[this.run.difficulty].label; // name of the difficulty played, e.g. "Normal"

    // The score is saved once, when the screen opens; replaying starts a brand new run.
    this.recorded = recordScore(this.run.difficulty, this.run.totalScore);

    // Same backdrop as the menu.
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    // Yellow-to-orange heading for a win, pink-to-red for a defeat.
    this.title = new TitleBanner(
      this,
      cx,
      this.won
        ? [{ text: 'YOU ESCAPED!', y: 110, size: 100, top: '#fff59d', bottom: '#ff7043' }]
        : [{ text: 'GAME OVER', y: 110, size: 100, top: '#ffcdd2', bottom: '#e53935' }],
    );
    // One line under the heading: all levels cleared, or how far the runner got.
    this.add
      .text(cx, 200, this.won ? `All ${LEVEL_COUNT} mazes cleared on ${label}!` : `You reached level ${this.run.level} of ${LEVEL_COUNT} on ${label}`, labelStyle(32))
      .setOrigin(0.5);

    // Score card: the final score, which is the sum of the points of every cleared level.
    panelImage(this, cx, 350, { width: 540, height: 200, radius: 24, fill: COLOR.cream });
    this.add.text(cx, 290, 'FINAL SCORE', plainStyle(30, '#6b7f8c')).setOrigin(0.5);
    this.add.text(cx, 365, formatScore(this.run.totalScore), plainStyle(96, ink)).setOrigin(0.5);

    // `rank` is the 0-based place in the top five (null when the score missed the table); `top` is the table, highest first.
    const { rank, top } = this.recorded;
    // One line under the card: a large gold announcement for a new high score (rank shown 1-based),
    // otherwise the best saved score for this difficulty, or a dash when none is saved.
    const note =
      rank !== null ? `NEW HIGH SCORE!  #${rank + 1} on ${label}` : `Best on ${label}: ${top[0] === undefined ? '-' : formatScore(top[0])}`;
    this.add.text(cx, 506, note, labelStyle(rank !== null ? 38 : 28, rank !== null ? '#ffd54f' : undefined)).setOrigin(0.5);

    // Play again (left) and Menu (right), side by side.
    new Button(this, cx - 200, 610, { width: 340, height: 80, label: 'Play again', fontSize: 40, color: 0x81c784, onClick: () => this.playAgain() });
    new Button(this, cx + 200, 610, { width: 340, height: 80, label: 'Menu', fontSize: 40, color: 0x90caf9, onClick: () => this.toMenu() });
    // Key hint along the bottom.
    this.add.text(cx, 680, 'Enter or controller A / Start: play again  |  Esc: menu', labelStyle(18)).setOrigin(0.5);

    // Enter or Space plays again and Esc returns to the menu; `onKeyPress` ignores auto-repeat and unhooks on shutdown.
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.playAgain());
    onKeyPress(this, ['ESC'], () => this.toMenu());
    // Created last, so a controller button already held when the screen opens is not read as a press.
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and plays again when a controller button asks to.
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
    // Any face button or Start plays again.
    if (events.confirm || events.start) this.playAgain();
  }

  /** Starts a fresh run on the same difficulty, unless the screen opened less than `INPUT_DELAY_MS` ago. */
  private playAgain(): void {
    // A key or button still held from the end of the run must not skip this screen straight away.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    // A brand-new run: level 1 with no points, keeping the difficulty.
    this.scene.start(SceneKey.Play, { run: startRun(this.run.difficulty) });
  }

  /** Returns to the main menu, unless the screen opened less than `INPUT_DELAY_MS` ago. */
  private toMenu(): void {
    // Same guard as `playAgain`: a held key or button from the previous screen must not trigger it.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Menu);
  }
}
