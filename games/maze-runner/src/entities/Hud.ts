/**
 * The status bar along the top of the play screen: level, lives, clock, score and the pause button.
 */
import type Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, MAX_LIVES, TextureKey } from '../config';
import { COLOR, hex, labelStyle } from '../style';
import { LEVEL_COUNT } from '../systems/levels';
import { formatScore, formatTime } from '../systems/score';
import { Button } from './Button';

const DEPTH = 50; // draw order of the bar's background strip; its text, hearts and button sit one level above
const BAR_CENTER_Y = HUD_HEIGHT / 2; // vertical centre of the bar, px

/** The play screen's status bar. The scene feeds it values through the `set...` methods; it keeps no game state of its own. */
export class Hud {
  private readonly levelText: Phaser.GameObjects.Text; // "LEVEL n/total" readout at the left end
  private readonly timeText: Phaser.GameObjects.Text; // level clock, formatted m:ss.t
  private readonly scoreText: Phaser.GameObjects.Text; // total score, with thousands separators
  private readonly hearts: Phaser.GameObjects.Image[] = []; // one heart per possible life, left to right
  private shownTime = ''; // clock text currently on screen, so unchanged text is not set again

  /**
   * Builds the bar: level, lives, clock and score readouts, and the pause button. Readouts start at their empty values.
   *
   * @param scene - Scene the bar is added to.
   * @param onPause - Runs when the pause button is clicked or tapped.
   */
  constructor(scene: Phaser.Scene, onPause: () => void) {
    // Background strip, anchored at the screen's top-left corner.
    scene.add.image(0, 0, TextureKey.HudBar).setOrigin(0).setDepth(DEPTH);
    // Everything else sits one depth above the strip.
    const above = DEPTH + 1;

    this.levelText = scene.add.text(24, BAR_CENTER_Y, '', labelStyle(30)).setOrigin(0, 0.5).setDepth(above);
    // One heart per life, 46 px apart, the first centred at x = 310.
    for (let i = 0; i < MAX_LIVES; i++) {
      this.hearts.push(scene.add.image(310 + i * 46, BAR_CENTER_Y, TextureKey.HeartFull).setScale(0.85).setDepth(above));
    }

    // Small captions sit just left of the value they describe, right-aligned against it and 3 px below its centre line.
    const caption = labelStyle(18, hex(COLOR.sky));
    scene.add.text(548, BAR_CENTER_Y + 3, 'TIME', caption).setOrigin(1, 0.5).setDepth(above);
    this.timeText = scene.add.text(560, BAR_CENTER_Y, formatTime(0), labelStyle(36)).setOrigin(0, 0.5).setDepth(above);
    scene.add.text(848, BAR_CENTER_Y + 3, 'SCORE', caption).setOrigin(1, 0.5).setDepth(above);
    this.scoreText = scene.add.text(860, BAR_CENTER_Y, '0', labelStyle(36)).setOrigin(0, 0.5).setDepth(above);

    // Pause button at the right end of the bar, 2 px above the centre line so its drop shadow stays clear of the bar's bottom stripe.
    new Button(scene, GAME_WIDTH - 80, BAR_CENTER_Y - 2, { width: 120, height: 48, label: 'Pause', fontSize: 24, color: 0x90caf9, onClick: onPause }).setDepth(above);
  }

  /**
   * Shows which level is being played, as "LEVEL n/total".
   *
   * @param level - 1-based level number.
   */
  setLevel(level: number): void {
    this.levelText.setText(`LEVEL ${level}/${LEVEL_COUNT}`);
  }

  /**
   * Full hearts for lives left, greyed-out hearts for lives lost.
   *
   * @param lives - Lives the runner has left, from 0 to `MAX_LIVES`.
   */
  setLives(lives: number): void {
    this.hearts.forEach((heart, index) => heart.setTexture(index < lives ? TextureKey.HeartFull : TextureKey.HeartEmpty));
  }

  /**
   * Updates the clock readout. Only touches the text object when the visible tenth of a second changes.
   *
   * @param ms - Time elapsed in the level, in ms.
   */
  setTime(ms: number): void {
    const text = formatTime(ms);
    if (text === this.shownTime) return;
    this.shownTime = text;
    this.timeText.setText(text);
  }

  /**
   * Updates the score readout.
   *
   * @param score - The total score to show; it is rounded and shown with thousands separators.
   */
  setScore(score: number): void {
    this.scoreText.setText(formatScore(score));
  }
}
