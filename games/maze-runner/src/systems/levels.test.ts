/**
 * Tests for level progression: ten levels whose square mazes grow from 10x10 to 28x28.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';

// The maze side starts at 10 cells and grows by 2 per level, so level 10 has 10 + 9 x 2 = 28 cells per side.
describe('mazeSizeForLevel', () => {
  it('runs from 10x10 on level 1 to 28x28 on level 10', () => {
    expect(mazeSizeForLevel(1)).toBe(10);
    expect(mazeSizeForLevel(LEVEL_COUNT)).toBe(28);
  });

  it('has ten levels that each grow the maze', () => {
    expect(LEVEL_COUNT).toBe(10);
    for (let level = 2; level <= LEVEL_COUNT; level++) {
      expect(mazeSizeForLevel(level)).toBeGreaterThan(mazeSizeForLevel(level - 1));
    }
  });
});
