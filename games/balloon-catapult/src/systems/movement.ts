export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const clampToBounds = (pos: Vec2, bounds: Bounds): Vec2 => ({
  x: clamp(pos.x, bounds.left, bounds.right),
  y: clamp(pos.y, bounds.top, bounds.bottom),
});

// Diagonal input is normalised so it is not faster than a straight one.
export function stepReticle(pos: Vec2, dir: Vec2, speed: number, deltaMs: number, bounds: Bounds): Vec2 {
  const length = Math.hypot(dir.x, dir.y);
  const scale = length > 1 ? 1 / length : 1;
  const distance = speed * (deltaMs / 1000);
  return clampToBounds(
    { x: pos.x + dir.x * scale * distance, y: pos.y + dir.y * scale * distance },
    bounds,
  );
}
