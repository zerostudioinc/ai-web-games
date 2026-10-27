/**
 * Small seedable random number helpers, so a maze or baked scenery can be reproduced from its seed.
 */

/** Returns a float in [0, 1) each time it is called. */
export type Random = () => number;

/**
 * Mulberry32: tiny, fast and plenty good for maze layouts and decoration.
 *
 * @param seed - Any number; it is truncated to an unsigned 32-bit integer, and the same seed always gives the same sequence.
 * @returns A generator that yields the next float in [0, 1) on every call.
 */
export function createRng(seed: number): Random {
  let state = seed >>> 0; // 32-bit generator state, advanced once per call
  // Each call steps the state forward and turns it into the next number of the sequence.
  return () => {
    // Advance by Mulberry32's odd constant, wrapping within 32 bits.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    // Scramble the bits with multiply and xor-shift rounds so consecutive outputs look random.
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Treat the result as unsigned 32-bit and scale it down to [0, 1).
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A fresh seed for each new level; only the layout it produces needs to be repeatable, not the seed itself.
 *
 * @returns A random integer from 0 up to, but not including, 2^32.
 */
export const randomSeed = (): number => Math.floor(Math.random() * 0x100000000);

/**
 * A random element of a non-empty list.
 *
 * @param random - Random source returning [0, 1).
 * @param items - The list to choose from; it must not be empty (an empty list gives undefined).
 * @returns One element of `items`, each equally likely.
 */
export const pick = <T>(random: Random, items: readonly T[]): T => items[Math.floor(random() * items.length)];
