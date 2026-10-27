/**
 * Pause screen: a dimmed overlay with Resume, Restart and Quit choices that mouse, touch, keyboard and controller can all drive.
 */
import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { labelStyle } from '../style';
import { Button } from './Button';

const BUTTON_WIDTH = 380; // px
const BUTTON_HEIGHT = 76; // px
const BUTTON_YS = [320, 420, 520]; // centre y of each button, px: Resume, Restart and Quit from top to bottom

/** What each pause-menu choice does when it is picked. */
export interface PauseActions {
  onResume: () => void; // leave the pause menu and carry on playing
  onRestart: () => void; // abandon the run and start a fresh one on the same difficulty
  onQuit: () => void; // leave the game for the main menu
}

/**
 * Full-screen pause menu with three choices. It starts hidden; the scene opens it with `show`
 * and feeds it keyboard or controller input through `move` and `activateSelected`.
 */
export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container; // holds everything below, so the menu shows and hides as one
  private readonly buttons: Button[]; // Resume, Restart and Quit, top to bottom
  private readonly dim: Phaser.GameObjects.Rectangle; // translucent black layer that darkens the game and blocks clicks to it
  private readonly ring: Phaser.GameObjects.Graphics; // white outline around the highlighted button
  private readonly actions: (() => void)[]; // the choices' handlers, in the same order as `buttons`
  private selected = 0; // index of the highlighted choice (0 is Resume)

  /**
   * Builds the menu, hidden.
   *
   * @param scene - Scene the overlay is added to.
   * @param actions - What each choice does (see `PauseActions`); the parameter is destructured into its three handlers.
   */
  constructor(scene: Phaser.Scene, { onResume, onRestart, onQuit }: PauseActions) {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px; every part of the menu is centred on it
    this.actions = [onResume, onRestart, onQuit];

    // Full-screen black layer at 70% opacity. Interactive so clicks cannot reach the buttons underneath.
    this.dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0).setInteractive();
    // Heading, plus a line of key hints for keyboard and controller players.
    const title = scene.add.text(cx, 190, 'PAUSED', labelStyle(110)).setOrigin(0.5);
    const hint = scene.add.text(cx, 610, 'Esc / P / Start: resume  |  Up/Down + Enter or controller button: choose', labelStyle(20)).setOrigin(0.5);
    // Three stacked buttons; each also works with a mouse click or a touch.
    const resume = new Button(scene, cx, BUTTON_YS[0], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Resume', fontSize: 40, color: 0x81c784, onClick: onResume });
    const restart = new Button(scene, cx, BUTTON_YS[1], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Restart run', fontSize: 36, color: 0xffd54f, onClick: onRestart });
    const quit = new Button(scene, cx, BUTTON_YS[2], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Quit to menu', fontSize: 36, color: 0xef9a9a, onClick: onQuit });
    this.ring = scene.add.graphics();

    this.buttons = [resume, restart, quit];
    // The ring is listed before the buttons, so it draws behind them and shows as a halo. Depth 100 is above every other game element.
    this.container = scene.add.container(0, 0, [this.dim, title, hint, this.ring, resume, restart, quit]).setDepth(100);
    // Start hidden; the scene calls `show` when the game pauses.
    this.hide();
  }

  /** Opens the menu with Resume highlighted. */
  show(): void {
    this.selected = 0;
    this.drawRing();
    this.setShown(true);
  }

  /** Closes the menu. */
  hide(): void {
    this.setShown(false);
  }

  /**
   * Moves the highlighted choice for keyboard and controller users.
   *
   * @param step - How many choices to move: -1 for the choice above, +1 for the one below. The highlight stops at
   *   the first and last choice instead of wrapping round.
   */
  move(step: number): void {
    this.selected = Math.min(this.actions.length - 1, Math.max(0, this.selected + step));
    this.drawRing();
  }

  /** Runs the highlighted choice, as if its button had been clicked. */
  activateSelected(): void {
    this.actions[this.selected]();
  }

  /** Redraws the white outline around the highlighted button. */
  private drawRing(): void {
    this.ring.clear();
    // The outline is the button's rectangle grown by 10 px on every side, drawn 6 px thick with 26 px corners.
    this.ring
      .lineStyle(6, 0xffffff)
      .strokeRoundedRect(GAME_WIDTH / 2 - BUTTON_WIDTH / 2 - 10, BUTTON_YS[this.selected] - BUTTON_HEIGHT / 2 - 10, BUTTON_WIDTH + 20, BUTTON_HEIGHT + 20, 26);
  }

  /**
   * Shows or hides everything, and switches pointer input on the dim layer and the buttons to match,
   * so a hidden menu cannot swallow clicks.
   *
   * @param shown - True to show the menu and accept input, false to hide it and ignore input.
   */
  private setShown(shown: boolean): void {
    this.container.setVisible(shown);
    if (this.dim.input) this.dim.input.enabled = shown;
    for (const button of this.buttons) button.setEnabled(shown);
  }
}
