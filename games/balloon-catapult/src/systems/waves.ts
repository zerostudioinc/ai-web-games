/**
 * Wave progression: bombs per wave, spawn pacing, and the state machine that takes a game from the
 * first intermission through every wave to victory.
 */

/** Number of waves a player must survive to win. */
export const TOTAL_WAVES = 5;
/** Pause before each wave starts (including wave 1), in ms. */
export const INTERMISSION_MS = 2500;

/**
 * Number of bombs in a wave.
 *
 * @param wave - 1-based wave number.
 * @returns Bomb count: 20 in wave 1, plus 5 for each later wave.
 */
export const bombsInWave = (wave: number): number => 20 + 5 * (wave - 1);

/**
 * Delay between bomb spawns in a wave; later waves spawn faster.
 *
 * @param wave - 1-based wave number.
 * @returns Spawn interval in ms.
 */
export const spawnIntervalMs = (wave: number): number => 1400 - 100 * (wave - 1);

/** Where a game is in a wave's life cycle. */
export type WavePhase = 'intermission' | 'spawning' | 'clearing' | 'victory';

/** What happened during one `WaveDirector.update` call. */
export interface DirectorUpdate {
  spawnLanes: number[]; // lane of every bomb that should spawn now
  waveStarted: number | null; // number of the wave that just began, if any
  waveCleared: number | null; // number of the wave that was just cleared, if any
}

/** Pure wave state machine: the scene feeds it time and the live bomb count. */
export class WaveDirector {
  wave = 0; // current 1-based wave number; 0 before the first wave starts
  phase: WavePhase = 'intermission'; // current stage of the wave life cycle
  private timerMs = INTERMISSION_MS; // countdown to the next phase change or bomb spawn
  private remaining = 0; // bombs of the current wave that have not spawned yet

  /**
   * Creates a director waiting in the first intermission.
   *
   * @param lanes - Lane indices bombs may spawn in (decided by the difficulty).
   * @param rng - Random source returning [0, 1); injectable so tests can be deterministic.
   */
  constructor(
    private readonly lanes: readonly number[],
    private readonly rng: () => number = Math.random,
  ) {}

  /**
   * Bombs of the current wave not yet destroyed; in an intermission, the next wave's total.
   *
   * @param aliveBombs - Number of bombs currently on the field.
   * @returns How many bombs the player still has to deal with.
   */
  bombsRemaining(aliveBombs: number): number {
    if (this.phase === 'intermission') return bombsInWave(this.wave + 1);
    return this.remaining + aliveBombs;
  }

  /**
   * Advances the state machine by one frame.
   *
   * @param deltaMs - Time since the previous update, in ms.
   * @param aliveBombs - Number of bombs currently on the field (used to detect a cleared wave).
   * @returns The bombs to spawn and any wave start or clear that happened this frame.
   */
  update(deltaMs: number, aliveBombs: number): DirectorUpdate {
    const result: DirectorUpdate = { spawnLanes: [], waveStarted: null, waveCleared: null };

    switch (this.phase) {
      case 'intermission':
        // Count down; at zero the next wave begins and spawning starts immediately.
        this.timerMs -= deltaMs;
        if (this.timerMs <= 0) {
          this.wave += 1;
          this.remaining = bombsInWave(this.wave);
          this.timerMs = 0;
          this.phase = 'spawning';
          result.waveStarted = this.wave;
        }
        break;

      case 'spawning':
        // A long frame can owe several bombs, so spawn in a loop and carry the leftover time forward.
        this.timerMs -= deltaMs;
        while (this.timerMs <= 0 && this.remaining > 0) {
          result.spawnLanes.push(this.lanes[Math.floor(this.rng() * this.lanes.length)]);
          this.remaining -= 1;
          this.timerMs += spawnIntervalMs(this.wave);
        }
        // Clearing is checked on the next update so the bombs spawned now are counted.
        if (this.remaining === 0) this.phase = 'clearing';
        break;

      case 'clearing':
        // The wave is cleared once no bomb is left; the last wave ends the game instead of starting a break.
        if (aliveBombs === 0) {
          result.waveCleared = this.wave;
          if (this.wave >= TOTAL_WAVES) {
            this.phase = 'victory';
          } else {
            this.phase = 'intermission';
            this.timerMs = INTERMISSION_MS;
          }
        }
        break;

      case 'victory':
        // Terminal state: nothing more happens.
        break;
    }

    return result;
  }
}
