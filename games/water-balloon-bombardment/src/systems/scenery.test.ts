import { describe, expect, it } from 'vitest';
import { mulberry32, scatterPoints } from './scenery';

const area = { left: 10, top: 20, right: 110, bottom: 70 };

describe('scatterPoints', () => {
  it('returns the requested number of points inside the area', () => {
    const points = scatterPoints(1, 200, area);
    expect(points).toHaveLength(200);
    for (const { x, y } of points) {
      expect(x).toBeGreaterThanOrEqual(area.left);
      expect(x).toBeLessThanOrEqual(area.right);
      expect(y).toBeGreaterThanOrEqual(area.top);
      expect(y).toBeLessThanOrEqual(area.bottom);
    }
  });

  it('is deterministic per seed and differs between seeds', () => {
    expect(scatterPoints(7, 10, area)).toEqual(scatterPoints(7, 10, area));
    expect(scatterPoints(7, 10, area)).not.toEqual(scatterPoints(8, 10, area));
  });
});

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const random = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
