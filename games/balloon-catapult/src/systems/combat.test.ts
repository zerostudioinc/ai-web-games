/**
 * Tests for the combat maths: flight time, balloon path, splash radius and which catapult a bomb hits.
 */
import { describe, expect, it } from 'vitest';
import { balloonPosition, flightTimeMs, indicesInRadius, targetPlayerForLane } from './combat';

// Flight time grows with distance but stays within the min and max limits.
describe('flightTimeMs', () => {
  it('scales with distance and clamps to the limits', () => {
    expect(flightTimeMs(450, 900, 300, 900)).toBe(500); // 450 px at 900 px/s takes 0.5 s
    expect(flightTimeMs(10, 900, 300, 900)).toBe(300); // too quick, raised to the minimum
    expect(flightTimeMs(5000, 900, 300, 900)).toBe(900); // too slow, cut to the maximum
  });
});

// The balloon follows a straight line plus an upward arc that is zero at both ends.
describe('balloonPosition', () => {
  const start = { x: 0, y: 100 }; // launch point
  const target = { x: 400, y: 100 }; // landing point, level with the launch

  it('starts at the launch point and lands on the target', () => {
    expect(balloonPosition(start, target, 0, 120)).toEqual({ x: 0, y: 100 });
    const landing = balloonPosition(start, target, 1, 120);
    expect(landing.x).toBeCloseTo(400);
    expect(landing.y).toBeCloseTo(100);
  });

  it('arcs upward mid-flight', () => {
    const mid = balloonPosition(start, target, 0.5, 120);
    expect(mid.x).toBeCloseTo(200); // halfway along the line
    expect(mid.y).toBeCloseTo(-20); // 100 - 120: the arc is at its full height halfway through
  });

  it('clamps t outside 0..1', () => {
    expect(balloonPosition(start, target, 5, 120).x).toBeCloseTo(400);
  });
});

// Splash hit detection treats the radius as inclusive.
describe('indicesInRadius', () => {
  it('returns only points inside the radius, edge included', () => {
    // Distances from the origin: 0, 80 (exactly on the edge), 81 (just outside) and about 424 (far away).
    const points = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 81, y: 0 }, { x: 300, y: 300 }];
    expect(indicesInRadius(points, { x: 0, y: 0 }, 80)).toEqual([0, 1]);
  });
});

// A landing bomb damages the nearest standing catapult.
describe('targetPlayerForLane', () => {
  /**
   * The lane numbers on the field for a player count (3 lanes for 1 or 3 players, 4 for 2 or 4).
   *
   * @param count - Number of players.
   * @returns Every 0-based lane index on that field.
   */
  const lanes = (count: number) => (count === 1 || count === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
  /**
   * An "everyone is alive" flag list.
   *
   * @param count - Number of players.
   * @returns `count` flags, all true.
   */
  const allAlive = (count: number) => Array<boolean>(count).fill(true);

  it('sends every lane to the lone catapult', () => {
    expect(lanes(1).map((lane) => targetPlayerForLane(lane, 1, allAlive(1)))).toEqual([0, 0, 0]);
  });

  it('hits the closest catapult', () => {
    expect(lanes(2).map((lane) => targetPlayerForLane(lane, 2, allAlive(2)))).toEqual([0, 0, 1, 1]);
    expect(lanes(3).map((lane) => targetPlayerForLane(lane, 3, allAlive(3)))).toEqual([0, 1, 2]);
    expect(lanes(4).map((lane) => targetPlayerForLane(lane, 4, allAlive(4)))).toEqual([0, 1, 2, 3]);
  });

  it('sends every bomb to the last survivor', () => {
    expect(lanes(4).map((lane) => targetPlayerForLane(lane, 4, [false, false, true, false]))).toEqual([2, 2, 2, 2]);
    expect(lanes(2).map((lane) => targetPlayerForLane(lane, 2, [true, false]))).toEqual([0, 0, 0, 0]);
  });

  it('skips wrecked catapults and breaks ties towards the upper one', () => {
    expect(targetPlayerForLane(1, 3, [false, false, true])).toBe(2);
    // Players 0 and 2 are both one lane away from lane 1, so the upper one (0) wins the tie.
    expect(targetPlayerForLane(1, 3, [true, false, true])).toBe(0);
  });

  it('hits nobody when every catapult is wrecked', () => {
    expect(targetPlayerForLane(1, 3, [false, false, false])).toBeNull();
  });
});
