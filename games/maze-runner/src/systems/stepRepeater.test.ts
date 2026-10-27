import { describe, expect, it } from 'vitest';
import type { Direction } from './maze';
import { StepRepeater, noDirections, type DirectionFlags } from './stepRepeater';

/** Flags with only the given directions held. */
function held(...directions: Direction[]): DirectionFlags {
  const flags = noDirections();
  for (const direction of directions) flags[direction] = true;
  return flags;
}

describe('StepRepeater', () => {
  it('steps straight away on a press, once', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    expect(repeater.take()).toBe('right');
    expect(repeater.take()).toBeNull();
  });

  it('repeats after the hold delay and then at the interval', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    repeater.take();

    repeater.update(100, held('right'));
    repeater.update(100, held('right'));
    expect(repeater.take()).toBeNull(); // still inside the 250ms delay
    repeater.update(100, held('right'));
    expect(repeater.take()).toBe('right');
    repeater.update(50, held('right'));
    expect(repeater.take()).toBeNull();
    repeater.update(50, held('right'));
    expect(repeater.take()).toBe('right');
  });

  it('stops repeating when the key is released', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.take();
    repeater.update(500, held());
    expect(repeater.take()).toBeNull();
  });

  it('follows the most recent press and falls back to a key still held', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.take();

    repeater.update(16, held('left', 'right'));
    expect(repeater.take()).toBe('right');

    // Right comes up while left is still down: left resumes, after the delay rather than at once.
    repeater.update(16, held('left'));
    expect(repeater.take()).toBeNull();
    repeater.update(300, held('left'));
    expect(repeater.take()).toBe('left');
  });

  it('picks the later direction when two arrive in the same frame', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('up', 'left'));
    expect(repeater.take()).toBe('left');
  });

  it('drops waiting steps on discard and needs a fresh press afterwards', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    repeater.discard();
    expect(repeater.take()).toBeNull();

    repeater.update(1000, held('right')); // still held, but no longer counts as a press
    expect(repeater.take()).toBeNull();

    repeater.update(16, held());
    repeater.update(16, held('right'));
    expect(repeater.take()).toBe('right');
  });

  it('does not bring a discarded key back when another key is tapped', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('right'));
    repeater.take();
    repeater.discard(); // right is still down

    repeater.update(16, held('right', 'up'));
    expect(repeater.take()).toBe('up');

    repeater.update(16, held('right')); // up is released, right is still down
    repeater.update(1000, held('right'));
    expect(repeater.take()).toBeNull();
  });

  it('keeps ignoring a discarded key when discard is called every frame', () => {
    const repeater = new StepRepeater(250, 100);
    repeater.update(16, held('left'));
    repeater.discard();
    for (let frame = 0; frame < 5; frame++) {
      repeater.update(16, held('left'));
      repeater.discard();
    }
    repeater.update(16, held('left'));
    expect(repeater.take()).toBeNull();
  });
});
