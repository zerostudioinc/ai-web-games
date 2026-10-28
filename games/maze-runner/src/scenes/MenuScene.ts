/**
 * Main menu: the title, a choice of one player or two players versus, a card per difficulty showing its best score,
 * corner buttons for High Scores and Home, and the game's version in the bottom-right corner.
 */
import Phaser from 'phaser';
import { IDLE_FRAME, runnerFrameKey, runnerWalkKey } from '../assets/runnerArt';
import { Button } from '../entities/Button';
import { DifficultyCard } from '../entities/DifficultyCard';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, GAME_HEIGHT, GAME_WIDTH, MAX_FRAME_MS, SceneKey, TextureKey, VERSION_LABEL } from '../config';
import { labelStyle } from '../style';
import { DIFFICULTIES, type Difficulty } from '../systems/difficulty';
import { bestScore } from '../systems/highScores';
import { onKeyPress } from '../systems/KeyPress';
import { LEVEL_COUNT } from '../systems/levels';
import { MenuPadInput } from '../systems/MenuPadInput';
import { startRun, type PlayerCount } from '../systems/run';

const INPUT_DELAY_MS = 600; // ms after the menu opens during which a game start or High Scores is ignored, so a key or button held from the previous screen cannot trigger them
const HOME_URL = '../../index.html'; // from games/<name>/index.html to the site homepage; the Home button goes there
const VERSION_FONT_SIZE = 16; // px; small, so the version label stays unobtrusive
const CARD_SPACING = 304; // distance between the centres of neighbouring difficulty cards, px
const CARD_Y = 475; // centre y of the difficulty cards, px; keeps a selected card's ring clear of the player-count buttons above and the key hint below
const TAGLINE_Y = 238; // centre y of the one-line goal under the title, px
const MODE_Y = 290; // centre y of the two player-count buttons, px; their ring stays clear of the tagline above and of a selected card's ring below
const MODE_BUTTON = { width: 290, height: 46, fontSize: 24, gap: 24 } as const; // size of a player-count button, its label size and the gap between the two, px
/** The player-count choices, left to right: how many play, the button's label and its colour (0xRRGGBB). */
const MODES: readonly { count: PlayerCount; label: string; color: number }[] = [
  { count: 1, label: '1 PLAYER', color: 0x4fc3f7 },
  { count: 2, label: '2 PLAYERS VERSUS', color: 0xff8a65 },
];
const SOLO_TAGLINE = `Escape ${LEVEL_COUNT} mazes before the dead ends seal behind you!`; // the goal of a one-player game
const VERSUS_TAGLINE = 'Race to the exit!  P1: W A S D or controller 1   P2: arrow keys or controller 2'; // the goal of a versus game, with each player's controls
// Phaser names of the number keys 1 to 9; the nth difficulty card (left to right) starts on number key n.
const NUMBER_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const;
// Index of the card highlighted when the menu opens: Normal.
const DEFAULT_CARD = DIFFICULTIES.indexOf('normal');
const RUNNER_SPEED = 110; // speed of the decorative runner along the bottom of the screen, px per second

/** One drifting sparkle of the menu backdrop. */
interface Spark {
  image: Phaser.GameObjects.Image; // the sparkle's picture
  speed: number; // px per second, upward
  phase: number; // offset of this spark's twinkle, in radians, so the sparks do not all pulse together
}

/** Main menu: asks how many play and which difficulty, and starts a run on them; also links to the high scores and the home page. */
export class MenuScene extends Phaser.Scene {
  private title!: TitleBanner; // animated "MAZE RUNNER" title
  private tagline!: Phaser.GameObjects.Text; // one-line goal under the title; it follows the chosen number of players
  private modeButtons: Button[] = []; // the player-count buttons, in `MODES` order (left to right)
  private modeRing!: Phaser.GameObjects.Graphics; // white outline round the chosen player-count button
  private runner!: Phaser.GameObjects.Sprite; // decorative runner jogging along the bottom of the screen
  private pad!: MenuPadInput; // controller input for choosing, starting and opening the high scores
  private cards: DifficultyCard[] = []; // one card per difficulty, in `DIFFICULTIES` order (left to right)
  private sparks: Spark[] = []; // drifting sparkles behind the menu
  private selected = DEFAULT_CARD; // 0-based index of the highlighted card; Enter, Space or Start starts that difficulty
  // Players of the next run. It is not reset in `init`, so coming back from a game keeps the choice made before it.
  private playerCount: PlayerCount = 1;
  // Time since the menu opened, ms. Counted from frame deltas, since `time.now` can be stale right after a restart.
  private clockMs = 0;

  /** Registers the scene under its key. */
  constructor() {
    super(SceneKey.Menu);
  }

  /** Clears the per-visit state; Phaser reuses this scene instance each time the menu opens. */
  init(): void {
    this.cards = [];
    this.modeButtons = [];
    this.sparks = [];
    this.selected = DEFAULT_CARD;
    this.clockMs = 0;
  }

  /** Builds the backdrop, sparks, title, player-count buttons, difficulty cards, corner buttons, key hints, version and jogging runner, then starts listening for input. */
  create(): void {
    const cx = GAME_WIDTH / 2; // x of the screen's centre line, px
    // Full-screen backdrop, shared with the high-score and result screens.
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    // Sparks drift up the screen behind everything else.
    for (let i = 0; i < 18; i++) {
      // Random spot on the screen, alternately cyan and pale yellow, 0.6 to 1.4 times full size.
      const image = this.add
        .image(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, TextureKey.Spark)
        .setTint(i % 2 === 0 ? 0x80deea : 0xfff59d)
        .setScale(0.6 + Math.random() * 0.8);
      // Each spark rises at its own speed (12 to 34 px/s) and twinkles out of step with the others.
      this.sparks.push({ image, speed: 12 + Math.random() * 22, phase: Math.random() * Math.PI * 2 });
    }

    // Two-line title: MAZE in white to cyan, RUNNER in pale yellow to orange.
    this.title = new TitleBanner(this, cx, [
      { text: 'MAZE', y: 84, size: 78, top: '#ffffff', bottom: '#80deea' },
      { text: 'RUNNER', y: 164, size: 100, top: '#fff59d', bottom: '#ff7043' },
    ]);
    // The goal in one line; `setMode` fills it in.
    this.tagline = this.add.text(cx, TAGLINE_Y, '', labelStyle(24)).setOrigin(0.5);

    // Two buttons choose how many play, side by side: one player, or two racing each other. `setMode` rings the chosen one.
    this.modeRing = this.add.graphics();
    MODES.forEach(({ count, label, color }, index) => {
      const x = cx + (index === 0 ? -1 : 1) * (MODE_BUTTON.width / 2 + MODE_BUTTON.gap / 2); // centre x of this button, px
      this.modeButtons.push(
        new Button(this, x, MODE_Y, { width: MODE_BUTTON.width, height: MODE_BUTTON.height, label, fontSize: MODE_BUTTON.fontSize, color, onClick: () => this.setMode(count) }),
      );
    });
    this.setMode(this.playerCount);

    // One card per difficulty, spread evenly around the centre line: clicking a card starts that difficulty, hovering it highlights it.
    DIFFICULTIES.forEach((difficulty, index) => {
      const x = cx + (index - (DIFFICULTIES.length - 1) / 2) * CARD_SPACING; // centre x of this card, px
      // The card shows this difficulty's best saved score (0 when there is none).
      const card = new DifficultyCard(this, x, CARD_Y, difficulty, bestScore(difficulty), () => this.startGame(difficulty), () => this.select(index));
      this.cards.push(card);
    });
    // Normal is highlighted to begin with.
    this.select(DEFAULT_CARD);

    // High Scores and Home share one size and sit in the top corners.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    const cornerY = margin + height / 2 - 2; // centre y of both corner buttons, px
    // Top-left: opens the high-score screen.
    new Button(this, margin + width / 2, cornerY, {
      width,
      height,
      label: 'High Scores',
      fontSize,
      color: 0xffd54f,
      onClick: () => this.openHighScores(),
    });
    // Top-right: leaves the game for the site's home page.
    new Button(this, GAME_WIDTH - margin - width / 2, cornerY, {
      width,
      height,
      label: 'Home',
      fontSize,
      color: 0x90caf9,
      onClick: () => window.location.assign(HOME_URL),
    });

    // Small version label in the bottom-right corner, in line with the Home button's right edge; skipped when the game has no version.
    if (VERSION_LABEL) {
      this.add.text(GAME_WIDTH - margin, GAME_HEIGHT - margin, VERSION_LABEL, labelStyle(VERSION_FONT_SIZE)).setOrigin(1, 1).setDepth(10);
    }

    // Controls hint above the running track.
    this.add.text(cx, 630, `Up-Down: players  |  Left-Right: difficulty  |  Enter or 1-${DIFFICULTIES.length}: start  |  H: high scores  |  Esc or P: pause`, labelStyle(18)).setOrigin(0.5);

    // A little runner jogs along the track at the bottom of the screen, starting just off the left edge.
    this.runner = this.add.sprite(-60, GAME_HEIGHT - 44, runnerFrameKey('right', IDLE_FRAME)).setScale(1.2);
    // Loops the right-facing walk cycle; `update` moves the sprite along the track.
    this.runner.play(runnerWalkKey('right'));

    // Keyboard: Up/Down (or W/S) switch between one and two players, Left/Right (or A/D) move the highlight,
    // Enter or Space starts the highlighted difficulty, the number keys start a difficulty directly (1 is the first card, Easy),
    // H opens the high scores. `onKeyPress` ignores auto-repeat and unhooks on shutdown.
    onKeyPress(this, ['UP', 'W', 'DOWN', 'S'], () => this.toggleMode());
    onKeyPress(this, ['LEFT', 'A'], () => this.select(this.selected - 1));
    onKeyPress(this, ['RIGHT', 'D'], () => this.select(this.selected + 1));
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.startSelected());
    DIFFICULTIES.forEach((difficulty, index) => onKeyPress(this, [NUMBER_KEYS[index]], () => this.startGame(difficulty)));
    onKeyPress(this, ['H'], () => this.openHighScores());

    // Created last, so a controller button already held when the menu opens is not read as a press.
    this.pad = new MenuPadInput(this);
  }

  /**
   * Per-frame update: animates the title, sparks and runner, and acts on controller presses.
   *
   * @param _time - Total elapsed time in ms (unused).
   * @param delta - Time since the previous frame, in ms.
   */
  update(_time: number, delta: number): void {
    // Cap the step so a long frame (e.g. after a tab switch) cannot make the sparks or the runner jump.
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.clockMs += dt; // feeds the input delay and the sparks' twinkle
    this.title.update(dt);

    // Sparks rise and wrap from the top edge to just below the bottom; their opacity twinkles between 0 and 50%.
    for (const spark of this.sparks) {
      spark.image.y -= spark.speed * (dt / 1000);
      if (spark.image.y < -10) spark.image.y = GAME_HEIGHT + 10;
      spark.image.setAlpha(0.25 + 0.25 * Math.sin(this.clockMs * 0.002 + spark.phase));
    }

    // The runner jogs right and re-enters from the left once it is off the right edge.
    this.runner.x += RUNNER_SPEED * (dt / 1000);
    if (this.runner.x > GAME_WIDTH + 60) this.runner.x = -60;

    // Polled every frame so a held button reports once, as a press, instead of every frame.
    const events = this.pad.poll();
    // D-pad or stick up/down switches between one and two players, left/right moves the highlight;
    // a face button or Start starts it; Back/View opens the high scores.
    if (events.up || events.down) this.toggleMode();
    if (events.left) this.select(this.selected - 1);
    if (events.right) this.select(this.selected + 1);
    if (events.confirm || events.start) this.startSelected();
    if (events.select) this.openHighScores();
  }

  /**
   * Highlights one difficulty card and clears the highlight from the others. The highlight stops at either end rather than wrapping.
   *
   * @param index - 0-based index of the card to highlight; values outside the cards are clamped to the first or last one.
   */
  private select(index: number): void {
    this.selected = Math.min(this.cards.length - 1, Math.max(0, index));
    // Only the selected card shows its ring and enlargement.
    this.cards.forEach((card, i) => card.setSelected(i === this.selected));
  }

  /**
   * Chooses how many play: rings that button, fades the other and rewrites the goal line to match.
   *
   * @param count - 1 for a solo game, 2 for two players versus.
   */
  private setMode(count: PlayerCount): void {
    this.playerCount = count;
    const chosen = MODES.findIndex((mode) => mode.count === count); // index of the chosen button
    // The chosen button is solid, the other one faded.
    this.modeButtons.forEach((button, index) => button.setAlpha(index === chosen ? 1 : 0.55));
    // White outline 7 px outside the chosen button.
    const button = this.modeButtons[chosen];
    const { width, height } = MODE_BUTTON;
    this.modeRing.clear().lineStyle(5, 0xffffff).strokeRoundedRect(button.x - width / 2 - 7, button.y - height / 2 - 7, width + 14, height + 14, 24);
    this.tagline.setText(count === 1 ? SOLO_TAGLINE : VERSUS_TAGLINE);
  }

  /** Switches between one and two players. */
  private toggleMode(): void {
    this.setMode(this.playerCount === 1 ? 2 : 1);
  }

  /** Starts a run on the difficulty of the highlighted card. */
  private startSelected(): void {
    this.startGame(DIFFICULTIES[this.selected]);
  }

  /**
   * Starts a new run at level 1 on one difficulty, with the chosen number of players. Ignored until `INPUT_DELAY_MS` has passed since the menu opened.
   *
   * @param difficulty - Difficulty to play; it stays fixed for the whole run, and so does the number of players.
   */
  private startGame(difficulty: Difficulty): void {
    // A key or button still held from the previous screen must not start a game straight away.
    if (this.clockMs < INPUT_DELAY_MS) return;
    // The play scene gets a brand-new run: level 1 with no points.
    this.scene.start(SceneKey.Play, { run: startRun(difficulty, this.playerCount) });
  }

  /** Opens the high-score screen, unless the menu opened less than `INPUT_DELAY_MS` ago. */
  private openHighScores(): void {
    // Same guard as `startGame`: a held key or button from the previous screen must not trigger it.
    if (this.clockMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.HighScores);
  }
}
