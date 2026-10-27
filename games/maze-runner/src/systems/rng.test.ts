/**
 * Tests for the seeded random helpers: a seed repeats its sequence, values stay in [0, 1), and `pick` returns list items.
 */
import { describe, expect, it } from 'vitest';
import { createRng, pick } from './rng';

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
