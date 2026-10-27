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

// With fewer than 4 players the unguarded lanes fall to the nearest catapult.
export const targetPlayerForLane = (lane: number, playerCount: number): number =>
  playerCount === 1 ? 0 : Math.min(lane, playerCount - 1);
