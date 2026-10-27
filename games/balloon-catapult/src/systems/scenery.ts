import type { Bounds, Vec2 } from './movement';

// Small seedable PRNG so baked scenery looks the same on every load.
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scatterPoints(seed: number, count: number, area: Bounds): Vec2[] {
  const random = mulberry32(seed);
  const points: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: area.left + random() * (area.right - area.left),
      y: area.top + random() * (area.bottom - area.top),
    });
  }
  return points;
}
