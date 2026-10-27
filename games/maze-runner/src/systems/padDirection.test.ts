import { describe, expect, it } from 'vitest';
import { stickDirection } from './padDirection';

describe('stickDirection', () => {
  it('ignores a stick resting near the centre', () => {
    expect(stickDirection(0.2, -0.1)).toBeNull();
    expect(stickDirection(0.5, 0)).toBeNull(); // exactly on the threshold
  });

  it('reports the four directions', () => {
    expect(stickDirection(0.9, 0.1)).toBe('right');
    expect(stickDirection(-0.9, 0.2)).toBe('left');
    expect(stickDirection(0.1, -0.9)).toBe('up');
    expect(stickDirection(-0.1, 0.9)).toBe('down');
  });

  it('lets the stronger axis win on a diagonal, and the horizontal axis win a tie', () => {
    expect(stickDirection(0.6, 0.9)).toBe('down');
    expect(stickDirection(0.8, 0.8)).toBe('right');
  });

  it('honours a custom threshold', () => {
    expect(stickDirection(0.3, 0, 0.2)).toBe('right');
  });
});
