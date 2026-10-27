import { describe, expect, it } from 'vitest';
import { FIELD_TOP, GAME_HEIGHT, catapultY, laneCenterY } from './config';

describe('catapultY', () => {
  it('centres a lone catapult in the field', () => {
    expect(catapultY(0, 1)).toBe(FIELD_TOP + (GAME_HEIGHT - FIELD_TOP) / 2);
  });

  it('puts each catapult in its own lane with 2+ players', () => {
    expect(catapultY(0, 2)).toBe(laneCenterY(0));
    expect(catapultY(3, 4)).toBe(laneCenterY(3));
  });
});
