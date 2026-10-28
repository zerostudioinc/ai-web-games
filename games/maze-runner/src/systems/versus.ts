/**
 * Rules of the two-player versus mode: when a level ends, and who wins a match. Also covers a solo run, which is a match of one.
 */

/** Where a player stands in the level being played. */
export type PlayerStatus = 'racing' | 'escaped' | 'eliminated';

/** How a two-player match ended: who won (null for a draw) and why. */
export interface MatchResult {
  winner: number | null; // 0-based winner, or null for a draw
  reason: 'eliminated' | 'completed'; // a player ran out of lives, or both cleared every level and the scores decided it
}

/**
 * What the level should do next:
 * - `racing`: carry on;
 * - `cleared`: everyone still in the game has escaped, so the level is won;
 * - `over`: the match has ended; `winner` is the 0-based player who won, or null when nobody did.
 */
export type LevelEnd = { kind: 'racing' } | { kind: 'cleared' } | { kind: 'over'; winner: number | null };

/**
 * Decides whether the level goes on, is cleared, or ends the match.
 * A player who has run out of lives is out. When only one of several players is left, that player wins at once, even if
 * they have not escaped yet. A lone player who runs out of lives, or two who do so together, leave no winner.
 *
 * @param statuses - Each player's status, in player order.
 * @returns The outcome for the level.
 */
export function decideLevelEnd(statuses: readonly PlayerStatus[]): LevelEnd {
  // Indices of the players who still have lives.
  const standing = statuses.flatMap((status, index) => (status === 'eliminated' ? [] : [index]));
  if (standing.length === 0) return { kind: 'over', winner: null };
  if (standing.length === 1 && statuses.length > 1) return { kind: 'over', winner: standing[0] };
  // Everyone left has escaped: the level is won.
  if (standing.every((index) => statuses[index] === 'escaped')) return { kind: 'cleared' };
  return { kind: 'racing' };
}

/**
 * The winner of a match in which every player cleared every level: whoever scored most.
 *
 * @param totals - Each player's final score, in player order.
 * @returns The 0-based winner, or null when the best score is shared (a draw).
 */
export function matchWinner(totals: readonly number[]): number | null {
  const best = Math.max(...totals);
  // Indices of the players who reached the best score.
  const leaders = totals.flatMap((total, index) => (total === best ? [index] : []));
  return leaders.length === 1 ? leaders[0] : null;
}
