// Random placement of background decoration.
import type { Point, Rect } from './geometry';
import type { Random } from './rng';

/** `count` random points inside `area`. */
export function scatter(random: Random, count: number, area: Rect): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: area.x + random() * area.width, y: area.y + random() * area.height });
  }
  return points;
}
