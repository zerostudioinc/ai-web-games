/**
 * Difficulty picker shown after the player count: one button per difficulty, selectable by mouse/touch, keyboard or controller.
 */
import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, DIFFICULTY_COLORS, GAME_WIDTH, MAX_PLAYERS, SceneKey, TextureKey, laneCountFor } from '../config';
import { labelStyle } from '../style';
import { DIFFICULTIES, DIFFICULTY_SETTINGS, bombLanes } from '../systems/difficulty';
import { MenuPadInput } from '../systems/MenuPadInput';

const INPUT_DELAY_MS = 400; // ignore input this long after opening, so a button held from the last screen picks nothing
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR'] as const; // Phaser names of the number keys that pick a difficulty
const DEFAULT_SELECTION = DIFFICULTIES.indexOf('normal'); // highlighted choice when the scene opens
const BUTTON_WIDTH = 265; // px
const BUTTON_HEIGHT = 170; // px
const BUTTON_SPACING = 300; // distance between button centres, px
const BUTTON_Y = 400; // y of the button row, px

/** Lets the player choose a difficulty, then starts the game. */
export class DifficultyScene extends Phaser.Scene {
  private players = 1; // player count chosen on the previous screen
  private selected = DEFAULT_SELECTION; // index of the highlighted difficulty
  private title!: TitleBanner; // animated heading
  private ring!: Phaser.GameObjects.Graphics; // white highlight around the selected button
  private pad!: MenuPadInput; // controller input, polled every frame
  private openedAt = 0; // scene time when it opened, for the input delay

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Difficulty);
  }

  /**
   * Receives the player count and resets the selection; Phaser calls this each time the scene starts.
   *
   * @param data - Scene data from the menu; `players` is the chosen player count (clamped to 1 to 4).
   */
  init(data: { players?: number }): void {
    this.players = Phaser.Math.Clamp(data.players ?? 1, 1, MAX_PLAYERS);
    this.selected = DEFAULT_SELECTION;
  }

  /** Builds the screen: title, one button per difficulty, a Back button, hints and all input bindings. */
  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    this.title = new TitleBanner(this, cx, [{ text: 'CHOOSE DIFFICULTY', y: 140, size: 84, top: '#fff59d', bottom: '#ff7043' }]);
    this.add.text(cx, 250, `${this.players} ${this.players === 1 ? 'player' : 'players'}`, labelStyle(32)).setOrigin(0.5);

    this.ring = this.add.graphics();
    // One button per difficulty, showing its bomb speed, plus a number key (1-4) that picks it directly.
    DIFFICULTIES.forEach((difficulty, index) => {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      new Button(this, this.buttonX(index), BUTTON_Y, {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        label: settings.label,
        subLabel: `${settings.startSpeed} px/s, +${settings.speedStep}/wave`,
        fontSize: 48,
        color: DIFFICULTY_COLORS[difficulty],
        onClick: () => this.start(index),
      });
      this.input.keyboard?.on(`keydown-${KEY_NAMES[index]}`, () => this.start(index));
    });
    this.drawRing();
    // Caption under the first (easiest) button explaining who it is for. Only a solo game gets the two-lane limit,
    // so a bigger group is told about the slow bombs alone.
    const laneCount = laneCountFor(this.players);
    const lanesLimited = bombLanes(DIFFICULTIES[0], this.players, laneCount).length < laneCount;
    const caption = `For little players:\n${lanesLimited ? 'two lanes, slow bombs' : 'slow bombs'}`;
    this.add.text(this.buttonX(0), BUTTON_Y + BUTTON_HEIGHT / 2 + 34, caption, labelStyle(22)).setOrigin(0.5, 0).setAlign('center');

    // Back button in the top-left corner, then the control hints along the bottom.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    new Button(this, margin + width / 2, margin + height / 2 - 2, { width, height, label: 'Back', fontSize, color: 0x90caf9, onClick: () => this.back() });
    this.add
      .text(cx, 640, 'Click or press 1-4  |  Left/Right + Enter  |  Controller: D-pad + any button', labelStyle(20))
      .setOrigin(0.5);

    // Keyboard: arrows move the highlight, Enter or Space confirms it, Esc goes back.
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.back());

    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title and turns controller presses into selection moves.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    this.title.update(delta);

    // Polled every frame, even during the input delay, so a button held on arrival never counts as a press.
    const events = this.pad.poll();
    if (!this.acceptingInput()) return;
    if (events.left) this.moveSelection(-1);
    if (events.right) this.moveSelection(1);
    if (events.confirm) this.confirm();
  }

  /**
   * X position of a difficulty button; the row is centred on the screen.
   *
   * @param index - 0-based difficulty index.
   * @returns Centre x in px.
   */
  private buttonX(index: number): number {
    return GAME_WIDTH / 2 + (index - (DIFFICULTIES.length - 1) / 2) * BUTTON_SPACING;
  }

  /**
   * Whether the opening delay has passed, so input is no longer ignored.
   *
   * @returns True once input is accepted.
   */
  private acceptingInput(): boolean {
    return this.time.now - this.openedAt >= INPUT_DELAY_MS;
  }

  /**
   * Moves the highlight, stopping at the first and last difficulty.
   *
   * @param step - -1 to move left, +1 to move right.
   */
  private moveSelection(step: number): void {
    this.selected = Phaser.Math.Clamp(this.selected + step, 0, DIFFICULTIES.length - 1);
    this.drawRing();
  }

  /** Redraws the white ring around the selected button. */
  private drawRing(): void {
    this.ring.clear();
    this.ring.lineStyle(6, 0xffffff).strokeRoundedRect(
      this.buttonX(this.selected) - BUTTON_WIDTH / 2 - 10,
      BUTTON_Y - BUTTON_HEIGHT / 2 - 10,
      BUTTON_WIDTH + 20,
      BUTTON_HEIGHT + 20,
      26,
    );
  }

  /** Starts the highlighted difficulty, once the opening delay has passed. */
  private confirm(): void {
    if (this.acceptingInput()) this.start(this.selected);
  }

  /**
   * Starts a game at the given difficulty.
   *
   * @param index - 0-based index into `DIFFICULTIES`.
   */
  private start(index: number): void {
    this.scene.start(SceneKey.Play, { players: this.players, difficulty: DIFFICULTIES[index] });
  }

  /** Returns to the main menu. */
  private back(): void {
    this.scene.start(SceneKey.Menu);
  }
}
