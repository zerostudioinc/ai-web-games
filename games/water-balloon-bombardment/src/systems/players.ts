// Keyboard/mouse/touch always drives player 1. Controllers fill players 2..N in
// connection order, and an extra controller (one per player) goes to player 1.
export function padIndexForPlayer(player: number, playerCount: number): number {
  if (playerCount <= 1) return 0;
  return player === 0 ? playerCount - 1 : player - 1;
}

export function playerForPadIndex(pad: number, playerCount: number): number | null {
  if (playerCount <= 1) return pad === 0 ? 0 : null;
  if (pad < playerCount - 1) return pad + 1;
  return pad === playerCount - 1 ? 0 : null;
}
