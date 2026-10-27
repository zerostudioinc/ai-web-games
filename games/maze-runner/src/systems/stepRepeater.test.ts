/**
 * Tests for the step repeater: one step per press, auto-repeat after a hold delay, and `discard` ignoring keys that are still held.
 */
import { describe, expect, it } from 'vitest';
import type { Direction } from './maze';
import { StepRepeater, noDirections, type DirectionFlags } from './stepRepeater';

/**
 * Flags with only the given directions held.
 *
 * @param directions - The directions to mark as held; none gives an all-released set.
 * @returns A fresh flag set with each listed direction true and the others false.
 */
function held(...directions: Direction[]): DirectionFlags {
  const flags = noDirections();
  for (const direction of directions) flags[direction] = true;
  return flags;
}

// A press steps at once and a held key repeats after the delay at the interval (250 ms and 100 ms here); discard() ignores held keys.
describe('StepRepeater', () => {
  it('steps straight away on a press, once', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right')); // right goes down in a 16 ms frame, so a step is queued at once
    expect(repeater.take()).toBe('right');
    expect(repeater.take()).toBeNull(); // a queued step is handed out only once
  });

  it('repeats after the hold delay and then at the interval', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    repeater.take(); // consume the step from the initial press; the 250 ms hold delay now counts down

    repeater.update(100, held('right')); // 100 ms after the press
    repeater.update(100, held('right')); // 200 ms
    expect(repeater.take()).toBeNull(); // still inside the 250ms delay
    repeater.update(100, held('right')); // 300 ms: past the delay, so the first repeat fires
    expect(repeater.take()).toBe('right');
    repeater.update(50, held('right')); // 50 ms into the 100 ms repeat interval
    expect(repeater.take()).toBeNull();
    repeater.update(50, held('right')); // 100 ms: the next repeat is due
    expect(repeater.take()).toBe('right');
  });

  it('stops repeating when the key is released', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.take();
    repeater.update(500, held()); // the key is released; 500 ms is far longer than the 250 ms delay, yet nothing may repeat
    expect(repeater.take()).toBeNull();
  });

  it('follows the most recent press and falls back to a key still held', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.take();

    repeater.update(16, held('left', 'right')); // right goes down while left is still held: the newest press takes over
    expect(repeater.take()).toBe('right');

    // Right comes up while left is still down: left resumes, after the delay rather than at once.
    repeater.update(16, held('left'));
    expect(repeater.take()).toBeNull();
    repeater.update(300, held('left')); // 300 ms outlasts the hold delay that is left
    expect(repeater.take()).toBe('left');
  });

  it('picks the later direction when two arrive in the same frame', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('up', 'left')); // up and left go down in the same frame; left wins as it comes later in the up, right, down, left order
    expect(repeater.take()).toBe('left');
  });

  it('drops waiting steps on discard and needs a fresh press afterwards', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right')); // a step is queued but not yet taken
    repeater.discard(); // drops it, and right is ignored while it stays down
    expect(repeater.take()).toBeNull();

    repeater.update(1000, held('right')); // still held, but no longer counts as a press
    expect(repeater.take()).toBeNull();

    repeater.update(16, held()); // right is released...
    repeater.update(16, held('right')); // ...and pressed again, which is a fresh press
    expect(repeater.take()).toBe('right');
  });

  it('does not bring a discarded key back when another key is tapped', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    repeater.take();
    repeater.discard(); // right is still down

    repeater.update(16, held('right', 'up')); // up is a fresh press; right stays ignored
    expect(repeater.take()).toBe('up');

    repeater.update(16, held('right')); // up is released, right is still down
    repeater.update(1000, held('right')); // a long hold of right must not repeat it
    expect(repeater.take()).toBeNull();
  });

  it('keeps ignoring a discarded key when discard is called every frame', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.discard();
    // Five more frames with left still down, discarding on each one (as the play scene does throughout a banner or animation).
    for (let frame = 0; frame < 5; frame++) {
      repeater.update(16, held('left'));
      repeater.discard();
    }
    repeater.update(16, held('left')); // left was never released in between, so it still does not count as a press
    expect(repeater.take()).toBeNull();
  });
});
