import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { scatter } from './scenery';

describe('scatter', () => {
  const area = { x: 100, y: 50, width: 200, height: 80 };

  it('returns the requested number of points, all inside the area', () => {
    const points = scatter(createRng(1), 200, area);
    expect(points).toHaveLength(200);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(area.x);
      expect(point.x).toBeLessThanOrEqual(area.x + area.width);
      expect(point.y).toBeGreaterThanOrEqual(area.y);
      expect(point.y).toBeLessThanOrEqual(area.y + area.height);
    }
  });

  it('repeats for the same seed', () => {
    expect(scatter(createRng(4), 10, area)).toEqual(scatter(createRng(4), 10, area));
  });
});
