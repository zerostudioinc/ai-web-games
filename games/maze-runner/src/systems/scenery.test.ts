/**
 * Tests for `scatter`: random decoration points must stay inside their rectangle and repeat for the same seed.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { scatter } from './scenery';

// Scattered points stay inside the area, and the same seed gives the same points.
describe('scatter', () => {
  // Test rectangle in px, spanning x 100 to 300 and y 50 to 130.
  const area = { x: 100, y: 50, width: 200, height: 80 };

  it('returns the requested number of points, all inside the area', () => {
    const points = scatter(createRng(1), 200, area); // 200 points from seed 1
    expect(points).toHaveLength(200);
    for (const point of points) {
      // Bounds check on both axes: x within 100..300 and y within 50..130, with the edges allowed.
      expect(point.x).toBeGreaterThanOrEqual(area.x);
      expect(point.x).toBeLessThanOrEqual(area.x + area.width);
      expect(point.y).toBeGreaterThanOrEqual(area.y);
      expect(point.y).toBeLessThanOrEqual(area.y + area.height);
    }
  });

  it('repeats for the same seed', () => {
    expect(scatter(createRng(4), 10, area)).toEqual(scatter(createRng(4), 10, area)); // two runs with seed 4 give identical points
  });
});
