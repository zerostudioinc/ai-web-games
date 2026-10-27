/**
 * End-of-game screen: shows the outcome, score and best score, and offers Play again or Menu.
 */
import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';
import { TOTAL_WAVES } from '../systems/waves';

const INPUT_DELAY_MS = 700; // so a fire button held at the end doesn't skip the screen

/** Data the play scene passes in when a game ends. */
interface ResultData {
  won: boolean; // true for victory, false for game over
  score: number; // bombs destroyed this game
  highScore: number; // best score for this difficulty
  rank: number | null; // 0-based place in this difficulty's top 3, or null
  wave: number; // last wave reached
  players: number; // player count, kept so Play again reuses it
  difficulty: Difficulty; // difficulty played, kept so Play again reuses it
}

/** Shows how the game went and lets the player start again or return to the menu. */
export class ResultScene extends Phaser.Scene {
  private result: ResultData = { won: false, score: 0, highScore: 0, rank: null, wave: 1, players: 1, difficulty: 'normal' }; // defaults, overwritten by `init`
  private title!: TitleBanner; // animated "VICTORY!" or "GAME OVER" heading
  private pad!: MenuPadInput; // controller input, polled every frame
  private openedAt = 0; // scene time when it opened, for the input delay

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Result);
  }

  /**
   * Stores the result handed over by the play scene; Phaser calls this each time the scene starts.
   *
   * @param data - Any subset of the result fields; missing ones keep their defaults.
   */
  init(data: Partial<ResultData>): void {
    this.result = { ...this.result, ...data };
  }

  /** Builds the title, the score card, the two buttons and the input bindings. */
  create(): void {
    const { won, score, highScore, rank, wave, difficulty } = this.result;
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;

    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    // Gold "VICTORY!" for a win, red "GAME OVER" for a loss.
    this.title = new TitleBanner(this, cx, [
      won
        ? { text: 'VICTORY!', y: 130, size: 124, top: '#fff59d', bottom: '#ffb300' }
        : { text: 'GAME OVER', y: 130, size: 124, top: '#ffcdd2', bottom: '#ef5350' },
    ]);

    // Score card: drop shadow, cream body and outline.
    const panel = this.add.graphics();
    panel.fillStyle(COLOR.ink, 0.35).fillRoundedRect(cx - 260, 248, 520, 230, 22);
    panel.fillStyle(COLOR.cream).fillRoundedRect(cx - 260, 240, 520, 230, 22);
    panel.lineStyle(4, COLOR.ink).strokeRoundedRect(cx - 260, 240, 520, 230, 22);
    const ink = hex(COLOR.ink);
    this.add.text(cx, 290, `Score: ${score}`, plainStyle(56, ink)).setOrigin(0.5);
    this.add.text(cx, 355, `Best: ${highScore}`, plainStyle(36, ink)).setOrigin(0.5);
    // A top-3 finish adds a line, which pushes the "reached wave" line down to make room.
    if (rank !== null) this.add.text(cx, 405, rank === 0 ? 'New high score!' : 'Top 3 score!', plainStyle(34, '#e65100')).setOrigin(0.5);
    this.add.text(cx, rank !== null ? 445 : 420, `Reached wave ${wave} of ${TOTAL_WAVES} (${DIFFICULTY_SETTINGS[difficulty].label})`, plainStyle(26, ink)).setOrigin(0.5);

    // Buttons, plus Enter / Space shortcuts that replay once the opening delay has passed.
    new Button(this, cx - 170, 560, { width: 300, height: 84, label: 'Play again', fontSize: 38, color: 0x81c784, onClick: () => this.playAgain() });
    new Button(this, cx + 170, 560, { width: 300, height: 84, label: 'Menu', fontSize: 38, color: 0x90caf9, onClick: () => this.scene.start(SceneKey.Menu) });
    this.add.text(cx, 645, 'Enter / controller button to play again', labelStyle(20)).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.acceptingInput() && this.playAgain());
    this.input.keyboard?.on('keydown-SPACE', () => this.acceptingInput() && this.playAgain());
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and replays when a controller button is pressed.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    this.title.update(delta);
    if (this.pad.poll().confirm && this.acceptingInput()) this.playAgain();
  }

  /**
   * Whether the opening delay has passed, so input is no longer ignored.
   *
   * @returns True once input is accepted.
   */
  private acceptingInput(): boolean {
    return this.time.now - this.openedAt >= INPUT_DELAY_MS;
  }

  /** Starts a new game with the same player count and difficulty as the one that just ended. */
  private playAgain(): void {
    this.scene.start(SceneKey.Play, { players: this.result.players, difficulty: this.result.difficulty });
  }
}
