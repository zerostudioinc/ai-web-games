import { describe, expect, it } from 'vitest';
import { padIndexForPlayer, playerForPadIndex } from './players';

describe('controller assignment', () => {
  it('gives the only controller to player 1 in a 1-player game', () => {
    expect(padIndexForPlayer(0, 1)).toBe(0);
    expect(playerForPadIndex(0, 1)).toBe(0);
    expect(playerForPadIndex(1, 1)).toBeNull();
  });

  it('gives the first controller to player 2 so player 1 stays on keyboard/mouse/touch', () => {
    expect(playerForPadIndex(0, 2)).toBe(1);
    expect(padIndexForPlayer(1, 2)).toBe(0);
  });

  it('gives an extra controller to player 1 once every other player has one', () => {
    expect(playerForPadIndex(1, 2)).toBe(0);
    expect(padIndexForPlayer(0, 2)).toBe(1);
    expect(playerForPadIndex(3, 4)).toBe(0);
    expect(playerForPadIndex(4, 4)).toBeNull();
  });

  it('keeps both directions consistent for every player count', () => {
    for (let count = 1; count <= 4; count++) {
      for (let player = 0; player < count; player++) {
        expect(playerForPadIndex(padIndexForPlayer(player, count), count)).toBe(player);
      }
    }
  });
});
