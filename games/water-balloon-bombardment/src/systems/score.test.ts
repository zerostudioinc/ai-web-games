import { describe, expect, it } from 'vitest';
import { HIGH_SCORE_KEY, POINTS_PER_BOMB, loadHighScore, recordScore, type ScoreStorage } from './score';

const memoryStorage = (initial: Record<string, string> = {}): ScoreStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

describe('high score', () => {
  it('defaults to 0 when nothing is stored or the value is junk', () => {
    expect(loadHighScore(memoryStorage())).toBe(0);
    expect(loadHighScore(memoryStorage({ [HIGH_SCORE_KEY]: 'abc' }))).toBe(0);
    expect(loadHighScore(memoryStorage({ [HIGH_SCORE_KEY]: '-5' }))).toBe(0);
  });

  it('saves only scores that beat the stored best', () => {
    const storage = memoryStorage({ [HIGH_SCORE_KEY]: '300' });
    expect(recordScore(200, storage)).toBe(300);
    expect(storage.data[HIGH_SCORE_KEY]).toBe('300');
    expect(recordScore(450, storage)).toBe(450);
    expect(storage.data[HIGH_SCORE_KEY]).toBe('450');
  });

  it('survives storage that throws', () => {
    const broken: ScoreStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadHighScore(broken)).toBe(0);
    expect(recordScore(120, broken)).toBe(120);
  });
});

describe('scoring', () => {
  it('awards 1 point per bomb', () => {
    expect(POINTS_PER_BOMB).toBe(1);
  });
});
