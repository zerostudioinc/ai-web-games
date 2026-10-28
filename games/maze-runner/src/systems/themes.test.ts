/**
 * Tests for level themes: every theme has a palette, and a run's schedule uses each theme equally often with no neighbouring repeats.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from './levels';
import { createRng } from './rng';
import { THEMES, THEME_IDS, themeSchedule } from './themes';

// A ten-level run has one theme per level: each of the five themes appears twice, and no level looks like the one before it.
describe('themeSchedule', () => {
  it('gives a theme to every level', () => {
    expect(themeSchedule(createRng(1), LEVEL_COUNT)).toHaveLength(LEVEL_COUNT);
  });

  it('uses each theme exactly twice in a ten-level run', () => {
    for (let seed = 0; seed < 50; seed++) {
      const schedule = themeSchedule(createRng(seed), 10);
      for (const id of THEME_IDS) expect(schedule.filter((theme) => theme === id)).toHaveLength(2);
    }
  });

  it('never puts the same theme on two neighbouring levels', () => {
    for (let seed = 0; seed < 200; seed++) {
      const schedule = themeSchedule(createRng(seed), 10);
      schedule.forEach((theme, index) => {
        if (index > 0) expect(theme).not.toBe(schedule[index - 1]);
      });
    }
  });

  it('repeats for the same seed and varies between seeds', () => {
    expect(themeSchedule(createRng(7), 10)).toEqual(themeSchedule(createRng(7), 10));
    // Over 20 seeds the first level is not always the same theme.
    const firsts = new Set(Array.from({ length: 20 }, (_, seed) => themeSchedule(createRng(seed), 10)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('shares the themes out evenly when the levels do not divide by five', () => {
    const schedule = themeSchedule(createRng(4), 7);
    // Seven levels over five themes: every theme once, and two of them twice.
    const counts = THEME_IDS.map((id) => schedule.filter((theme) => theme === id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

// Every theme in the pool has a palette with a display name.
describe('THEMES', () => {
  it('has a palette for each of the five themes', () => {
    expect(THEME_IDS).toEqual(['grassland', 'desert', 'dungeon', 'spaceship', 'mountain']);
    for (const id of THEME_IDS) expect(THEMES[id].label.length).toBeGreaterThan(0); // the label appears in the level intro banner, so it cannot be empty
  });

  it('splits a ten-level run evenly across the themes, which is why there are five', () => {
    expect(LEVEL_COUNT % THEME_IDS.length).toBe(0);
  });
});
