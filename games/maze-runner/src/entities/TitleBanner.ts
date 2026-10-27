/**
 * Big gradient title whose letters bob up and down, driven by frame delta.
 */
import Phaser from 'phaser';
import { COLOR, FONT, hex } from '../style';

/** One line of title text and how it is drawn. */
export interface TitleLine {
  text: string; // the words; each space becomes a gap between letters
  y: number; // vertical centre of the line, px
  size: number; // font size, px
  /** Gradient colours as CSS strings. */
  top: string; // colour near the top of each letter
  bottom: string; // colour near the bottom of each letter
}

/** One letter of the title, kept apart from its neighbours so it can bob on its own. */
interface Letter {
  text: Phaser.GameObjects.Text; // the letter's text object
  baseY: number; // resting y of the letter, px; the bob is added to it
  phase: number; // where this letter is in the wave, radians; it grows along the title so the wave travels
}

/** A title built from one text object per letter, so the letters can wave independently. */
export class TitleBanner {
  private readonly letters: Letter[] = []; // every visible letter (spaces have none), in reading order
  private elapsedMs = 0; // time since creation, ms; drives the wave

  /**
   * Lays out each line of the title centred on `centerX` and adds its letters to the scene.
   *
   * @param scene - Scene the letters are added to.
   * @param centerX - X the lines are centred on, px.
   * @param lines - The lines to show, each with its own height, font size and gradient colours.
   */
  constructor(scene: Phaser.Scene, centerX: number, lines: TitleLine[]) {
    // Wave position of the next letter, radians. It carries on across lines, so the wave flows from one line to the next.
    let phase = 0;
    for (const line of lines) {
      // Each letter is its own text object, so measure them all to centre the line.
      const tracking = -line.size * 0.03; // spacing between letters, px; slightly negative (3% of the font size) to tighten the line
      const spaceWidth = line.size * 0.32; // width of a space, px
      // One text object per character; a space has none (null), only a gap.
      const glyphs = [...line.text].map((ch) => (ch === ' ' ? null : this.makeLetter(scene, ch, line)));
      // Width of each slot: the letter's measured width, or the width of a space.
      const widths = glyphs.map((glyph) => (glyph ? glyph.width : spaceWidth));
      // Whole line width: all the slots plus the spacing between them.
      const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (widths.length - 1);

      // Walk along the line from its left edge, centring each letter in its slot.
      let x = centerX - total / 2;
      glyphs.forEach((glyph, i) => {
        if (glyph) {
          glyph.setPosition(x + widths[i] / 2, line.y);
          this.letters.push({ text: glyph, baseY: line.y, phase });
        }
        x += widths[i] + tracking;
        // The wave moves on by 0.55 rad per slot, spaces included.
        phase += 0.55;
      });
    }
  }

  /**
   * Moves every letter along the wave. Call once per frame.
   *
   * @param deltaMs - Time since the previous frame, in ms.
   */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    for (const letter of this.letters) {
      // Swings between -1 and 1; each letter's phase offsets it, so the motion ripples along the title.
      const wave = Math.sin(this.elapsedMs * 0.004 + letter.phase);
      // Bobs up to 7 px and tilts up to 0.04 rad (about 2 degrees).
      letter.text.y = letter.baseY + wave * 7;
      letter.text.rotation = wave * 0.04;
    }
  }

  /**
   * Creates the text object for one letter: outlined, shadowed and filled with the line's top-to-bottom gradient.
   *
   * @param scene - Scene the text is added to.
   * @param ch - The character to draw (a single character, never a space).
   * @param line - The line the letter belongs to; it supplies the font size and the gradient colours.
   * @returns The new text object, centred on its own origin; the caller positions it.
   */
  private makeLetter(scene: Phaser.Scene, ch: string, line: TitleLine): Phaser.GameObjects.Text {
    const text = scene.add
      .text(0, 0, ch, {
        fontFamily: FONT,
        fontSize: `${line.size}px`,
        color: line.top,
        // Dark outline (a sixth of the font size) and a hard drop shadow (a twelfth) so the letters read on any backdrop.
        stroke: hex(COLOR.ink),
        strokeThickness: Math.round(line.size / 6),
        shadow: { offsetX: 0, offsetY: Math.round(line.size / 12), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
        // Extra room inside the text's canvas, so the outline and shadow are not clipped.
        padding: { x: 6, y: Math.round(line.size * 0.15) },
      })
      .setOrigin(0.5);

    // Vertical gradient over the text's canvas height; the stops are pulled in from the edges so both colours show on the glyph, not the padding.
    const gradient = text.context.createLinearGradient(0, 0, 0, text.height);
    gradient.addColorStop(0.2, line.top);
    gradient.addColorStop(0.85, line.bottom);
    // Replace the flat colour with the gradient.
    text.setFill(gradient);
    return text;
  }
}
