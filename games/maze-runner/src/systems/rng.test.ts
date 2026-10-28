/**
 * Tests for the seeded random helpers: a seed repeats its sequence, values stay in [0, 1), `pick` returns list items and `shuffle` reorders them.
 */
import { describe, expect, it } from 'vitest';
import { createRng, pick, shuffle } from './rng';

// A seed fixes the whole sequence, and every value is a float in [0, 1).
describe('createRng', () => {
  it('repeats for the same seed and differs between seeds', () => {
    const a = createRng(123);
    const b = createRng(123); // same seed as `a`
    const c = createRng(124); // a neighbouring seed
    const first = [a(), a(), a()]; // the first three values of seed 123
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  it('stays within [0, 1)', () => {
    const random = createRng(9);
    // Draw 1000 consecutive values; each must lie in [0, 1).
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

// `pick` chooses one element of a list, using the random source for the index.
describe('pick', () => {
  it('returns an element of the list', () => {
    const random = createRng(11);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(items).toContain(pick(random, items)); // each of 50 picks must be one of the items
  });
});

// `shuffle` returns the same elements in a seeded random order and leaves its input alone.
describe('shuffle', () => {
  it('keeps every element exactly once and does not touch the original', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffle(createRng(3), items);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items); // same elements, whatever the order
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // the input keeps its order
  });

  it('repeats for the same seed and reaches different orders for other seeds', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(createRng(5), items)).toEqual(shuffle(createRng(5), items)); // same seed, same order
    // Over 20 seeds the first element is not always the same, so the order really varies.
    const firsts = new Set(Array.from({ length: 20 }, (_, seed) => shuffle(createRng(seed), items)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });
});
