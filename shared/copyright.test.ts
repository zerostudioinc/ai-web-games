/**
 * Tests for the copyright notice: the copyright sign, the year and the holder's name.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyrightLabel } from './copyright';

// The notice reads "© <year> Zero Studio Inc", and the year follows the clock unless one is given.
describe('copyrightLabel', () => {
  afterEach(() => {
    vi.useRealTimers(); // undo the fake clock a test may have set
  });

  it('shows the year it is given', () => {
    expect(copyrightLabel(2026)).toBe('© 2026 Zero Studio Inc');
  });

  it('defaults to the current year, so it changes with the calendar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2031, 5, 15)); // 15 June 2031, local time
    expect(copyrightLabel()).toBe('© 2031 Zero Studio Inc');

    vi.setSystemTime(new Date(2032, 0, 1)); // the first day of the next year
    expect(copyrightLabel()).toBe('© 2032 Zero Studio Inc');
  });
});
