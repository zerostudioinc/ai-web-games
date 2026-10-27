/**
 * Heads-up display for the play scene: score, wave and bomb counters, per-player status, pause button and a centre banner.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_COLORS, TextureKey } from '../config';
import { COLOR, hex, labelStyle } from '../style';
import { Button } from './Button';

/** The wooden HUD strip along the top of the screen, plus a large centred banner for messages. */
export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text; // "Score: n"
  private readonly highText: Phaser.GameObjects.Text; // best score for the difficulty
  private readonly waveText: Phaser.GameObjects.Text; // "Wave n/total"
  private readonly bombsText: Phaser.GameObjects.Text; // "Bombs left: n"
  private readonly banner: Phaser.GameObjects.Text; // big centred message (wave number, victory, game over)
  private readonly statusTexts: Phaser.GameObjects.Text[] = []; // one line per player, by player index

  /**
   * Builds the HUD; everything is given a depth above the gameplay objects.
   *
   * @param scene - Scene the HUD is added to.
   * @param playerCount - Number of players; one status line is created for each.
   * @param onPause - Called when the Pause button is clicked.
   */
  constructor(scene: Phaser.Scene, playerCount: number, onPause: () => void) {
    scene.add.image(0, 0, TextureKey.HudBar).setOrigin(0).setDepth(19);

    // Counters across the top row; the x positions leave room for the longest text of each.
    this.scoreText = scene.add.text(24, 4, '', labelStyle(30)).setDepth(20);
    this.highText = scene.add.text(240, 4, '', labelStyle(30, hex(COLOR.gold))).setDepth(20);
    this.waveText = scene.add.text(480, 4, '', labelStyle(30)).setDepth(20);
    this.bombsText = scene.add.text(700, 4, '', labelStyle(30, '#ffab91')).setDepth(20);

    // Second row: one status line per player, coloured to match that player's catapult.
    for (let i = 0; i < playerCount; i++) {
      this.statusTexts.push(scene.add.text(24 + i * 300, 48, '', labelStyle(20, hex(PLAYER_COLORS[i]))).setDepth(20));
    }

    // Pause button in the top-right corner of the strip.
    new Button(scene, GAME_WIDTH - 80, 38, { width: 120, height: 48, label: 'Pause', fontSize: 24, color: 0x90caf9, onClick: onPause }).setDepth(20);

    // Centre-of-screen banner, hidden until `setBanner` gives it text.
    this.banner = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', { ...labelStyle(110), strokeThickness: 12 })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  /**
   * Shows the current score.
   *
   * @param score - Bombs destroyed so far.
   */
  setScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  /**
   * Shows the best score for this difficulty.
   *
   * @param score - The best score so far, including the current game.
   */
  setHighScore(score: number): void {
    this.highText.setText(`Best: ${score}`);
  }

  /**
   * Shows which wave is in progress.
   *
   * @param wave - 1-based current wave.
   * @param total - Total number of waves in a game.
   */
  setWave(wave: number, total: number): void {
    this.waveText.setText(`Wave ${wave}/${total}`);
  }

  /**
   * Shows how many bombs are left in the current wave.
   *
   * @param count - Bombs still to destroy.
   */
  setBombsRemaining(count: number): void {
    this.bombsText.setText(`Bombs left: ${count}`);
  }

  /**
   * Sets one player's status line (e.g. which controls they use, or that they are out).
   *
   * @param playerIndex - 0-based player index.
   * @param text - Status text to show.
   */
  setPlayerStatus(playerIndex: number, text: string): void {
    this.statusTexts[playerIndex]?.setText(text);
  }

  /**
   * Shows or hides the big centre banner.
   *
   * @param text - Message to show, or null to hide the banner.
   */
  setBanner(text: string | null): void {
    this.banner.setVisible(text !== null);
    if (text !== null) this.banner.setText(text);
  }
}
