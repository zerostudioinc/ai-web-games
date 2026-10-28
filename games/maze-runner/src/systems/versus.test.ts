/**
 * Tests for the versus rules: when a level ends, who wins when someone runs out of lives, and who wins on score.
 */
import { describe, expect, it } from 'vitest';
import { decideLevelEnd, matchWinner } from './versus';

// A level carries on while anyone is racing, is cleared when everyone still in the game has escaped, and ends the match
// as soon as a player runs out of lives: the other player then wins, even before they have escaped.
describe('decideLevelEnd', () => {
  it('carries on while a player is still racing', () => {
    expect(decideLevelEnd(['racing'])).toEqual({ kind: 'racing' });
    expect(decideLevelEnd(['racing', 'racing'])).toEqual({ kind: 'racing' });
    expect(decideLevelEnd(['escaped', 'racing'])).toEqual({ kind: 'racing' }); // the first to escape waits for the other
    expect(decideLevelEnd(['racing', 'escaped'])).toEqual({ kind: 'racing' });
  });

  it('clears the level once everyone has escaped', () => {
    expect(decideLevelEnd(['escaped'])).toEqual({ kind: 'cleared' });
    expect(decideLevelEnd(['escaped', 'escaped'])).toEqual({ kind: 'cleared' });
  });

  it('gives the match to the other player when one runs out of lives', () => {
    expect(decideLevelEnd(['eliminated', 'racing'])).toEqual({ kind: 'over', winner: 1 });
    expect(decideLevelEnd(['racing', 'eliminated'])).toEqual({ kind: 'over', winner: 0 });
  });

  it('gives the match to a player who has already escaped when the other runs out of lives', () => {
    expect(decideLevelEnd(['escaped', 'eliminated'])).toEqual({ kind: 'over', winner: 0 });
    expect(decideLevelEnd(['eliminated', 'escaped'])).toEqual({ kind: 'over', winner: 1 });
  });

  it('has no winner when everyone runs out of lives', () => {
    expect(decideLevelEnd(['eliminated'])).toEqual({ kind: 'over', winner: null }); // a lone player who loses
    expect(decideLevelEnd(['eliminated', 'eliminated'])).toEqual({ kind: 'over', winner: null }); // both at once
  });
});

// If both players clear every level, the higher total wins and an equal total is a draw.
describe('matchWinner', () => {
  it('picks the player with the higher total', () => {
    expect(matchWinner([5200, 4800])).toBe(0);
    expect(matchWinner([4800, 5200])).toBe(1);
  });

  it('calls equal totals a draw', () => {
    expect(matchWinner([3000, 3000])).toBeNull();
    expect(matchWinner([0, 0])).toBeNull();
  });
});
