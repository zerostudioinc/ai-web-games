import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MAX_PLAYERS, PLAYER_COLORS, SceneKey } from '../config';
import { loadHighScore } from '../systems/score';

const FONT = 'sans-serif';
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR'] as const;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Menu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 130, 'Water Balloon Bombardment', { fontFamily: FONT, fontSize: '64px', color: '#e8f4f8' }).setOrigin(0.5);
    this.add.text(cx, 230, 'How many players?', { fontFamily: FONT, fontSize: '32px', color: '#b0d4e3' }).setOrigin(0.5);
    this.add.text(cx, 290, `High score: ${loadHighScore()}`, { fontFamily: FONT, fontSize: '24px', color: '#ffd54f' }).setOrigin(0.5);

    for (let n = 1; n <= MAX_PLAYERS; n++) {
      const color = Phaser.Display.Color.IntegerToColor(PLAYER_COLORS[n - 1]).rgba;
      this.add
        .text(cx - 300 + (n - 1) * 200, 400, `${n}`, {
          fontFamily: FONT,
          fontSize: '72px',
          color: '#10222d',
          backgroundColor: color,
          padding: { x: 40, y: 20 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.POINTER_UP, () => this.startGame(n));

      this.input.keyboard?.on(`keydown-${KEY_NAMES[n - 1]}`, () => this.startGame(n));
    }

    this.add
      .text(cx, GAME_HEIGHT - 110, 'Tap/click a number or press 1-4\nControllers: press any button to connect (one per player)\nTouch aiming is available in 1-player games only', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#b0d4e3',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private startGame(players: number): void {
    this.scene.start(SceneKey.Play, { players });
  }
}
