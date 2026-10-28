/**
 * Tests for the difficulty table: how deep into a dead end each mode lets the runner go, which modes warn before
 * the path seals, whether a sealed path stays blocked, and how much each mode pays.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY_SETTINGS } from './difficulty';

// Easy seals the path 6 steps into a dead end and warns first; Normal seals it 4 steps in, and Hard and Very Hard only
// 2 steps in, none of them with a warning. A sealed path stays blocked except on Very Hard, where it reopens.
// The harder the mode, the more a cleared level pays.
describe('DIFFICULTY_SETTINGS', () => {
  it('lets the runner go 6 steps into a dead end on Easy, 4 on Normal and 2 on Hard and Very Hard', () => {
    expect(DIFFICULTY_SETTINGS.easy.trapDepth).toBe(6);
    expect(DIFFICULTY_SETTINGS.normal.trapDepth).toBe(4);
    expect(DIFFICULTY_SETTINGS.hard.trapDepth).toBe(2);
    expect(DIFFICULTY_SETTINGS.veryHard.trapDepth).toBe(2);
  });

  it('warns before the path seals on Easy only', () => {
    expect(DIFFICULTY_SETTINGS.easy.warnsBeforeSeal).toBe(true);
    expect(DIFFICULTY_SETTINGS.normal.warnsBeforeSeal).toBe(false);
    expect(DIFFICULTY_SETTINGS.hard.warnsBeforeSeal).toBe(false);
    expect(DIFFICULTY_SETTINGS.veryHard.warnsBeforeSeal).toBe(false);
  });

  it('keeps a sealed path blocked on every mode except Very Hard', () => {
    expect(DIFFICULTY_SETTINGS.easy.sealsStayBlocked).toBe(true);
    expect(DIFFICULTY_SETTINGS.normal.sealsStayBlocked).toBe(true);
    expect(DIFFICULTY_SETTINGS.hard.sealsStayBlocked).toBe(true);
    expect(DIFFICULTY_SETTINGS.veryHard.sealsStayBlocked).toBe(false);
  });

  it('pays more the harder the mode', () => {
    expect(DIFFICULTY_SETTINGS.easy.scoreMultiplier).toBeLessThan(DIFFICULTY_SETTINGS.normal.scoreMultiplier);
    expect(DIFFICULTY_SETTINGS.hard.scoreMultiplier).toBeGreaterThan(DIFFICULTY_SETTINGS.normal.scoreMultiplier);
    expect(DIFFICULTY_SETTINGS.veryHard.scoreMultiplier).toBeGreaterThan(DIFFICULTY_SETTINGS.hard.scoreMultiplier);
  });

  it('lists exactly the four modes, easiest first', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'normal', 'hard', 'veryHard']); // the left-to-right order of the menu cards
  });

  it('names every mode', () => {
    for (const difficulty of DIFFICULTIES) expect(DIFFICULTY_SETTINGS[difficulty].label.length).toBeGreaterThan(0);
  });
});
