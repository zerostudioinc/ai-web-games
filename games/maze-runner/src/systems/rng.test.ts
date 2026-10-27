import { describe, expect, it } from 'vitest';
import { createRng, pick } from './rng';

describe('createRng', () => {
  it('repeats for the same seed and differs between seeds', () => {
    const a = createRng(123);
    const b = createRng(123);
    const c = createRng(124);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  it('stays within [0, 1)', () => {
    const random = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('pick', () => {
  it('returns an element of the list', () => {
    const random = createRng(11);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(items).toContain(pick(random, items));
  });
});
