// Small seedable random number helpers, so a maze or baked scenery can be reproduced from its seed.

/** Returns a float in [0, 1) each time it is called. */
export type Random = () => number;

/** Mulberry32: tiny, fast and plenty good for maze layouts and decoration. */
export function createRng(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for each new level; only the layout it produces needs to be repeatable, not the seed itself. */
export const randomSeed = (): number => Math.floor(Math.random() * 0x100000000);

/** A random element of a non-empty list. */
export const pick = <T>(random: Random, items: readonly T[]): T => items[Math.floor(random() * items.length)];
