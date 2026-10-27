import { describe, expect, it } from 'vitest';
import { FIELD_TOP, GAME_HEIGHT, catapultY, laneCenterY } from './config';

const fieldCenter = FIELD_TOP + (GAME_HEIGHT - FIELD_TOP) / 2;

describe('catapultY', () => {
  it('centres a lone catapult in the field', () => {
    expect(catapultY(0, 1)).toBe(fieldCenter);
  });

  it('uses the middle two lanes for 2 players and every lane for 4', () => {
    expect(catapultY(0, 2)).toBe(laneCenterY(1));
    expect(catapultY(1, 2)).toBe(laneCenterY(2));
    expect([0, 1, 2, 3].map((p) => catapultY(p, 4))).toEqual([0, 1, 2, 3].map(laneCenterY));
  });

  it('keeps the group centred with its middle catapult on the centre line for 3 players', () => {
    expect(catapultY(1, 3)).toBe(fieldCenter);
    expect(catapultY(0, 3) + catapultY(2, 3)).toBe(2 * fieldCenter);
  });

  it('is symmetric about the field centre for every player count', () => {
    for (let count = 1; count <= 4; count++) {
      const ys = Array.from({ length: count }, (_, i) => catapultY(i, count));
      expect(ys.reduce((sum, y) => sum + y, 0) / count).toBeCloseTo(fieldCenter);
    }
  });
});
