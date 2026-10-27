import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_TOP, LANE_HEIGHT, catapultY, laneCenterY, laneCountFor, playerLane } from './config';

const fieldCenter = FIELD_TOP + FIELD_HEIGHT / 2;

describe('laneCountFor', () => {
  it('uses 3 lanes for 1 and 3 players and 4 lanes for 2 and 4', () => {
    expect([1, 2, 3, 4].map(laneCountFor)).toEqual([3, 4, 3, 4]);
  });
});

describe('playerLane', () => {
  it('puts 1 player in lane 2, 2 players in lanes 2-3, 3 in lanes 1-3 and 4 in lanes 1-4', () => {
    expect([0].map((p) => playerLane(p, 1))).toEqual([1]);
    expect([0, 1].map((p) => playerLane(p, 2))).toEqual([1, 2]);
    expect([0, 1, 2].map((p) => playerLane(p, 3))).toEqual([0, 1, 2]);
    expect([0, 1, 2, 3].map((p) => playerLane(p, 4))).toEqual([0, 1, 2, 3]);
  });
});

describe('laneCenterY', () => {
  it('centres the lanes on the field with equal empty grass above and below', () => {
    for (const count of [3, 4]) {
      const first = laneCenterY(0, count) - LANE_HEIGHT / 2 - FIELD_TOP;
      const last = FIELD_TOP + FIELD_HEIGHT - (laneCenterY(count - 1, count) + LANE_HEIGHT / 2);
      expect(first).toBe(last);
    }
  });

  it('keeps lanes one LANE_HEIGHT apart', () => {
    expect(laneCenterY(1, 4) - laneCenterY(0, 4)).toBe(LANE_HEIGHT);
  });
});

describe('catapultY', () => {
  it('centres a lone catapult in the field', () => {
    expect(catapultY(0, 1)).toBe(fieldCenter);
  });

  it('stands each catapult at the centre of its lane', () => {
    expect(catapultY(0, 2)).toBe(laneCenterY(1, 4));
    expect(catapultY(1, 2)).toBe(laneCenterY(2, 4));
    expect([0, 1, 2].map((p) => catapultY(p, 3))).toEqual([0, 1, 2].map((lane) => laneCenterY(lane, 3)));
    expect([0, 1, 2, 3].map((p) => catapultY(p, 4))).toEqual([0, 1, 2, 3].map((lane) => laneCenterY(lane, 4)));
  });

  it('is symmetric about the field centre for every player count', () => {
    for (let count = 1; count <= 4; count++) {
      const ys = Array.from({ length: count }, (_, i) => catapultY(i, count));
      expect(ys.reduce((sum, y) => sum + y, 0) / count).toBeCloseTo(fieldCenter);
    }
  });
});
