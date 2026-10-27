/**
 * Tests for level themes: the random pick never repeats the previous theme, and every theme has a palette.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { THEMES, THEME_IDS, pickTheme } from './themes';

// Each level gets a random theme that differs from the previous level's, and every theme can come up.
describe('pickTheme', () => {
  it('never repeats the previous level theme', () => {
    const random = createRng(8);
    let previous = pickTheme(random); // the first level has no previous theme
    // 200 more levels in a row, each picked with the previous level's theme excluded.
    for (let i = 0; i < 200; i++) {
      const next = pickTheme(random, previous);
      expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it('reaches every theme', () => {
    const random = createRng(2);
    // 100 picks with no previous theme, to see which themes turn up.
    const seen = new Set(Array.from({ length: 100 }, () => pickTheme(random)));
    // Both lists are sorted so the comparison ignores the order in which themes first appeared.
    expect([...seen].sort()).toEqual([...THEME_IDS].sort());
  });
});

// Every theme in the pool has a palette with a display name.
describe('THEMES', () => {
  it('has a palette for each of the four themes', () => {
    expect(THEME_IDS).toEqual(['grassland', 'desert', 'dungeon', 'spaceship']);
    for (const id of THEME_IDS) expect(THEMES[id].label.length).toBeGreaterThan(0); // the label appears in the level intro banner, so it cannot be empty
  });
});
