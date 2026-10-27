export const TOTAL_WAVES = 10;
export const INTERMISSION_MS = 2500;

export const bombsInWave = (wave: number): number => 20 + 5 * (wave - 1);
export const bombSpeed = (wave: number): number => 40 + 12 * (wave - 1); // px per second
export const spawnIntervalMs = (wave: number): number => 1400 - 100 * (wave - 1);

export type WavePhase = 'intermission' | 'spawning' | 'clearing' | 'victory';

export interface DirectorUpdate {
  spawnLanes: number[];
  waveStarted: number | null;
  waveCleared: number | null;
}

/** Pure wave state machine: the scene feeds it time and the live bomb count. */
export class WaveDirector {
  wave = 0;
  phase: WavePhase = 'intermission';
  private timerMs = INTERMISSION_MS;
  private remaining = 0;

  constructor(
    private readonly laneCount: number,
    private readonly rng: () => number = Math.random,
  ) {}

  update(deltaMs: number, aliveBombs: number): DirectorUpdate {
    const result: DirectorUpdate = { spawnLanes: [], waveStarted: null, waveCleared: null };

    switch (this.phase) {
      case 'intermission':
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
        this.timerMs -= deltaMs;
        while (this.timerMs <= 0 && this.remaining > 0) {
          result.spawnLanes.push(Math.floor(this.rng() * this.laneCount));
          this.remaining -= 1;
          this.timerMs += spawnIntervalMs(this.wave);
        }
        // Clearing is checked on the next update so the bombs spawned now are counted.
        if (this.remaining === 0) this.phase = 'clearing';
        break;

      case 'clearing':
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
        break;
    }

    return result;
  }
}
