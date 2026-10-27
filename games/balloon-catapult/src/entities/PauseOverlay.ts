/**
 * The pause menu: a dimmed screen with Resume and Quit buttons and a selection ring for keyboard and controller users.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { labelStyle } from '../style';
import { Button } from './Button';

const BUTTON_WIDTH = 380; // px
const BUTTON_HEIGHT = 84; // px
const BUTTON_YS = [350, 460]; // y of the Resume and Quit buttons, px

/** Full-screen pause menu with "Resume" and "Quit to menu" choices. */
export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container; // holds everything so it can be shown and hidden together
  private readonly buttons: Button[]; // Resume and Quit, kept so their input can be switched on and off together
  private readonly dim: Phaser.GameObjects.Rectangle; // dark backdrop that also swallows clicks meant for the HUD
  private readonly ring: Phaser.GameObjects.Graphics; // white highlight around the selected button
  private readonly actions: (() => void)[]; // what each button does, in the same order as `buttons`
  private selected = 0; // index of the highlighted choice

  /**
   * Builds the overlay, initially hidden.
   *
   * @param scene - Scene the overlay is added to.
   * @param onResume - Called when Resume is chosen.
   * @param onQuit - Called when "Quit to menu" is chosen.
   */
  constructor(scene: Phaser.Scene, onResume: () => void, onQuit: () => void) {
    const cx = GAME_WIDTH / 2;
    this.actions = [onResume, onQuit];

    // Interactive so clicks cannot reach the HUD underneath.
    this.dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive();
    // Title, a key-binding hint and the two choices.
    const title = scene.add.text(cx, 200, 'PAUSED', labelStyle(110)).setOrigin(0.5);
    const hint = scene.add
      .text(cx, 570, 'Esc / P / Start: resume  |  Up/Down + Enter or controller button: choose', labelStyle(20))
      .setOrigin(0.5);
    const resume = new Button(scene, cx, BUTTON_YS[0], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Resume', fontSize: 42, color: 0x81c784, onClick: onResume });
    const quit = new Button(scene, cx, BUTTON_YS[1], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Quit to menu', fontSize: 38, color: 0xef9a9a, onClick: onQuit });
    this.ring = scene.add.graphics();

    this.buttons = [resume, quit];
    // Depth 100 keeps the overlay above all gameplay and HUD objects; it starts hidden.
    this.container = scene.add.container(0, 0, [this.dim, title, hint, this.ring, resume, quit]).setDepth(100);
    this.hide();
  }

  /** Whether the overlay is currently visible. */
  get isShown(): boolean {
    return this.container.visible;
  }

  /** Opens the overlay with the first choice (Resume) highlighted. */
  show(): void {
    this.selected = 0;
    this.drawRing();
    this.setShown(true);
  }

  /** Closes the overlay. */
  hide(): void {
    this.setShown(false);
  }

  /**
   * Moves the highlighted choice for keyboard and controller users; it stops at the first and last choice.
   *
   * @param step - -1 to move up, +1 to move down.
   */
  move(step: number): void {
    this.selected = Phaser.Math.Clamp(this.selected + step, 0, this.actions.length - 1);
    this.drawRing();
  }

  /** Runs the highlighted choice, as if it had been clicked. */
  activateSelected(): void {
    this.actions[this.selected]();
  }

  /** Redraws the white ring around the selected button. */
  private drawRing(): void {
    this.ring.clear();
    this.ring
      .lineStyle(6, 0xffffff)
      .strokeRoundedRect(
        GAME_WIDTH / 2 - BUTTON_WIDTH / 2 - 10,
        BUTTON_YS[this.selected] - BUTTON_HEIGHT / 2 - 10,
        BUTTON_WIDTH + 20,
        BUTTON_HEIGHT + 20,
        26,
      );
  }

  /**
   * Shows or hides the whole overlay and enables or disables its input, so hidden buttons cannot be clicked.
   *
   * @param shown - True to show the overlay, false to hide it.
   */
  private setShown(shown: boolean): void {
    this.container.setVisible(shown);
    if (this.dim.input) this.dim.input.enabled = shown;
    for (const button of this.buttons) button.setEnabled(shown);
  }
}
