/**
 * Tests for turning gamepad stick axes into a movement direction.
 */
import { describe, expect, it } from 'vitest';
import { stickDirection } from './padDirection';

// A stick counts only when pushed past the threshold; the stronger axis wins, and a tie goes to horizontal.
describe('stickDirection', () => {
  it('ignores a stick resting near the centre', () => {
    expect(stickDirection(0.2, -0.1)).toBeNull(); // both axes are well inside the default 0.5 threshold
    expect(stickDirection(0.5, 0)).toBeNull(); // exactly on the threshold, which must be exceeded to count
  });

  it('reports the four directions', () => {
    // Arguments are (x, y): negative x is left and negative y is up, as the pad reports them.
    expect(stickDirection(0.9, 0.1)).toBe('right');
    expect(stickDirection(-0.9, 0.2)).toBe('left');
    expect(stickDirection(0.1, -0.9)).toBe('up');
    expect(stickDirection(-0.1, 0.9)).toBe('down');
  });

  it('lets the stronger axis win on a diagonal, and the horizontal axis win a tie', () => {
    expect(stickDirection(0.6, 0.9)).toBe('down'); // |y| is larger than |x|
    expect(stickDirection(0.8, 0.8)).toBe('right'); // equal axes: horizontal wins
  });

  it('honours a custom threshold', () => {
    expect(stickDirection(0.3, 0, 0.2)).toBe('right'); // 0.3 is under the default 0.5 but over this 0.2
  });
});
