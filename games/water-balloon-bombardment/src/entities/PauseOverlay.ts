import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

const FONT = 'sans-serif';

export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly buttons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, onResume: () => void, onQuit: () => void) {
    const cx = GAME_WIDTH / 2;
    const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0);
    const title = scene.add.text(cx, 220, 'Paused', { fontFamily: FONT, fontSize: '80px', color: '#ffffff' }).setOrigin(0.5);
    const hint = scene.add
      .text(cx, 540, 'Esc / P / controller Start to resume', { fontFamily: FONT, fontSize: '22px', color: '#b0d4e3' })
      .setOrigin(0.5);

    const makeButton = (y: number, label: string, onClick: () => void): Phaser.GameObjects.Text => {
      const button = scene.add
        .text(cx, y, label, { fontFamily: FONT, fontSize: '40px', color: '#10222d', backgroundColor: '#b0d4e3', padding: { x: 30, y: 12 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.POINTER_UP, onClick);
      this.buttons.push(button);
      return button;
    };
    const resume = makeButton(350, 'Resume', onResume);
    const quit = makeButton(450, 'Quit to menu', onQuit);

    this.container = scene.add.container(0, 0, [dim, title, hint, resume, quit]).setDepth(100);
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
    for (const button of this.buttons) {
      if (button.input) button.input.enabled = shown;
    }
  }
}
