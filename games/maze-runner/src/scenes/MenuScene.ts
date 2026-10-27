// Main menu: the title, a card per difficulty showing its best score, and corner buttons for High Scores and Home.
import Phaser from 'phaser';
import { IDLE_FRAME, runnerFrameKey, runnerWalkKey } from '../assets/runnerArt';
import { Button } from '../entities/Button';
import { DifficultyCard } from '../entities/DifficultyCard';
import { TitleBanner } from '../entities/TitleBanner';
import { CORNER_BUTTON, GAME_HEIGHT, GAME_WIDTH, MAX_FRAME_MS, SceneKey, TextureKey } from '../config';
import { labelStyle } from '../style';
import { DIFFICULTIES, type Difficulty } from '../systems/difficulty';
import { bestScore } from '../systems/highScores';
import { onKeyPress } from '../systems/KeyPress';
import { MenuPadInput } from '../systems/MenuPadInput';
import { startRun } from '../systems/run';

const INPUT_DELAY_MS = 600; // after the menu opens, so a key or button held from the previous screen cannot start a game
const HOME_URL = '../../index.html'; // from games/<name>/index.html to the site homepage
const CARD_SPACING = 400;
const CARD_Y = 480;
const RUNNER_SPEED = 110; // px per second

interface Spark {
  image: Phaser.GameObjects.Image;
  speed: number; // px per second, upward
  phase: number;
}

export class MenuScene extends Phaser.Scene {
  private title!: TitleBanner;
  private runner!: Phaser.GameObjects.Sprite;
  private pad!: MenuPadInput;
  private cards: DifficultyCard[] = [];
  private sparks: Spark[] = [];
  private selected = 0;
  private clockMs = 0; // time since the menu opened, counted from frame deltas

  constructor() {
    super(SceneKey.Menu);
  }

  init(): void {
    this.cards = [];
    this.sparks = [];
    this.selected = 0;
    this.clockMs = 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.image(0, 0, TextureKey.MenuBackground).setOrigin(0);

    // Sparks drift up the screen behind everything else.
    for (let i = 0; i < 18; i++) {
      const image = this.add
        .image(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, TextureKey.Spark)
        .setTint(i % 2 === 0 ? 0x80deea : 0xfff59d)
        .setScale(0.6 + Math.random() * 0.8);
      this.sparks.push({ image, speed: 12 + Math.random() * 22, phase: Math.random() * Math.PI * 2 });
    }

    this.title = new TitleBanner(this, cx, [
      { text: 'MAZE', y: 115, size: 100, top: '#ffffff', bottom: '#80deea' },
      { text: 'RUNNER', y: 228, size: 124, top: '#fff59d', bottom: '#ff7043' },
    ]);
    this.add.text(cx, 318, 'Escape 10 mazes before the dead ends seal behind you!', labelStyle(26)).setOrigin(0.5);

    DIFFICULTIES.forEach((difficulty, index) => {
      const x = cx + (index - (DIFFICULTIES.length - 1) / 2) * CARD_SPACING;
      const card = new DifficultyCard(this, x, CARD_Y, difficulty, bestScore(difficulty), () => this.startGame(difficulty), () => this.select(index));
      this.cards.push(card);
    });
    this.select(0);

    // High Scores and Home share one size and sit in the top corners.
    const { width, height, fontSize, margin } = CORNER_BUTTON;
    const cornerY = margin + height / 2 - 2;
    new Button(this, margin + width / 2, cornerY, {
      width,
      height,
      label: 'High Scores',
      fontSize,
      color: 0xffd54f,
      onClick: () => this.openHighScores(),
    });
    new Button(this, GAME_WIDTH - margin - width / 2, cornerY, {
      width,
      height,
      label: 'Home',
      fontSize,
      color: 0x90caf9,
      onClick: () => window.location.assign(HOME_URL),
    });

    this.add.text(cx, 622, 'Arrows / WASD / D-pad / touch pad to run  |  Left-Right to choose, Enter to start  |  H: high scores  |  Esc or P to pause', labelStyle(18)).setOrigin(0.5);

    // A little runner jogs along the track at the bottom of the screen.
    this.runner = this.add.sprite(-60, GAME_HEIGHT - 44, runnerFrameKey('right', IDLE_FRAME)).setScale(1.2);
    this.runner.play(runnerWalkKey('right'));

    onKeyPress(this, ['LEFT', 'A'], () => this.select(this.selected - 1));
    onKeyPress(this, ['RIGHT', 'D'], () => this.select(this.selected + 1));
    onKeyPress(this, ['ENTER', 'SPACE'], () => this.startSelected());
    onKeyPress(this, ['ONE'], () => this.startGame('normal'));
    onKeyPress(this, ['TWO'], () => this.startGame('hard'));
    onKeyPress(this, ['H'], () => this.openHighScores());

    this.pad = new MenuPadInput(this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.clockMs += dt;
    this.title.update(dt);

    for (const spark of this.sparks) {
      spark.image.y -= spark.speed * (dt / 1000);
      if (spark.image.y < -10) spark.image.y = GAME_HEIGHT + 10;
      spark.image.setAlpha(0.25 + 0.25 * Math.sin(this.clockMs * 0.002 + spark.phase));
    }

    this.runner.x += RUNNER_SPEED * (dt / 1000);
    if (this.runner.x > GAME_WIDTH + 60) this.runner.x = -60;

    const events = this.pad.poll();
    if (events.left) this.select(this.selected - 1);
    if (events.right) this.select(this.selected + 1);
    if (events.confirm || events.start) this.startSelected();
    if (events.select) this.openHighScores();
  }

  private select(index: number): void {
    this.selected = Math.min(this.cards.length - 1, Math.max(0, index));
    this.cards.forEach((card, i) => card.setSelected(i === this.selected));
  }

  private startSelected(): void {
    this.startGame(DIFFICULTIES[this.selected]);
  }

  private startGame(difficulty: Difficulty): void {
    if (this.clockMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.Play, { run: startRun(difficulty) });
  }

  private openHighScores(): void {
    if (this.clockMs < INPUT_DELAY_MS) return;
    this.scene.start(SceneKey.HighScores);
  }
}
