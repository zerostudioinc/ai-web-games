import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_SETTINGS } from './difficulty';

describe('DIFFICULTY_SETTINGS', () => {
  it('lets the runner go 5 steps into a dead end on Normal and 2 on Hard', () => {
    expect(DIFFICULTY_SETTINGS.normal.trapDepth).toBe(5);
    expect(DIFFICULTY_SETTINGS.hard.trapDepth).toBe(2);
  });

  it('pays more on Hard', () => {
    expect(DIFFICULTY_SETTINGS.hard.scoreMultiplier).toBeGreaterThan(DIFFICULTY_SETTINGS.normal.scoreMultiplier);
  });

  it('lists exactly the two modes', () => {
    expect(DIFFICULTIES).toEqual(['normal', 'hard']);
  });
});
