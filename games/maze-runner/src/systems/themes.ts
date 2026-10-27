// Visual themes. Each level picks one at random; the palette drives how the maze walls and floor are drawn.
import { pick, type Random } from './rng';

export type ThemeId = 'grassland' | 'desert' | 'dungeon' | 'spaceship';

export const THEME_IDS: readonly ThemeId[] = ['grassland', 'desert', 'dungeon', 'spaceship'];

/** How the wall surface is decorated when the maze is baked. */
export type WallStyle = 'hedge' | 'sandstone' | 'brick' | 'panel';

export interface ThemePalette {
  label: string;
  wallStyle: WallStyle;
  wall: number;
  wallLight: number;
  wallShadow: number;
  /** Tint laid over the background inside the maze so the corridors read clearly. */
  floor: number;
  floorAlpha: number;
  /** Colour of the exit portal and other highlights. */
  accent: number;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  grassland: {
    label: 'Grassland',
    wallStyle: 'hedge',
    wall: 0x2e7d32,
    wallLight: 0x66bb6a,
    wallShadow: 0x143d17,
    floor: 0xe6cc96,
    floorAlpha: 0.92,
    accent: 0xffeb3b,
  },
  desert: {
    label: 'Desert',
    wallStyle: 'sandstone',
    wall: 0xb86a2c,
    wallLight: 0xe3a766,
    wallShadow: 0x5a2f0e,
    floor: 0xf8e6b0,
    floorAlpha: 0.9,
    accent: 0x26c6da,
  },
  dungeon: {
    label: 'Dungeon',
    wallStyle: 'brick',
    wall: 0x6f6f80,
    wallLight: 0xa3a3b5,
    wallShadow: 0x0d0d14,
    floor: 0x1c1c27,
    floorAlpha: 0.9,
    accent: 0x69f0ae,
  },
  spaceship: {
    label: 'Spaceship',
    wallStyle: 'panel',
    wall: 0x5d7a8c,
    wallLight: 0x9fb8c7,
    wallShadow: 0x07121c,
    floor: 0x0d1a28,
    floorAlpha: 0.92,
    accent: 0x00e5ff,
  },
};

/** Random theme that differs from the previous level's, so consecutive levels never look alike. */
export function pickTheme(random: Random, previous?: ThemeId): ThemeId {
  return pick(random, THEME_IDS.filter((id) => id !== previous));
}
