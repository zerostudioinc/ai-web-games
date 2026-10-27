import { LANE_COUNT, catapultY, laneCenterY } from '../config';
import { clamp, type Vec2 } from './movement';

export const flightTimeMs = (distance: number, speed: number, minMs: number, maxMs: number): number =>
  clamp((distance / speed) * 1000, minMs, maxMs);

/** Straight-line position plus a visual arc; the balloon lands exactly on `target` at t = 1. */
export function balloonPosition(start: Vec2, target: Vec2, t: number, arcHeight: number): Vec2 {
  const progress = clamp(t, 0, 1);
  return {
    x: start.x + (target.x - start.x) * progress,
    y: start.y + (target.y - start.y) * progress - Math.sin(Math.PI * progress) * arcHeight,
  };
}

export function indicesInRadius(points: Vec2[], center: Vec2, radius: number): number[] {
  const hits: number[] = [];
  points.forEach((point, index) => {
    if (Math.hypot(point.x - center.x, point.y - center.y) <= radius) hits.push(index);
  });
  return hits;
}

// A bomb attacks the catapult nearest its lane; on a tie the upper catapult is hit.
export function targetPlayerForLane(lane: number, playerCount: number): number {
  const laneY = laneCenterY(Math.min(Math.max(lane, 0), LANE_COUNT - 1));
  let best = 0;
  for (let player = 1; player < playerCount; player++) {
    if (Math.abs(catapultY(player, playerCount) - laneY) < Math.abs(catapultY(best, playerCount) - laneY)) best = player;
  }
  return best;
}
