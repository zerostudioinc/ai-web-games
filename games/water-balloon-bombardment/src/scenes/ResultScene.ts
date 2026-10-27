import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { GAME_WIDTH, SceneKey, TextureKey } from '../config';
import { COLOR, hex, labelStyle, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';
import { TOTAL_WAVES } from '../systems/waves';

const INPUT_DELAY_MS = 700; // so a fire button held at the end doesn't skip the screen

interface ResultData {
  won: boolean;
  score: number;
  highScore: number;
  newHighScore: boolean;
  wave: number;
  players: number;
  difficulty: Difficulty;
}

export class ResultScene extends Phaser.Scene {
  private result: ResultData = { won: false, score: 0, highScore: 0, newHighScore: false, wave: 1, players: 1, difficulty: 'normal' };
  private title!: TitleBanner;
  private pad!: MenuPadInput;
  private openedAt = 0;

  constructor() {
    super(SceneKey.Result);
  }

  init(data: Partial<ResultData>): void {
    this.result = { ...this.result, ...data };
  }

  create(): void {
    const { won, score, highScore, newHighScore, wave, difficulty } = this.result;
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;

    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);
    this.title = new TitleBanner(this, cx, [
      won
        ? { text: 'VICTORY!', y: 130, size: 124, top: '#fff59d', bottom: '#ffb300' }
        : { text: 'GAME OVER', y: 130, size: 124, top: '#ffcdd2', bottom: '#ef5350' },
    ]);

    const panel = this.add.graphics();
    panel.fillStyle(COLOR.ink, 0.35).fillRoundedRect(cx - 260, 248, 520, 230, 22);
    panel.fillStyle(COLOR.cream).fillRoundedRect(cx - 260, 240, 520, 230, 22);
    panel.lineStyle(4, COLOR.ink).strokeRoundedRect(cx - 260, 240, 520, 230, 22);
    const ink = hex(COLOR.ink);
    this.add.text(cx, 290, `Score: ${score}`, plainStyle(56, ink)).setOrigin(0.5);
    this.add.text(cx, 355, `Best: ${highScore}`, plainStyle(36, ink)).setOrigin(0.5);
    if (newHighScore) this.add.text(cx, 405, 'New high score!', plainStyle(34, '#e65100')).setOrigin(0.5);
    this.add.text(cx, newHighScore ? 445 : 420, `Reached wave ${wave} of ${TOTAL_WAVES} (${DIFFICULTY_SETTINGS[difficulty].label})`, plainStyle(26, ink)).setOrigin(0.5);

    new Button(this, cx - 170, 560, { width: 300, height: 84, label: 'Play again', fontSize: 38, color: 0x81c784, onClick: () => this.playAgain() });
    new Button(this, cx + 170, 560, { width: 300, height: 84, label: 'Menu', fontSize: 38, color: 0x90caf9, onClick: () => this.scene.start(SceneKey.Menu) });
    this.add.text(cx, 645, 'Enter / controller button to play again', labelStyle(20)).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.acceptingInput() && this.playAgain());
    this.input.keyboard?.on('keydown-SPACE', () => this.acceptingInput() && this.playAgain());
    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    this.title.update(delta);
    if (this.pad.poll().confirm && this.acceptingInput()) this.playAgain();
  }

  private acceptingInput(): boolean {
    return this.time.now - this.openedAt >= INPUT_DELAY_MS;
  }

  private playAgain(): void {
    this.scene.start(SceneKey.Play, { players: this.result.players, difficulty: this.result.difficulty });
  }
}
