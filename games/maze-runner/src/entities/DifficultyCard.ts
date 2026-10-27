/**
 * A main-menu card for one difficulty: its name, how soon dead ends seal, the score bonus and the best score so far.
 */
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { DIFFICULTY_COLORS } from '../config';
import { COLOR, hex, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { formatScore } from '../systems/score';

const WIDTH = 340; // card width, px
const HEIGHT = 240; // card height, px
const HEADING = 64; // height of the coloured heading strip across the top of the card, px

/** A clickable difficulty card. The scene calls `setSelected` to show which card keyboard or controller input would start. */
export class DifficultyCard extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics; // white outline floating around the card; visible only while selected

  /**
   * Builds the card, adds it to the scene and wires up its pointer events. The card starts unselected.
   *
   * @param scene - Scene the card is added to.
   * @param x - Centre x in px.
   * @param y - Centre y in px.
   * @param difficulty - Which difficulty the card describes; it sets the heading, the trap depth and the score multiplier shown.
   * @param best - Best score for this difficulty, or 0 if none yet (shown as a dash).
   * @param onChoose - Runs when the card is clicked or tapped.
   * @param onHover - Runs when the pointer moves onto the card, so the scene can move its selection there.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, difficulty: Difficulty, best: number, onChoose: () => void, onHover: () => void) {
    super(scene, x, y);
    const settings = DIFFICULTY_SETTINGS[difficulty];
    // The container's origin is its centre, so the card's top-left corner is at (-w/2, -h/2).
    const left = -WIDTH / 2;
    const top = -HEIGHT / 2;
    const ink = hex(COLOR.ink); // dark text colour as a CSS string

    // The selection ring is drawn first so the card sits on top of it; it floats 9 px outside the card edge.
    this.ring = scene.make.graphics({}, false);
    this.ring.lineStyle(7, 0xffffff).strokeRoundedRect(left - 9, top - 9, WIDTH + 18, HEIGHT + 18, 30);
    this.add(this.ring);

    // Cream panel with a strip in the difficulty's colour across the top; `false` leaves it out of the scene, as the container owns it.
    const body = panelImage(scene, 0, 0, { width: WIDTH, height: HEIGHT, radius: 22, fill: COLOR.cream, heading: { height: HEADING, color: DIFFICULTY_COLORS[difficulty] } }, false);
    this.add(body);

    /**
     * Makes a centred text object, positioned relative to the card's centre.
     *
     * @param px - X of the text's centre, in px from the card's centre.
     * @param py - Y of the text's centre, in px from the card's centre.
     * @param content - The text; line breaks start a new centred line.
     * @param size - Font size in px.
     * @param color - CSS colour of the text.
     * @returns The text object, not yet added to the card.
     */
    const text = (px: number, py: number, content: string, size: number, color: string): Phaser.GameObjects.Text =>
      scene.make.text({ x: px, y: py, text: content, style: { ...plainStyle(size, color), align: 'center' } }, false).setOrigin(0.5);

    // Heading: the difficulty's name, centred in the coloured strip.
    this.add(text(0, top + HEADING / 2, settings.label.toUpperCase(), 46, ink));
    // How many steps into a dead end the runner may go before the path seals.
    this.add(text(0, top + 108, `Dead ends seal behind you\nafter ${settings.trapDepth} steps`, 24, ink));
    // The score multiplier this difficulty pays, in orange.
    this.add(text(0, top + 158, `Score x${settings.scoreMultiplier}`, 22, '#c2410c'));
    // Best score so far, under a small grey caption; a greyed-out dash when there is none yet.
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
    // Hovering moves the scene's selection onto this card.
    this.on(Phaser.Input.Events.POINTER_OVER, onHover);
    // Leaving the card cancels a press in progress.
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      pressed = false;
    });
    // Press: remember that it began on this card.
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      pressed = true;
    });
    // Release over the card: choose it, but only if the press began here.
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!pressed) return;
      pressed = false;
      onChoose();
    });

    // Start unselected; the scene selects its default card afterwards.
    this.setSelected(false);
    scene.add.existing(this);
  }

  /**
   * Highlights the card with a white ring and a slight enlargement.
   *
   * @param selected - True to highlight the card, false to return it to its normal look.
   */
  setSelected(selected: boolean): void {
    this.ring.setVisible(selected);
    this.setScale(selected ? 1.05 : 1);
  }
}
