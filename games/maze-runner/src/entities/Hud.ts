// The status bar along the top of the play screen: level, lives, clock, score and the pause button.
import type Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, MAX_LIVES, TextureKey } from '../config';
import { COLOR, hex, labelStyle } from '../style';
import { LEVEL_COUNT } from '../systems/levels';
import { formatScore, formatTime } from '../systems/score';
import { Button } from './Button';

const DEPTH = 50;
const BAR_CENTER_Y = HUD_HEIGHT / 2;

export class Hud {
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private shownTime = '';

  constructor(scene: Phaser.Scene, onPause: () => void) {
    scene.add.image(0, 0, TextureKey.HudBar).setOrigin(0).setDepth(DEPTH);
    const above = DEPTH + 1;

    this.levelText = scene.add.text(24, BAR_CENTER_Y, '', labelStyle(30)).setOrigin(0, 0.5).setDepth(above);
    for (let i = 0; i < MAX_LIVES; i++) {
      this.hearts.push(scene.add.image(310 + i * 46, BAR_CENTER_Y, TextureKey.HeartFull).setScale(0.85).setDepth(above));
    }

    // Small captions sit just left of the value they describe.
    const caption = labelStyle(18, hex(COLOR.sky));
    scene.add.text(548, BAR_CENTER_Y + 3, 'TIME', caption).setOrigin(1, 0.5).setDepth(above);
    this.timeText = scene.add.text(560, BAR_CENTER_Y, formatTime(0), labelStyle(36)).setOrigin(0, 0.5).setDepth(above);
    scene.add.text(848, BAR_CENTER_Y + 3, 'SCORE', caption).setOrigin(1, 0.5).setDepth(above);
    this.scoreText = scene.add.text(860, BAR_CENTER_Y, '0', labelStyle(36)).setOrigin(0, 0.5).setDepth(above);

    new Button(scene, GAME_WIDTH - 52, BAR_CENTER_Y, { width: 64, height: 44, label: 'II', fontSize: 26, color: 0x90caf9, onClick: onPause }).setDepth(above);
  }

  setLevel(level: number): void {
    this.levelText.setText(`LEVEL ${level}/${LEVEL_COUNT}`);
  }

  /** Full hearts for lives left, greyed-out hearts for lives lost. */
  setLives(lives: number): void {
    this.hearts.forEach((heart, index) => heart.setTexture(index < lives ? TextureKey.HeartFull : TextureKey.HeartEmpty));
  }

  /** Only touches the text object when the visible tenth of a second changes. */
  setTime(ms: number): void {
    const text = formatTime(ms);
    if (text === this.shownTime) return;
    this.shownTime = text;
    this.timeText.setText(text);
  }

  setScore(score: number): void {
    this.scoreText.setText(formatScore(score));
  }
}
