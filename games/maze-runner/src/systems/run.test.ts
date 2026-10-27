/**
 * Tests for the run state that carries over between levels: starting a run, banking each level's points and finishing.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from './levels';
import { completeLevel, isRunComplete, startRun } from './run';

// A run starts on level 1 with no points, banks the points of each cleared level, and is complete after the last level.
describe('run state', () => {
  it('starts at level 1 with nothing scored', () => {
    expect(startRun('hard')).toEqual({ difficulty: 'hard', level: 1, totalScore: 0 });
  });

  it('adds each level score to the total and moves on', () => {
    const run = completeLevel(completeLevel(startRun('normal'), 1200), 900); // clear level 1 for 1200 points, then level 2 for 900
    expect(run.level).toBe(3); // two levels cleared, so level 3 is next
    expect(run.totalScore).toBe(2100); // 1200 + 900
  });

  it('does not change the run it was given', () => {
    const before = startRun('normal');
    completeLevel(before, 500); // the returned state is discarded; only `before` is inspected
    expect(before.level).toBe(1);
    expect(before.totalScore).toBe(0);
  });

  it('is complete only after the last level is cleared', () => {
    // Clear every level for 100 points each; the run stays unfinished until the last one is cleared.
    let run = startRun('normal');
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(isRunComplete(run)).toBe(false);
      run = completeLevel(run, 100);
    }
    expect(isRunComplete(run)).toBe(true); // the level counter has moved past LEVEL_COUNT
    expect(run.totalScore).toBe(100 * LEVEL_COUNT); // LEVEL_COUNT levels x 100 points
  });
});
