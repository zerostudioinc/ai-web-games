/**
 * Tests for which keys and controllers steer which player.
 */
import { describe, expect, it } from 'vitest';
import { PAD_SLOTS, keySchemesFor, padSlotsFor } from './controls';

// Alone, a player may use every key set and every controller; in versus the keyboard and the controllers are split.
describe('keySchemesFor', () => {
  it('lets a solo player use WASD and the arrow keys', () => {
    expect(keySchemesFor(0, 1)).toEqual(['wasd', 'arrows']);
  });

  it('gives player one WASD and player two the arrow keys in versus', () => {
    expect(keySchemesFor(0, 2)).toEqual(['wasd']);
    expect(keySchemesFor(1, 2)).toEqual(['arrows']);
  });
});

describe('padSlotsFor', () => {
  it('lets a solo player use every controller', () => {
    expect(padSlotsFor(0, 1)).toEqual(Array.from({ length: PAD_SLOTS }, (_, slot) => slot));
  });

  it('gives each versus player their own controller: the first for player one, the second for player two', () => {
    expect(padSlotsFor(0, 2)).toEqual([0]);
    expect(padSlotsFor(1, 2)).toEqual([1]);
  });

  it('never lets two versus players share a controller or a key', () => {
    expect(padSlotsFor(0, 2).filter((slot) => padSlotsFor(1, 2).includes(slot))).toEqual([]);
    expect(keySchemesFor(0, 2).filter((scheme) => keySchemesFor(1, 2).includes(scheme))).toEqual([]);
  });
});
