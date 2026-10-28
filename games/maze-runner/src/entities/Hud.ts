/**
 * The status bar along the top of the play screen: level, lives, clock, score and the pause button.
 * A solo game gets one wide bar. A versus game splits it in two, one half of readouts for each player, with the pause
 * button between them and a thin strip underneath that shows the level and which keys steer each player.
 */
import type Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT, MAX_LIVES, PLAYER_COLORS, TextureKey } from '../config';
import { COLOR, hex, labelStyle } from '../style';
import { LEVEL_COUNT } from '../systems/levels';
import type { PlayerCount } from '../systems/run';
import { formatScore, formatTime } from '../systems/score';
import { Button } from './Button';

const DEPTH = 50; // draw order of the bar's background strip; its text, hearts and button sit one level above
const BAR_CENTER_Y = HUD_HEIGHT / 2; // vertical centre of the bar, px
const STRIP_Y = HUD_HEIGHT + 15; // vertical centre of the versus strip under the bar, px
const VERSUS_LEFT = 16; // x where the left player's readouts begin in versus, px
const VERSUS_RIGHT = GAME_WIDTH / 2 + 70; // x where the right player's readouts begin: just right of the pause button, px

/** Where the parts of one player's readouts go, in px. */
interface ReadoutLayout {
  heartX: number; // x of the first heart's centre
  heartStep: number; // distance between neighbouring hearts
  heartScale: number; // size of a heart relative to its texture
  timeCaptionX: number; // x of the right edge of the "TIME" caption; the clock starts just right of it
  scoreCaptionX: number; // x of the right edge of the "SCORE" caption; the score starts just right of it
  captionSize: number; // font size of the captions
  valueSize: number; // font size of the clock and the score
  gap: number; // space between a caption and its value
}

/** The wide bar of a solo game. */
const SOLO_LAYOUT: ReadoutLayout = { heartX: 310, heartStep: 46, heartScale: 0.85, timeCaptionX: 548, scoreCaptionX: 848, captionSize: 18, valueSize: 36, gap: 12 };

/**
 * The readouts of one half of a versus bar, relative to the x where the half begins.
 *
 * @param left - X where the half's readouts begin, px.
 * @returns The layout for that half.
 */
const versusLayout = (left: number): ReadoutLayout => ({
  heartX: left + 74,
  heartStep: 36,
  heartScale: 0.7,
  timeCaptionX: left + 262,
  scoreCaptionX: left + 440,
  captionSize: 14,
  valueSize: 28,
  gap: 8,
});

/** What the bar shows for one player, and what it showed last, so unchanged values are not set again. */
interface Readout {
  hearts: Phaser.GameObjects.Image[]; // one heart per possible life, left to right
  time: Phaser.GameObjects.Text; // level clock, formatted m:ss.t
  score: Phaser.GameObjects.Text; // total score, with thousands separators
  shownLives: number; // lives currently drawn
  shownTime: string; // clock text currently on screen
  shownScore: number; // score currently on screen
}

/**
 * Adds one player's hearts, clock and score to the scene.
 *
 * @param scene - Scene the readouts are added to.
 * @param depth - Draw order of the readouts.
 * @param layout - Where each part goes.
 * @returns The readout, starting with full lives, a zero clock and a zero score.
 */
function buildReadout(scene: Phaser.Scene, depth: number, layout: ReadoutLayout): Readout {
  // One heart per life.
  const hearts = Array.from({ length: MAX_LIVES }, (_, i) =>
    scene.add.image(layout.heartX + i * layout.heartStep, BAR_CENTER_Y, TextureKey.HeartFull).setScale(layout.heartScale).setDepth(depth),
  );
  // Small captions sit just left of the value they describe, right-aligned against it and 3 px below its centre line.
  const caption = labelStyle(layout.captionSize, hex(COLOR.sky));
  scene.add.text(layout.timeCaptionX, BAR_CENTER_Y + 3, 'TIME', caption).setOrigin(1, 0.5).setDepth(depth);
  const time = scene.add.text(layout.timeCaptionX + layout.gap, BAR_CENTER_Y, formatTime(0), labelStyle(layout.valueSize)).setOrigin(0, 0.5).setDepth(depth);
  scene.add.text(layout.scoreCaptionX, BAR_CENTER_Y + 3, 'SCORE', caption).setOrigin(1, 0.5).setDepth(depth);
  const score = scene.add.text(layout.scoreCaptionX + layout.gap, BAR_CENTER_Y, '0', labelStyle(layout.valueSize)).setOrigin(0, 0.5).setDepth(depth);
  return { hearts, time, score, shownLives: MAX_LIVES, shownTime: formatTime(0), shownScore: 0 };
}

/** The play screen's status bar. The scene feeds it values through the `set...` methods; it keeps no game state of its own. */
export class Hud {
  private readonly levelText: Phaser.GameObjects.Text; // "LEVEL n/total" readout: at the left end of a solo bar, in the middle of the versus strip
  private readonly readouts: Readout[] = []; // one per player, player one first

  /**
   * Builds the bar: level, lives, clock and score readouts for each player, and the pause button. Readouts start at their empty values.
   *
   * @param scene - Scene the bar is added to.
   * @param playerCount - Players in the game, 1 or 2.
   * @param onPause - Runs when the pause button is clicked or tapped.
   */
  constructor(scene: Phaser.Scene, playerCount: PlayerCount, onPause: () => void) {
    // Background strip, anchored at the screen's top-left corner.
    scene.add.image(0, 0, TextureKey.HudBar).setOrigin(0).setDepth(DEPTH);
    // Everything else sits one depth above the strip.
    const above = DEPTH + 1;

    if (playerCount === 1) {
      this.levelText = scene.add.text(24, BAR_CENTER_Y, '', labelStyle(30)).setOrigin(0, 0.5).setDepth(above);
      this.readouts.push(buildReadout(scene, above, SOLO_LAYOUT));
    } else {
      // Each player's half: a coloured name tag, then the same readouts in a smaller size.
      [VERSUS_LEFT, VERSUS_RIGHT].forEach((left, player) => {
        scene.add.text(left + 22, BAR_CENTER_Y, `P${player + 1}`, labelStyle(26, hex(PLAYER_COLORS[player]))).setOrigin(0.5).setDepth(above);
        this.readouts.push(buildReadout(scene, above, versusLayout(left)));
      });
      // The strip under the bar: the level in the middle and each player's controls at their own edge.
      this.levelText = scene.add.text(GAME_WIDTH / 2, STRIP_Y, '', labelStyle(20)).setOrigin(0.5).setDepth(above);
      scene.add.text(VERSUS_LEFT, STRIP_Y, 'P1: W A S D or controller 1', labelStyle(16, hex(PLAYER_COLORS[0]))).setOrigin(0, 0.5).setDepth(above);
      scene.add.text(GAME_WIDTH - VERSUS_LEFT, STRIP_Y, 'P2: arrow keys or controller 2', labelStyle(16, hex(PLAYER_COLORS[1]))).setOrigin(1, 0.5).setDepth(above);
    }

    // Pause button, 2 px above the centre line so its drop shadow stays clear of the bar's bottom stripe: at the right end of a solo
    // bar, between the two halves of a versus bar.
    const pauseX = playerCount === 1 ? GAME_WIDTH - 80 : GAME_WIDTH / 2;
    new Button(scene, pauseX, BAR_CENTER_Y - 2, { width: 120, height: 48, label: 'Pause', fontSize: 24, color: 0x90caf9, onClick: onPause }).setDepth(above);
  }

  /**
   * Shows which level is being played, as "LEVEL n/total".
   *
   * @param level - 1-based level number.
   */
  setLevel(level: number): void {
    this.levelText.setText(`LEVEL ${level}/${LEVEL_COUNT}`);
  }

  /**
   * Full hearts for lives left, greyed-out hearts for lives lost. Only touches the hearts when the number of lives changes.
   *
   * @param player - 0-based player number.
   * @param lives - Lives that player has left, from 0 to `MAX_LIVES`.
   */
  setLives(player: number, lives: number): void {
    const readout = this.readouts[player];
    if (lives === readout.shownLives) return;
    readout.shownLives = lives;
    readout.hearts.forEach((heart, index) => heart.setTexture(index < lives ? TextureKey.HeartFull : TextureKey.HeartEmpty));
  }

  /**
   * Updates a player's clock readout. Only touches the text object when the visible tenth of a second changes.
   *
   * @param player - 0-based player number.
   * @param ms - Time elapsed in the level, in ms.
   */
  setTime(player: number, ms: number): void {
    const readout = this.readouts[player];
    const text = formatTime(ms);
    if (text === readout.shownTime) return;
    readout.shownTime = text;
    readout.time.setText(text);
  }

  /**
   * Updates a player's score readout. Only touches the text object when the score changes.
   *
   * @param player - 0-based player number.
   * @param score - The total score to show; it is rounded and shown with thousands separators.
   */
  setScore(player: number, score: number): void {
    const readout = this.readouts[player];
    if (score === readout.shownScore) return;
    readout.shownScore = score;
    readout.score.setText(formatScore(score));
  }
}
