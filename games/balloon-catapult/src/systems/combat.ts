/**
 * Pure combat maths: balloon flight time and path, splash hit detection, and which catapult a landing bomb damages.
 */
import { playerLane } from '../config';
import { clamp, type Vec2 } from './movement';

/**
 * How long a balloon stays in the air; farther targets take longer, within limits.
 *
 * @param distance - Straight-line distance from the catapult to the target, in px.
 * @param speed - Balloon travel speed, in px per second.
 * @param minMs - Shortest allowed flight time, in ms (stops close shots looking instant).
 * @param maxMs - Longest allowed flight time, in ms (stops far shots feeling sluggish).
 * @returns The flight time in ms, clamped to [minMs, maxMs].
 */
export const flightTimeMs = (distance: number, speed: number, minMs: number, maxMs: number): number =>
  // distance / speed is in seconds, so scale by 1000 to get ms.
  clamp((distance / speed) * 1000, minMs, maxMs);

/**
 * Position of a balloon mid-flight: a straight line from start to target plus a visual arc.
 * The arc is zero at both ends, so the balloon lands exactly on `target` at t = 1.
 *
 * @param start - Where the balloon was launched from.
 * @param target - Where the balloon will land.
 * @param t - Flight progress, 0 (launch) to 1 (landing); values outside are clamped.
 * @param arcHeight - Peak height of the arc above the straight line, in px (reached halfway).
 * @returns The balloon's position at progress `t`.
 */
export function balloonPosition(start: Vec2, target: Vec2, t: number, arcHeight: number): Vec2 {
  const progress = clamp(t, 0, 1);
  return {
    x: start.x + (target.x - start.x) * progress,
    // Screen y grows downward, so subtracting the sine term lifts the balloon.
    y: start.y + (target.y - start.y) * progress - Math.sin(Math.PI * progress) * arcHeight,
  };
}

/**
 * Finds which points fall inside a circular splash.
 *
 * @param points - Candidate positions (e.g. every live bomb).
 * @param center - Centre of the splash.
 * @param radius - Splash radius in px; a point exactly on the edge counts as a hit.
 * @returns Indices into `points` of every point inside the splash, in ascending order.
 */
export function indicesInRadius(points: Vec2[], center: Vec2, radius: number): number[] {
  const hits: number[] = [];
  points.forEach((point, index) => {
    if (Math.hypot(point.x - center.x, point.y - center.y) <= radius) hits.push(index);
  });
  return hits;
}

/**
 * Picks the catapult a landing bomb hits: the nearest one still standing
 * (the upper one on a tie), or none if every catapult is wrecked.
 *
 * @param lane - 0-based lane the bomb walked down.
 * @param playerCount - Number of players (and catapults) in the game, 1 to 4.
 * @param alive - Per-player flag, true while that player's catapult is still standing.
 * @returns The index of the targeted player, or null when no catapult is left.
 */
export function targetPlayerForLane(lane: number, playerCount: number, alive: readonly boolean[]): number | null {
  let best: number | null = null;
  for (let player = 0; player < playerCount; player++) {
    if (!alive[player]) continue;
    // Strict `<` keeps the earlier (upper) player when two lanes are equally close.
    if (best === null || Math.abs(playerLane(player, playerCount) - lane) < Math.abs(playerLane(best, playerCount) - lane)) best = player;
  }
  return best;
}
