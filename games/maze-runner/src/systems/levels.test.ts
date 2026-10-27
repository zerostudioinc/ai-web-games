import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, mazeSizeForLevel } from './levels';

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
