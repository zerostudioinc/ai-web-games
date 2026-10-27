/**
 * Tests for which gamepad buttons count as fire buttons and for fresh-press detection.
 */
import { describe, expect, it } from 'vitest';
import { FIRE_BUTTON_COUNT, anyNewPress, fireButtonStates } from './padFire';

/**
 * Builds a fake standard-mapping gamepad button list (17 buttons) with the given buttons pressed.
 *
 * @param indices - Button indices to mark as pressed.
 * @returns 17 `{ pressed }` entries.
 */
const pressedAt = (...indices: number[]) => Array.from({ length: 17 }, (_, i) => ({ pressed: indices.includes(i) }));

// Only the first eight buttons are fire buttons; Start, the D-pad and Home must be ignored.
describe('fireButtonStates', () => {
  it('reports only the fire buttons', () => {
    // Buttons 0 and 7 are fire buttons; 9 (Start), 12 and 14 (D-pad) and 16 (Home) are not.
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

// A shot is triggered by a button going down, whatever else is already held.
describe('anyNewPress', () => {
  const none = Array<boolean>(FIRE_BUTTON_COUNT).fill(false); // snapshot with nothing pressed

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
