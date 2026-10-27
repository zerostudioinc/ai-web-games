import Phaser from 'phaser';
import { GAME_WIDTH, MAX_PLAYERS, SceneKey } from '../config';
import { isFireButtonDown } from '../systems/PlayerInputSystem';

const FONT = 'sans-serif';
const INPUT_DELAY_MS = 700; // so a fire button held at the end doesn't skip the screen

interface ResultData {
  won: boolean;
  score: number;
  highScore: number;
  newHighScore: boolean;
  wave: number;
  players: number;
}

export class ResultScene extends Phaser.Scene {
  private result: ResultData = { won: false, score: 0, highScore: 0, newHighScore: false, wave: 1, players: 1 };
  private openedAt = 0;

  constructor() {
    super(SceneKey.Result);
  }

  init(data: Partial<ResultData>): void {
    this.result = { ...this.result, ...data };
  }

  create(): void {
    const { won, score, highScore, newHighScore, wave } = this.result;
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;

    this.add
      .text(cx, 150, won ? 'Victory!' : 'Game Over', { fontFamily: FONT, fontSize: '80px', color: won ? '#81c784' : '#ef5350' })
      .setOrigin(0.5);
    this.add.text(cx, 270, `Score: ${score}`, { fontFamily: FONT, fontSize: '44px', color: '#e8f4f8' }).setOrigin(0.5);
    this.add.text(cx, 330, `High score: ${highScore}`, { fontFamily: FONT, fontSize: '32px', color: '#b0d4e3' }).setOrigin(0.5);
    if (newHighScore) {
      this.add.text(cx, 380, 'New high score!', { fontFamily: FONT, fontSize: '32px', color: '#ffd54f' }).setOrigin(0.5);
    }
    this.add.text(cx, 430, `Reached wave ${wave} of 10`, { fontFamily: FONT, fontSize: '26px', color: '#b0d4e3' }).setOrigin(0.5);

    this.button(cx - 150, 530, 'Play again', () => this.playAgain());
    this.button(cx + 150, 530, 'Menu', () => this.scene.start(SceneKey.Menu));

    this.add
      .text(cx, 640, 'Enter / controller button to play again', { fontFamily: FONT, fontSize: '22px', color: '#b0d4e3' })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.acceptingInput() && this.playAgain());
    this.input.keyboard?.on('keydown-SPACE', () => this.acceptingInput() && this.playAgain());
  }

  update(): void {
    if (!this.acceptingInput()) return;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.input.gamepad?.getPad(i);
      if (pad?.connected && isFireButtonDown(pad)) {
        this.playAgain();
        return;
      }
    }
  }

  private acceptingInput(): boolean {
    return this.time.now - this.openedAt >= INPUT_DELAY_MS;
  }

  private playAgain(): void {
    this.scene.start(SceneKey.Play, { players: this.result.players });
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '40px', color: '#10222d', backgroundColor: '#b0d4e3', padding: { x: 30, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, onClick);
  }
}
