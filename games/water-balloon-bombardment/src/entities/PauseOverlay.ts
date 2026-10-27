import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { labelStyle } from '../style';
import { Button } from './Button';

const BUTTON_WIDTH = 380;
const BUTTON_HEIGHT = 84;
const BUTTON_YS = [350, 460];

export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly buttons: Button[];
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly actions: (() => void)[];
  private selected = 0;

  constructor(scene: Phaser.Scene, onResume: () => void, onQuit: () => void) {
    const cx = GAME_WIDTH / 2;
    this.actions = [onResume, onQuit];

    // Interactive so clicks cannot reach the HUD underneath.
    this.dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive();
    const title = scene.add.text(cx, 200, 'PAUSED', labelStyle(110)).setOrigin(0.5);
    const hint = scene.add
      .text(cx, 570, 'Esc / P / Start: resume  |  Up/Down + Enter or controller button: choose', labelStyle(20))
      .setOrigin(0.5);
    const resume = new Button(scene, cx, BUTTON_YS[0], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Resume', fontSize: 42, color: 0x81c784, onClick: onResume });
    const quit = new Button(scene, cx, BUTTON_YS[1], { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: 'Quit to menu', fontSize: 38, color: 0xef9a9a, onClick: onQuit });
    this.ring = scene.add.graphics();

    this.buttons = [resume, quit];
    this.container = scene.add.container(0, 0, [this.dim, title, hint, this.ring, resume, quit]).setDepth(100);
    this.hide();
  }

  get isShown(): boolean {
    return this.container.visible;
  }

  show(): void {
    this.selected = 0;
    this.drawRing();
    this.setShown(true);
  }

  hide(): void {
    this.setShown(false);
  }

  /** Moves the highlighted choice for keyboard and controller users. */
  move(step: number): void {
    this.selected = Phaser.Math.Clamp(this.selected + step, 0, this.actions.length - 1);
    this.drawRing();
  }

  activateSelected(): void {
    this.actions[this.selected]();
  }

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

  private setShown(shown: boolean): void {
    this.container.setVisible(shown);
    if (this.dim.input) this.dim.input.enabled = shown;
    for (const button of this.buttons) button.setEnabled(shown);
  }
}
