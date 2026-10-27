import { describe, expect, it } from 'vitest';
import { FIRE_BUTTON_COUNT, anyNewPress, fireButtonStates } from './padFire';

const pressedAt = (...indices: number[]) => Array.from({ length: 17 }, (_, i) => ({ pressed: indices.includes(i) }));

describe('fireButtonStates', () => {
  it('reports only the fire buttons', () => {
    const states = fireButtonStates(pressedAt(0, 7, 9, 12, 14, 16));
    expect(states).toHaveLength(FIRE_BUTTON_COUNT);
    expect(states.filter(Boolean)).toHaveLength(2);
    expect(states[0]).toBe(true);
    expect(states[7]).toBe(true);
  });

  it('treats missing buttons as released', () => {
    expect(fireButtonStates([])).toEqual(Array(FIRE_BUTTON_COUNT).fill(false));
  });
});

describe('anyNewPress', () => {
  const none = Array<boolean>(FIRE_BUTTON_COUNT).fill(false);

  it('detects a press while a direction is held', () => {
    // The held direction is not a fire button, so it never appears in the snapshots.
    expect(anyNewPress(fireButtonStates(pressedAt(14)), fireButtonStates(pressedAt(14, 0)))).toBe(true);
  });

  it('detects a second button pressed while another fire button is already held', () => {
    expect(anyNewPress(fireButtonStates(pressedAt(0)), fireButtonStates(pressedAt(0, 2)))).toBe(true);
  });

  it('ignores buttons that stay held or are released', () => {
    expect(anyNewPress(fireButtonStates(pressedAt(0)), fireButtonStates(pressedAt(0)))).toBe(false);
    expect(anyNewPress(fireButtonStates(pressedAt(0)), none)).toBe(false);
  });
});
