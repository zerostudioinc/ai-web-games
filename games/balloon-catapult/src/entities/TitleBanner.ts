/**
 * Animated title text: every letter is its own text object so the letters can bob in a wave.
 */
import Phaser from 'phaser';
import { COLOR, FONT, hex } from '../style';

/** One line of title text and how to draw it. */
export interface TitleLine {
  text: string; // the words to show
  y: number; // vertical centre in px
  size: number; // font size in px
  top: string; // gradient colour at the top of the letters, as a CSS string
  bottom: string; // gradient colour at the bottom of the letters, as a CSS string
}

/** A single letter and the state of its bobbing animation. */
interface Letter {
  text: Phaser.GameObjects.Text; // the letter's text object
  baseY: number; // resting y, px
  phase: number; // offset into the wave, so neighbouring letters bob out of step
}

/** Big gradient title whose letters bob up and down, driven by frame delta. */
export class TitleBanner {
  private readonly letters: Letter[] = []; // every letter of every line, in reading order
  private elapsedMs = 0; // animation clock

  /**
   * Lays out each line letter by letter, centred horizontally.
   *
   * @param scene - Scene the letters are added to.
   * @param centerX - X the lines are centred on, in px.
   * @param lines - Lines to show, each with its own position, size and colours.
   */
  constructor(scene: Phaser.Scene, centerX: number, lines: TitleLine[]) {
    let phase = 0; // keeps increasing across lines so the wave flows from one line into the next
    for (const line of lines) {
      const tracking = -line.size * 0.03; // slightly tight letter spacing
      const spaceWidth = line.size * 0.32; // a space has no glyph, so it gets a fixed gap
      // A null entry stands for a space.
      const glyphs = [...line.text].map((ch) => (ch === ' ' ? null : this.makeLetter(scene, ch, line)));
      const widths = glyphs.map((glyph) => (glyph ? glyph.width : spaceWidth));
      const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (widths.length - 1);

      // Walk left to right from the line's left edge, placing each glyph at the centre of its slot.
      let x = centerX - total / 2;
      glyphs.forEach((glyph, i) => {
        if (glyph) {
          glyph.setPosition(x + widths[i] / 2, line.y);
          this.letters.push({ text: glyph, baseY: line.y, phase });
        }
        x += widths[i] + tracking;
        // Spaces advance the wave too, so the motion stays smooth across a gap.
        phase += 0.55;
      });
    }
  }

  /**
   * Bobs every letter up and down in a travelling wave and tilts it slightly.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    for (const letter of this.letters) {
      const wave = Math.sin(this.elapsedMs * 0.004 + letter.phase);
      letter.text.y = letter.baseY + wave * 7;
      letter.text.rotation = wave * 0.04;
    }
  }

  /**
   * Creates one outlined letter with a vertical colour gradient.
   *
   * @param scene - Scene the letter is added to.
   * @param ch - The single character to draw.
   * @param line - The line the letter belongs to, which supplies size and gradient colours.
   * @returns The letter's text object, centred on its own origin and not yet positioned.
   */
  private makeLetter(scene: Phaser.Scene, ch: string, line: TitleLine): Phaser.GameObjects.Text {
    const text = scene.add
      .text(0, 0, ch, {
        fontFamily: FONT,
        fontSize: `${line.size}px`,
        color: line.top,
        stroke: hex(COLOR.ink),
        strokeThickness: Math.round(line.size / 6),
        shadow: { offsetX: 0, offsetY: Math.round(line.size / 12), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
        // Extra canvas padding so the thick outline and shadow are not clipped.
        padding: { x: 6, y: Math.round(line.size * 0.15) },
      })
      .setOrigin(0.5);

    // Fill with a top-to-bottom gradient; the stops are given in the text's own canvas coordinates.
    const gradient = text.context.createLinearGradient(0, 0, 0, text.height);
    gradient.addColorStop(0.2, line.top);
    gradient.addColorStop(0.85, line.bottom);
    text.setFill(gradient);
    return text;
  }
}
