// A main-menu card for one difficulty: its name, how soon dead ends seal, the score bonus and the best score so far.
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { DIFFICULTY_COLORS } from '../config';
import { COLOR, hex, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { formatScore } from '../systems/score';

const WIDTH = 340;
const HEIGHT = 240;
const HEADING = 64;

export class DifficultyCard extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;

  /**
   * @param best best score for this difficulty, or 0 if none yet
   * @param onChoose runs when the card is clicked or tapped
   * @param onHover runs when the pointer moves onto the card, so the scene can move its selection there
   */
  constructor(scene: Phaser.Scene, x: number, y: number, difficulty: Difficulty, best: number, onChoose: () => void, onHover: () => void) {
    super(scene, x, y);
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const left = -WIDTH / 2;
    const top = -HEIGHT / 2;
    const ink = hex(COLOR.ink);

    // The selection ring is drawn first so the card sits on top of it.
    this.ring = scene.make.graphics({}, false);
    this.ring.lineStyle(7, 0xffffff).strokeRoundedRect(left - 9, top - 9, WIDTH + 18, HEIGHT + 18, 30);
    this.add(this.ring);

    const body = panelImage(scene, 0, 0, { width: WIDTH, height: HEIGHT, radius: 22, fill: COLOR.cream, heading: { height: HEADING, color: DIFFICULTY_COLORS[difficulty] } }, false);
    this.add(body);

    const text = (px: number, py: number, content: string, size: number, color: string): Phaser.GameObjects.Text =>
      scene.make.text({ x: px, y: py, text: content, style: { ...plainStyle(size, color), align: 'center' } }, false).setOrigin(0.5);

    this.add(text(0, top + HEADING / 2, settings.label.toUpperCase(), 46, ink));
    this.add(text(0, top + 108, `Dead ends seal behind you\nafter ${settings.trapDepth} steps`, 24, ink));
    this.add(text(0, top + 158, `Score x${settings.scoreMultiplier}`, 22, '#c2410c'));
    this.add(text(0, top + 190, 'BEST', 18, '#6b7f8c'));
    this.add(text(0, top + 218, best > 0 ? formatScore(best) : '-', 38, best > 0 ? ink : '#9aa9b3'));

    this.setSize(WIDTH, HEIGHT);
    // Container hit areas are measured from the top-left corner, not the centre.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    // Only a press that started on the card and ends on it counts as a choice.
    let pressed = false;
    this.on(Phaser.Input.Events.POINTER_OVER, onHover);
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      pressed = false;
    });
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      pressed = true;
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!pressed) return;
      pressed = false;
      onChoose();
    });

    this.setSelected(false);
    scene.add.existing(this);
  }

  /** Highlights the card with a white ring and a slight enlargement. */
  setSelected(selected: boolean): void {
    this.ring.setVisible(selected);
    this.setScale(selected ? 1.05 : 1);
  }
}
