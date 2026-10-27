import { describe, expect, it } from 'vitest';
import {
  INTERMISSION_MS,
  TOTAL_WAVES,
  WaveDirector,
  bombsInWave,
  spawnIntervalMs,
} from './waves';

describe('wave tables', () => {
  it('has 5 waves', () => {
    expect(TOTAL_WAVES).toBe(5);
  });

  it('starts at 20 bombs and grows by 5 per wave', () => {
    expect(bombsInWave(1)).toBe(20);
    expect(bombsInWave(2)).toBe(25);
    expect(bombsInWave(3)).toBe(30);
    expect(bombsInWave(TOTAL_WAVES)).toBe(40);
  });

  it('never spawns with a zero or negative interval', () => {
    expect(spawnIntervalMs(TOTAL_WAVES)).toBeGreaterThan(0);
  });
});

describe('WaveDirector', () => {
  it('starts wave 1 after the intermission', () => {
    const director = new WaveDirector(4, () => 0);
    expect(director.update(INTERMISSION_MS - 1, 0).waveStarted).toBeNull();
    expect(director.update(1, 0).waveStarted).toBe(1);
    expect(director.phase).toBe('spawning');
  });

  it('spawns every bomb of the wave in valid lanes', () => {
    const director = new WaveDirector(4, () => 0.99);
    director.update(INTERMISSION_MS, 0);

    const lanes: number[] = [];
    for (let i = 0; i < 1000 && director.phase === 'spawning'; i++) {
      lanes.push(...director.update(spawnIntervalMs(1), 0).spawnLanes);
    }

    expect(lanes).toHaveLength(bombsInWave(1));
    expect(lanes.every((lane) => lane === 3)).toBe(true);
  });

  it('waits for live bombs before clearing, and not in the update that finishes spawning', () => {
    const director = new WaveDirector(4, () => 0);
    director.update(INTERMISSION_MS, 0);
    while (director.phase === 'spawning') {
      expect(director.update(spawnIntervalMs(1), 0).waveCleared).toBeNull();
    }

    expect(director.update(16, 3).waveCleared).toBeNull();
    expect(director.update(16, 0).waveCleared).toBe(1);
    expect(director.phase).toBe('intermission');
  });

  it('counts bombs remaining in the wave down to 0', () => {
    const director = new WaveDirector(4, () => 0);
    expect(director.bombsRemaining(0)).toBe(20); // next wave, during the intermission

    director.update(INTERMISSION_MS, 0);
    director.update(1, 0); // spawns the first bomb(s)
    const spawnedSoFar = 20 - director.bombsRemaining(0);
    expect(spawnedSoFar).toBeGreaterThan(0);
    expect(director.bombsRemaining(spawnedSoFar)).toBe(20); // alive bombs still count

    while (director.phase === 'spawning') director.update(spawnIntervalMs(1), 0);
    expect(director.bombsRemaining(7)).toBe(7);
    expect(director.bombsRemaining(0)).toBe(0);
  });

  it('plays all waves and ends in victory with 150 bombs', () => {
    const director = new WaveDirector(4, () => 0.5);
    let spawned = 0;
    const cleared: number[] = [];

    for (let i = 0; i < 100_000 && director.phase !== 'victory'; i++) {
      const update = director.update(1000, 0);
      spawned += update.spawnLanes.length;
      if (update.waveCleared !== null) cleared.push(update.waveCleared);
    }

    expect(director.phase).toBe('victory');
    expect(spawned).toBe(150);
    expect(cleared).toEqual([1, 2, 3, 4, 5]);
  });
});
