/**
 * Tests for the difficulty table: how deep into a dead end each mode lets the runner go, and how much each mode pays.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_SETTINGS } from './difficulty';

// Normal seals the path 5 steps into a dead end, Hard only 2 steps in but pays more; the menu lists Normal first.
describe('DIFFICULTY_SETTINGS', () => {
  it('lets the runner go 5 steps into a dead end on Normal and 2 on Hard', () => {
    expect(DIFFICULTY_SETTINGS.normal.trapDepth).toBe(5);
    expect(DIFFICULTY_SETTINGS.hard.trapDepth).toBe(2);
  });

  it('pays more on Hard', () => {
    expect(DIFFICULTY_SETTINGS.hard.scoreMultiplier).toBeGreaterThan(DIFFICULTY_SETTINGS.normal.scoreMultiplier);
  });

  it('lists exactly the two modes', () => {
    expect(DIFFICULTIES).toEqual(['normal', 'hard']); // the left-to-right order of the menu cards
  });
});
