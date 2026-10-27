/**
 * Title screen: player-count buttons, drifting clouds, and bombs walking along the bottom.
 */
import Phaser from 'phaser';
import { Bomb } from '../entities/Bomb';
import { Button } from '../entities/Button';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, GAME_WIDTH, MAX_PLAYERS, PLAYER_COLORS, SceneKey, TextureKey } from '../config';
import { labelStyle } from '../style';
import { MenuPadInput } from '../systems/MenuPadInput';

const INPUT_DELAY_MS = 700; // so a button held from the previous screen doesn't start a game
const HOME_URL = '../../index.html'; // from games/<name>/index.html to the site homepage

const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR'] as const; // Phaser names of the number keys that pick a player count
// Start position, scale and drift speed (px per second) of each background cloud.
const CLOUDS = [
  { x: 180, y: 90, scale: 1, speed: 14 },
  { x: 620, y: 40, scale: 0.8, speed: 9 },
  { x: 980, y: 230, scale: 1.2, speed: 18 },
  { x: 420, y: 250, scale: 0.7, speed: 11 },
];

/** Main menu: asks how many players there are, then moves on to the difficulty screen. */
export class MenuScene extends Phaser.Scene {
  private title!: TitleBanner; // animated game title
  private clouds: { image: Phaser.GameObjects.Image; speed: number }[] = []; // drifting background clouds
  private walkers: Bomb[] = []; // decorative bombs walking along the bottom
  private openedAt = 0; // scene time when it opened, for the input delay
  private pad!: MenuPadInput; // controller input, polled every frame

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Menu);
  }

  /** Clears the per-run lists; Phaser reuses this scene instance each time the menu opens. */
  init(): void {
    this.clouds = [];
    this.walkers = [];
  }

  /** Builds the background, clouds, title, corner buttons, player-count buttons and walking bombs. */
  create(): void {
    const cx = GAME_WIDTH / 2;
    this.openedAt = this.time.now;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    // Clouds start spread across the sky and drift right in `update`.
    for (const cloud of CLOUDS) {
      this.clouds.push({ image: this.add.image(cloud.x, cloud.y, TextureKey.Cloud).setScale(cloud.scale).setAlpha(0.95), speed: cloud.speed });
    }

    // Two-line title.
    this.title = new TitleBanner(this, cx, [
      { text: 'BALLOON', y: 125, size: 104, top: '#ffffff', bottom: '#81d4fa' },
      { text: 'CATAPULT', y: 245, size: 128, top: '#fff59d', bottom: '#ff7043' },
    ]);

    // High Scores and Home buttons in the two top corners.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    const cornerY = margin + height / 2 - 2;
    new Button(this, margin + width / 2, cornerY, {
      width,
      height,
      label: 'High Scores',
      fontSize,
      color: 0xffd54f,
      onClick: () => this.scene.start(SceneKey.HighScores),
    });
    new Button(this, GAME_WIDTH - margin - width / 2, cornerY, {
      width,
      height,
      label: 'Home',
      fontSize,
      color: 0x90caf9,
      onClick: () => window.location.assign(HOME_URL),
    });
    // Decorative balloons and a bomb flanking the "How many players?" prompt.
    this.add.image(cx - 330, 345, TextureKey.Balloon).setScale(1.7).setTint(PLAYER_COLORS[0]).setRotation(-0.25);
    this.add.image(cx + 330, 345, TextureKey.Balloon).setScale(1.7).setTint(PLAYER_COLORS[1]).setRotation(0.25);
    this.add.image(cx - 260, 345, TextureKey.Balloon).setScale(1.3).setTint(PLAYER_COLORS[2]).setRotation(-0.15);
    this.add.image(cx + 260, 345, TextureKey.BombBody).setScale(0.8).setRotation(0.15);

    this.add.text(cx, 345, 'How many players?', labelStyle(36)).setOrigin(0.5);
    // One button per player count, in that player's colour, with a number key (1-4) as a shortcut.
    for (let n = 1; n <= MAX_PLAYERS; n++) {
      new Button(this, cx - 330 + (n - 1) * 220, 440, {
        width: 170,
        height: 120,
        label: `${n}`,
        subLabel: n === 1 ? 'PLAYER' : 'PLAYERS',
        fontSize: 56,
        color: PLAYER_COLORS[n - 1],
        onClick: () => this.startGame(n),
      });
      this.input.keyboard?.on(`keydown-${KEY_NAMES[n - 1]}`, () => this.startGame(n));
    }

    this.add.text(cx, 570, 'Tap a number or press 1-4  |  Controller: any button starts one player per controller', labelStyle(20)).setOrigin(0.5);

    // Three bombs strolling along the bottom, each at its own speed and spread evenly across the screen.
    for (let i = 0; i < 3; i++) {
      const walker = new Bomb(this, 0, 678, 40 + i * 10);
      walker.setPosition(150 + i * 480, 678);
      this.walkers.push(walker);
    }

    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title, clouds and walking bombs, and starts a game on a controller button.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    this.title.update(delta);

    // Clouds drift right and wrap round to just off the left edge.
    for (const { image, speed } of this.clouds) {
      image.x += speed * (delta / 1000);
      if (image.x > GAME_WIDTH + 140) image.x = -140;
    }
    // Bombs walk left and re-enter from the right.
    for (const walker of this.walkers) {
      walker.advance(delta);
      if (walker.x < -50) walker.x = GAME_WIDTH + 50;
    }

    // Any controller button starts a game with one player per connected controller (at least one).
    const { confirm, connectedCount } = this.pad.poll();
    if (confirm && this.time.now - this.openedAt >= INPUT_DELAY_MS) this.startGame(Math.max(1, connectedCount));
  }

  /**
   * Moves on to the difficulty screen.
   *
   * @param players - Number of players chosen (1 to 4).
   */
  private startGame(players: number): void {
    this.scene.start(SceneKey.Difficulty, { players });
  }
}
