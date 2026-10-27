import { describe, expect, it } from 'vitest';
import { balloonPosition, flightTimeMs, indicesInRadius, targetPlayerForLane } from './combat';

describe('flightTimeMs', () => {
  it('scales with distance and clamps to the limits', () => {
    expect(flightTimeMs(450, 900, 300, 900)).toBe(500);
    expect(flightTimeMs(10, 900, 300, 900)).toBe(300);
    expect(flightTimeMs(5000, 900, 300, 900)).toBe(900);
  });
});

describe('balloonPosition', () => {
  const start = { x: 0, y: 100 };
  const target = { x: 400, y: 100 };

  it('starts at the launch point and lands on the target', () => {
    expect(balloonPosition(start, target, 0, 120)).toEqual({ x: 0, y: 100 });
    const landing = balloonPosition(start, target, 1, 120);
    expect(landing.x).toBeCloseTo(400);
    expect(landing.y).toBeCloseTo(100);
  });

  it('arcs upward mid-flight', () => {
    const mid = balloonPosition(start, target, 0.5, 120);
    expect(mid.x).toBeCloseTo(200);
    expect(mid.y).toBeCloseTo(-20);
  });

  it('clamps t outside 0..1', () => {
    expect(balloonPosition(start, target, 5, 120).x).toBeCloseTo(400);
  });
});

describe('indicesInRadius', () => {
  it('returns only points inside the radius, edge included', () => {
    const points = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 81, y: 0 }, { x: 300, y: 300 }];
    expect(indicesInRadius(points, { x: 0, y: 0 }, 80)).toEqual([0, 1]);
  });
});

describe('targetPlayerForLane', () => {
  it('sends every lane to the lone catapult', () => {
    expect([0, 1, 2, 3].map((lane) => targetPlayerForLane(lane, 1))).toEqual([0, 0, 0, 0]);
  });

  it('maps lanes to the nearest catapult with fewer than 4 players', () => {
    expect([0, 1, 2, 3].map((lane) => targetPlayerForLane(lane, 2))).toEqual([0, 1, 1, 1]);
    expect([0, 1, 2, 3].map((lane) => targetPlayerForLane(lane, 4))).toEqual([0, 1, 2, 3]);
  });
});
