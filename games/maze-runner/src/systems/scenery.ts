/**
 * Random placement of background decoration.
 */
import type { Point, Rect } from './geometry';
import type { Random } from './rng';

/**
 * `count` random points inside `area`.
 *
 * @param random - Random source returning [0, 1); the same sequence gives the same points.
 * @param count - How many points to generate.
 * @param area - Screen rectangle (px) the points fall in; its top and left edges are included, its bottom and right edges are not.
 * @returns The points in generation order; they may overlap or cluster, as they are not spaced apart.
 */
export function scatter(random: Random, count: number, area: Rect): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: area.x + random() * area.width, y: area.y + random() * area.height });
  }
  return points;
}
