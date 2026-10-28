/**
 * Tests for the run state that carries over between levels: starting a run, banking each player's points per level and finishing.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from './levels';
import { createRng } from './rng';
import { bankPoints, completeLevel, isRunComplete, startRun, themeOfLevel } from './run';
import { THEME_IDS } from './themes';

// A run starts on level 1 with no points, banks the points of each cleared level, and is complete after the last level.
describe('run state', () => {
  it('starts at level 1 with nothing scored', () => {
    const run = startRun('hard', 1, createRng(1));
    expect(run).toMatchObject({ difficulty: 'hard', playerCount: 1, level: 1, totals: [0] });
  });

  it('keeps one total per player in a versus run', () => {
    expect(startRun('normal', 2, createRng(1)).totals).toEqual([0, 0]);
  });

  it('defaults to a solo run', () => {
    expect(startRun('normal').playerCount).toBe(1);
  });

  it('adds each level score to the total and moves on', () => {
    const run = completeLevel(completeLevel(startRun('normal'), [1200]), [900]); // clear level 1 for 1200 points, then level 2 for 900
    expect(run.level).toBe(3); // two levels cleared, so level 3 is next
    expect(run.totals).toEqual([2100]); // 1200 + 900
  });

  it('banks each player of a versus run separately', () => {
    const run = completeLevel(completeLevel(startRun('normal', 2), [1200, 800]), [900, 1100]);
    expect(run.totals).toEqual([2100, 1900]); // player one 1200 + 900, player two 800 + 1100
  });

  it('does not change the run it was given', () => {
    const before = startRun('normal');
    completeLevel(before, [500]); // the returned state is discarded; only `before` is inspected
    expect(before.level).toBe(1);
    expect(before.totals).toEqual([0]);
  });

  it('can bank points without moving on, for a match that ends part-way through a level', () => {
    const run = bankPoints(startRun('normal', 2), [700, 0]); // only player one had escaped
    expect(run.level).toBe(1); // still on the same level
    expect(run.totals).toEqual([700, 0]);
  });

  it('is complete only after the last level is cleared', () => {
    // Clear every level for 100 points each; the run stays unfinished until the last one is cleared.
    let run = startRun('normal');
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(isRunComplete(run)).toBe(false);
      run = completeLevel(run, [100]);
    }
    expect(isRunComplete(run)).toBe(true); // the level counter has moved past LEVEL_COUNT
    expect(run.totals).toEqual([100 * LEVEL_COUNT]); // LEVEL_COUNT levels x 100 points
  });
});

// The run fixes the theme of every level when it starts, and clearing a level does not change them.
describe('run themes', () => {
  it('gives every level one of the themes, each theme twice', () => {
    const run = startRun('normal', 1, createRng(5));
    expect(run.themes).toHaveLength(LEVEL_COUNT);
    for (const id of THEME_IDS) expect(run.themes.filter((theme) => theme === id)).toHaveLength(2);
  });

  it('looks a level up by its 1-based number', () => {
    const run = startRun('normal', 1, createRng(5));
    expect(themeOfLevel(run, 1)).toBe(run.themes[0]);
    expect(themeOfLevel(run, LEVEL_COUNT)).toBe(run.themes[LEVEL_COUNT - 1]);
  });

  it('keeps the themes as levels are cleared', () => {
    const run = startRun('normal', 2, createRng(9));
    expect(completeLevel(run, [100, 100]).themes).toEqual(run.themes);
  });
});
