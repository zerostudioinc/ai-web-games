import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_COLORS } from '../config';

const FONT = 'sans-serif';
const css = (color: number): string => Phaser.Display.Color.IntegerToColor(color).rgba;

export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly highText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly statusTexts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, playerCount: number, onPause: () => void) {
    const style = { fontFamily: FONT, fontSize: '26px', color: '#e8f4f8' };
    this.scoreText = scene.add.text(20, 8, '', style).setDepth(20);
    this.highText = scene.add.text(260, 8, '', style).setDepth(20);
    this.waveText = scene.add.text(GAME_WIDTH / 2 + 60, 8, '', style).setDepth(20);

    for (let i = 0; i < playerCount; i++) {
      this.statusTexts.push(
        scene.add.text(20 + i * 300, 48, '', { fontFamily: FONT, fontSize: '18px', color: css(PLAYER_COLORS[i]) }).setDepth(20),
      );
    }

    scene.add
      .text(GAME_WIDTH - 20, 8, 'Pause', { fontFamily: FONT, fontSize: '24px', color: '#10222d', backgroundColor: '#b0d4e3', padding: { x: 12, y: 6 } })
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, onPause);

    this.banner = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: FONT,
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#10222d',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  setScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  setHighScore(score: number): void {
    this.highText.setText(`High: ${score}`);
  }

  setWave(wave: number, total: number): void {
    this.waveText.setText(`Wave ${wave}/${total}`);
  }

  setPlayerStatus(playerIndex: number, text: string): void {
    this.statusTexts[playerIndex]?.setText(text);
  }

  setBanner(text: string | null): void {
    this.banner.setVisible(text !== null);
    if (text !== null) this.banner.setText(text);
  }
}
