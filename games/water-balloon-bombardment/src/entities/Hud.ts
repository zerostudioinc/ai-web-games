import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_COLORS, TextureKey } from '../config';
import { COLOR, hex, labelStyle } from '../style';
import { Button } from './Button';

export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly highText: Phaser.GameObjects.Text;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly statusTexts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, playerCount: number, onPause: () => void) {
    scene.add.image(0, 0, TextureKey.HudBar).setOrigin(0).setDepth(19);

    this.scoreText = scene.add.text(24, 4, '', labelStyle(30)).setDepth(20);
    this.highText = scene.add.text(250, 4, '', labelStyle(30, hex(COLOR.gold))).setDepth(20);
    this.waveText = scene.add.text(GAME_WIDTH / 2 + 90, 4, '', labelStyle(30)).setDepth(20);

    for (let i = 0; i < playerCount; i++) {
      this.statusTexts.push(scene.add.text(24 + i * 300, 48, '', labelStyle(20, hex(PLAYER_COLORS[i]))).setDepth(20));
    }

    new Button(scene, GAME_WIDTH - 80, 38, { width: 120, height: 48, label: 'Pause', fontSize: 24, color: 0x90caf9, onClick: onPause }).setDepth(20);

    this.banner = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', { ...labelStyle(110), strokeThickness: 12 })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  setScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  setHighScore(score: number): void {
    this.highText.setText(`Best: ${score}`);
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
