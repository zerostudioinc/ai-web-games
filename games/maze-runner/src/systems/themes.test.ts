import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { THEMES, THEME_IDS, pickTheme } from './themes';

describe('pickTheme', () => {
  it('never repeats the previous level theme', () => {
    const random = createRng(8);
    let previous = pickTheme(random);
    for (let i = 0; i < 200; i++) {
      const next = pickTheme(random, previous);
      expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it('reaches every theme', () => {
    const random = createRng(2);
    const seen = new Set(Array.from({ length: 100 }, () => pickTheme(random)));
    expect([...seen].sort()).toEqual([...THEME_IDS].sort());
  });
});

describe('THEMES', () => {
  it('has a palette for each of the four themes', () => {
    expect(THEME_IDS).toEqual(['grassland', 'desert', 'dungeon', 'spaceship']);
    for (const id of THEME_IDS) expect(THEMES[id].label.length).toBeGreaterThan(0);
  });
});
