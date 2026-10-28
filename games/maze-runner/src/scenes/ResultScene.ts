/**
 * End of a run: the final score or scores, whether they earned a place in the top five, who won a versus match, and options to
 * play again or return to the menu.
 */
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, MAX_FRAME_MS, PLAYER_COLORS, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS } from '../systems/difficulty';
import { recordScores, type RecordedScore } from '../systems/highScores';
import { LEVEL_COUNT } from '../systems/levels';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { startRun, type RunState } from '../systems/run';
import { formatScore } from '../systems/score';
import type { MatchResult } from '../systems/versus';

/** Scene data sent when a run ends: by LevelCompleteScene after the final level (a win) or by PlayScene when the match is lost. */
export interface ResultData {
  /** The run that ended: `difficulty` picks the score table, `totals` are the final scores, and after a defeat `level` is the level being played. */
  run: RunState;
  /** True when every level was cleared; false when a player ran out of lives. */
  won: boolean;
  /** Versus only: who won the match and why. Omitted in a solo game. */
  match?: MatchResult;
}

const INPUT_DELAY_MS = 700; // ms after the screen opens during which input is ignored, so the key or button that ended the run cannot skip it
const VERSUS_CARD = { width: 460, height: 250, y: 380, gap: 40, heading: 56 } as const; // a versus score card: its size, centre y, the gap between the two cards and the height of its name strip, px

/** Shows how a run ended, saves its scores to the high-score table, and offers Play again or Menu. */
export class ResultScene extends Phaser.Scene {
  private run!: RunState; // the run that ended
  private won = false; // true when every maze was cleared, false when a player ran out of lives
  private match: MatchResult | undefined; // versus: who won the match and why; undefined in a solo game
  private recorded!: RecordedScore[]; // outcome of saving each player's final score: the updated top-5 table and the rank earned
  private title!: TitleBanner; // animated heading: "YOU ESCAPED!", "GAME OVER" or the versus result
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
    this.match = data.match;
    this.sinceOpenMs = 0;
  }

  /** Saves the final scores, then builds the heading, the score cards, the high-score notes, the buttons and the key hint. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px

    // The scores are saved once, when the screen opens; replaying starts a brand new run.
    // In versus the better score goes in first, so each rank shown is the place that score finally holds.
    this.recorded = recordScores(this.run.difficulty, this.run.totals);

    // Same backdrop as the menu.
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    if (this.match) this.drawVersus(this.match);
    else this.drawSolo();

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

  /** Draws the result of a solo run: the heading, how far the runner got, the final score card and the high-score note. */
  private drawSolo(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    const ink = hex(COLOR.ink); // dark text colour as a CSS string
    const label = DIFFICULTY_SETTINGS[this.run.difficulty].label; // name of the difficulty played, e.g. "Normal"

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
    this.add.text(cx, 365, formatScore(this.run.totals[0]), plainStyle(96, ink)).setOrigin(0.5);

    // `rank` is the 0-based place in the top five (null when the score missed the table); `top` is the table, highest first.
    const { rank, top } = this.recorded[0];
    // One line under the card: a large gold announcement for a new high score (rank shown 1-based),
    // otherwise the best saved score for this difficulty, or a dash when none is saved.
    const note =
      rank !== null ? `NEW HIGH SCORE!  #${rank + 1} on ${label}` : `Best on ${label}: ${top[0] === undefined ? '-' : formatScore(top[0])}`;
    this.add.text(cx, 506, note, labelStyle(rank !== null ? 38 : 28, rank !== null ? '#ffd54f' : undefined)).setOrigin(0.5);
  }

  /**
   * Draws the result of a versus match: who won and why, and a card for each player with their final score and high-score note.
   *
   * @param match - How the match ended: the winner (null for a draw) and the reason.
   */
  private drawVersus(match: MatchResult): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    const ink = hex(COLOR.ink); // dark text colour as a CSS string
    const label = DIFFICULTY_SETTINGS[this.run.difficulty].label; // name of the difficulty played, e.g. "Normal"
    const { winner } = match;

    // Gold heading for a winner, grey-blue for a draw.
    this.title = new TitleBanner(this, cx, [
      winner === null
        ? { text: "IT'S A DRAW!", y: 105, size: 92, top: '#eceff1', bottom: '#78909c' }
        : { text: `PLAYER ${winner + 1} WINS!`, y: 105, size: 92, top: '#fff59d', bottom: '#ff7043' },
    ]);
    // One line under the heading: why the match ended.
    let reason: string;
    if (match.reason === 'completed') {
      reason = `Both players cleared all ${LEVEL_COUNT} mazes on ${label}${winner === null ? ' with the same score' : ' - the higher score wins'}`;
    } else if (winner === null) {
      reason = `Both players ran out of lives on level ${this.run.level} of ${LEVEL_COUNT} on ${label}`;
    } else {
      // The other player of the two lost; `1 - winner` is their 0-based number.
      reason = `Player ${1 - winner + 1} ran out of lives on level ${this.run.level} of ${LEVEL_COUNT} on ${label}`;
    }
    this.add.text(cx, 190, reason, labelStyle(28)).setOrigin(0.5);

    // One card per player, side by side: a strip in the player's colour, the final score and the high-score note.
    this.run.totals.forEach((total, player) => {
      const x = cx + (player === 0 ? -1 : 1) * (VERSUS_CARD.width / 2 + VERSUS_CARD.gap / 2); // centre x of this player's card, px
      const top = VERSUS_CARD.y - VERSUS_CARD.height / 2; // y of the card's top edge, px
      // A gold outline round the winner's card, drawn first so the card sits on top of it.
      if (player === winner) {
        this.add.graphics().lineStyle(8, 0xffd54f).strokeRoundedRect(x - VERSUS_CARD.width / 2 - 10, top - 10, VERSUS_CARD.width + 20, VERSUS_CARD.height + 20, 32);
      }
      panelImage(this, x, VERSUS_CARD.y, {
        width: VERSUS_CARD.width,
        height: VERSUS_CARD.height,
        radius: 24,
        fill: COLOR.cream,
        heading: { height: VERSUS_CARD.heading, color: PLAYER_COLORS[player] },
      });
      this.add.text(x - VERSUS_CARD.width / 2 + 28, top + VERSUS_CARD.heading / 2, `PLAYER ${player + 1}`, plainStyle(34, ink)).setOrigin(0, 0.5);
      if (player === winner) this.add.text(x + VERSUS_CARD.width / 2 - 28, top + VERSUS_CARD.heading / 2, 'WINNER', plainStyle(30, ink)).setOrigin(1, 0.5);
      this.add.text(x, top + 96, 'FINAL SCORE', plainStyle(24, '#6b7f8c')).setOrigin(0.5);
      this.add.text(x, top + 150, formatScore(total), plainStyle(72, ink)).setOrigin(0.5);
      // The high-score note: the place in the top five (rank shown 1-based), or the best saved score for this difficulty.
      const { rank, top: table } = this.recorded[player];
      const note = rank !== null ? `NEW HIGH SCORE!  #${rank + 1}` : `Best: ${table[0] === undefined ? '-' : formatScore(table[0])}`;
      this.add.text(x, top + 212, note, plainStyle(rank !== null ? 30 : 24, rank !== null ? '#c2410c' : '#6b7f8c')).setOrigin(0.5);
    });
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

  /** Starts a fresh run on the same difficulty and players, unless the screen opened less than `INPUT_DELAY_MS` ago. */
  private playAgain(): void {
    // A key or button still held from the end of the run must not skip this screen straight away.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    // A brand-new run: level 1 with no points, keeping the difficulty and the players.
    this.scene.start(SceneKey.Play, { run: startRun(this.run.difficulty, this.run.playerCount) });
  }

  /** Returns to the main menu, unless the screen opened less than `INPUT_DELAY_MS` ago. */
  private toMenu(): void {
    // Same guard as `playAgain`: a held key or button from the previous screen must not trigger it.
    if (this.sinceOpenMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Menu);
  }
}
