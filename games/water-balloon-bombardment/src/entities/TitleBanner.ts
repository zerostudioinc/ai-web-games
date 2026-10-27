import Phaser from 'phaser';
import { COLOR, FONT, hex } from '../style';

export interface TitleLine {
  text: string;
  y: number;
  size: number;
  top: string; // gradient colours, CSS strings
  bottom: string;
}

interface Letter {
  text: Phaser.GameObjects.Text;
  baseY: number;
  phase: number;
}

/** Big gradient title whose letters bob up and down, driven by frame delta. */
export class TitleBanner {
  private readonly letters: Letter[] = [];
  private elapsedMs = 0;

  constructor(scene: Phaser.Scene, centerX: number, lines: TitleLine[]) {
    let phase = 0;
    for (const line of lines) {
      const tracking = -line.size * 0.03;
      const spaceWidth = line.size * 0.32;
      const glyphs = [...line.text].map((ch) => (ch === ' ' ? null : this.makeLetter(scene, ch, line)));
      const widths = glyphs.map((glyph) => (glyph ? glyph.width : spaceWidth));
      const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (widths.length - 1);

      let x = centerX - total / 2;
      glyphs.forEach((glyph, i) => {
        if (glyph) {
          glyph.setPosition(x + widths[i] / 2, line.y);
          this.letters.push({ text: glyph, baseY: line.y, phase });
        }
        x += widths[i] + tracking;
        phase += 0.55;
      });
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    for (const letter of this.letters) {
      const wave = Math.sin(this.elapsedMs * 0.004 + letter.phase);
      letter.text.y = letter.baseY + wave * 7;
      letter.text.rotation = wave * 0.04;
    }
  }

  private makeLetter(scene: Phaser.Scene, ch: string, line: TitleLine): Phaser.GameObjects.Text {
    const text = scene.add
      .text(0, 0, ch, {
        fontFamily: FONT,
        fontSize: `${line.size}px`,
        color: line.top,
        stroke: hex(COLOR.ink),
        strokeThickness: Math.round(line.size / 6),
        shadow: { offsetX: 0, offsetY: Math.round(line.size / 12), color: hex(COLOR.ink), blur: 0, fill: true, stroke: true },
        padding: { x: 6, y: Math.round(line.size * 0.15) },
      })
      .setOrigin(0.5);

    const gradient = text.context.createLinearGradient(0, 0, 0, text.height);
    gradient.addColorStop(0.2, line.top);
    gradient.addColorStop(0.85, line.bottom);
    text.setFill(gradient);
    return text;
  }
}
