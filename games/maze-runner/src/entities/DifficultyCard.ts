/**
 * A main-menu card for one difficulty: its name, how soon dead ends seal, whether the game warns first, whether a
 * sealed path stays blocked, the score multiplier and the best score so far.
 */
import Phaser from 'phaser';
import { panelImage } from '../assets/panelArt';
import { DIFFICULTY_COLORS } from '../config';
import { COLOR, hex, plainStyle } from '../style';
import { DIFFICULTY_SETTINGS, type Difficulty } from '../systems/difficulty';
import { formatScore } from '../systems/score';

const WIDTH = 270; // card width, px; the menu fits four cards side by side
const HEIGHT = 256; // card height, px
const HEADING = 64; // height of the coloured heading strip across the top of the card, px
const RING_GAP = 6; // distance from the card edge to the centre line of the selection ring, px
const SELECTED_SCALE = 1.03; // how much larger the selected card is drawn
const HELPS = '#2e7d32'; // text colour of a rule that helps the runner (green)
const NEUTRAL = '#455a64'; // text colour of a rule that does not (dark grey)

/** A clickable difficulty card. The scene calls `setSelected` to show which card keyboard or controller input would start. */
export class DifficultyCard extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics; // white outline floating around the card; visible only while selected

  /**
   * Builds the card, adds it to the scene and wires up its pointer events. The card starts unselected.
   *
   * @param scene - Scene the card is added to.
   * @param x - Centre x in px.
   * @param y - Centre y in px.
   * @param difficulty - Which difficulty the card describes; it sets the heading, the trap depth, the warning and seal notes and the score multiplier shown.
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

    // Cream panel with a strip in the difficulty's colour across the top; `false` leaves it out of the scene, as the container owns it.
    const body = panelImage(scene, 0, 0, { width: WIDTH, height: HEIGHT, radius: 22, fill: COLOR.cream, heading: { height: HEADING, color: DIFFICULTY_COLORS[difficulty] } }, false);
    this.add(body);

    // The selection ring floats `RING_GAP` px outside the card edge. It is added after the panel so the panel's drop shadow does not dim it.
    this.ring = scene.make.graphics({}, false);
    this.ring.lineStyle(7, 0xffffff).strokeRoundedRect(left - RING_GAP, top - RING_GAP, WIDTH + RING_GAP * 2, HEIGHT + RING_GAP * 2, 28);
    this.add(this.ring);

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
    this.add(text(0, top + HEADING / 2, settings.label.toUpperCase(), 40, ink));
    // How many steps into a dead end the runner may go before the path seals.
    this.add(text(0, top + 92, `Seals after ${settings.trapDepth} steps`, 22, ink));
    // Whether the game warns before the path seals, and whether the sealed path stays blocked: green when it helps the runner.
    this.add(text(0, top + 120, settings.warnsBeforeSeal ? 'Warns you first' : 'No warning', 22, settings.warnsBeforeSeal ? HELPS : NEUTRAL));
    this.add(text(0, top + 148, settings.sealsStayBlocked ? 'Seal stays blocked' : 'Seal reopens', 22, settings.sealsStayBlocked ? HELPS : NEUTRAL));
    // The score multiplier this difficulty pays, in orange, with two decimals like the level-complete screen (x0.75, x1.00, x1.50, x2.00).
    this.add(text(0, top + 176, `Score x${settings.scoreMultiplier.toFixed(2)}`, 22, '#c2410c'));
    // Best score so far, under a small grey caption; a greyed-out dash when there is none yet.
    this.add(text(0, top + 204, 'BEST', 18, '#6b7f8c'));
    this.add(text(0, top + 230, best > 0 ? formatScore(best) : '-', 38, best > 0 ? ink : '#9aa9b3'));

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
    this.setScale(selected ? SELECTED_SCALE : 1);
  }
}
