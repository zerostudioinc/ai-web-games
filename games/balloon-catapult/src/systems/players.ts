/**
 * Maps players to controllers (gamepads) and back.
 * Keyboard/mouse/touch always drives player 1. Controllers fill players 2..N in
 * connection order, and an extra controller (one per player) goes to player 1.
 */

/**
 * Which controller drives a given player.
 *
 * @param player - 0-based player index.
 * @param playerCount - Number of players in the game (1 to 4).
 * @returns The 0-based controller index assigned to that player.
 */
export function padIndexForPlayer(player: number, playerCount: number): number {
  // A solo game uses the first controller.
  if (playerCount <= 1) return 0;
  // Players 2..N take controllers 0..N-2; player 1 gets the spare one after them.
  return player === 0 ? playerCount - 1 : player - 1;
}

/**
 * Inverse of `padIndexForPlayer`: which player a controller drives.
 *
 * @param pad - 0-based controller index, in connection order.
 * @param playerCount - Number of players in the game (1 to 4).
 * @returns The player index, or null when the controller is surplus and unused.
 */
export function playerForPadIndex(pad: number, playerCount: number): number | null {
  if (playerCount <= 1) return pad === 0 ? 0 : null;
  // Controllers 0..N-2 drive players 2..N.
  if (pad < playerCount - 1) return pad + 1;
  // The next controller is player 1's extra one; any beyond that are ignored.
  return pad === playerCount - 1 ? 0 : null;
}
