import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { labelStyle } from '../style';
import { Button } from './Button';

export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly buttons: Button[];
  private readonly dim: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, onResume: () => void, onQuit: () => void) {
    const cx = GAME_WIDTH / 2;
    // Interactive so clicks cannot reach the HUD underneath.
    this.dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive();
    const title = scene.add.text(cx, 200, 'PAUSED', labelStyle(110)).setOrigin(0.5);
    const hint = scene.add.text(cx, 560, 'Esc / P / controller Start to resume', labelStyle(22)).setOrigin(0.5);
    const resume = new Button(scene, cx, 350, { width: 380, height: 84, label: 'Resume', fontSize: 42, color: 0x81c784, onClick: onResume });
    const quit = new Button(scene, cx, 460, { width: 380, height: 84, label: 'Quit to menu', fontSize: 38, color: 0xef9a9a, onClick: onQuit });

    this.buttons = [resume, quit];
    this.container = scene.add.container(0, 0, [this.dim, title, hint, resume, quit]).setDepth(100);
    this.hide();
  }

  show(): void {
    this.setShown(true);
  }

  hide(): void {
    this.setShown(false);
  }

  private setShown(shown: boolean): void {
    this.container.setVisible(shown);
    if (this.dim.input) this.dim.input.enabled = shown;
    for (const button of this.buttons) button.setEnabled(shown);
  }
}
