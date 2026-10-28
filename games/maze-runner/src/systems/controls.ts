/**
 * Which keys and controllers steer which player. A solo player may use anything; in versus each player has their own.
 */
import type { PlayerCount } from './run';

/** A set of keys that steer a runner. */
export type KeyScheme = 'wasd' | 'arrows';

/** How many controller slots are checked. */
export const PAD_SLOTS = 4;

/**
 * The key sets that steer a player: both of them in a one-player game, otherwise WASD for player one and the arrow keys for player two.
 *
 * @param player - 0-based player number.
 * @param playerCount - Players in the game, 1 or 2.
 * @returns The key sets that player may use.
 */
export function keySchemesFor(player: number, playerCount: PlayerCount): KeyScheme[] {
  if (playerCount === 1) return ['wasd', 'arrows'];
  return player === 0 ? ['wasd'] : ['arrows'];
}

/**
 * The controller slots that steer a player: every slot in a one-player game, otherwise the player's own slot
 * (player one the first controller, player two the second).
 *
 * @param player - 0-based player number.
 * @param playerCount - Players in the game, 1 or 2.
 * @returns The 0-based controller slots that player may use.
 */
export function padSlotsFor(player: number, playerCount: PlayerCount): number[] {
  if (playerCount === 1) return Array.from({ length: PAD_SLOTS }, (_, slot) => slot);
  return [player];
}
