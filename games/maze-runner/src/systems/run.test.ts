import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from './levels';
import { completeLevel, isRunComplete, startRun } from './run';

describe('run state', () => {
  it('starts at level 1 with nothing scored', () => {
    expect(startRun('hard')).toEqual({ difficulty: 'hard', level: 1, totalScore: 0 });
  });

  it('adds each level score to the total and moves on', () => {
    const run = completeLevel(completeLevel(startRun('normal'), 1200), 900);
    expect(run.level).toBe(3);
    expect(run.totalScore).toBe(2100);
  });

  it('does not change the run it was given', () => {
    const before = startRun('normal');
    completeLevel(before, 500);
    expect(before.level).toBe(1);
    expect(before.totalScore).toBe(0);
  });

  it('is complete only after the last level is cleared', () => {
    let run = startRun('normal');
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(isRunComplete(run)).toBe(false);
      run = completeLevel(run, 100);
    }
    expect(isRunComplete(run)).toBe(true);
    expect(run.totalScore).toBe(100 * LEVEL_COUNT);
  });
});
