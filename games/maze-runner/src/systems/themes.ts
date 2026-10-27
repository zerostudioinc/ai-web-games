/**
 * Visual themes. Each level picks one at random; the palette drives how the maze walls and floor are drawn.
 */
import { pick, type Random } from './rng';

/** The four looks a level can have. */
export type ThemeId = 'grassland' | 'desert' | 'dungeon' | 'spaceship';

/** Every theme; `pickTheme` chooses from this pool. */
export const THEME_IDS: readonly ThemeId[] = ['grassland', 'desert', 'dungeon', 'spaceship'];

/** How the wall surface is decorated when the maze is baked: leafy hedge, sandstone blocks, stone bricks or steel panels. */
export type WallStyle = 'hedge' | 'sandstone' | 'brick' | 'panel';

/** Colours and wall look of one theme; every colour is 0xRRGGBB. */
export interface ThemePalette {
  label: string; // display name, shown in the level intro banner
  wallStyle: WallStyle; // how the walls are decorated
  wall: number; // main colour of the wall body
  wallLight: number; // highlights on the walls (lit edge, leaf and grit sparkles)
  wallShadow: number; // dark details on the walls (block joints, brick lines, grit)
  /** Tint laid over the background inside the maze so the corridors read clearly. */
  floor: number;
  floorAlpha: number; // opacity of the floor tint, 0 (clear) to 1 (solid)
  /** Colour of the exit portal and other highlights. */
  accent: number;
}

/** The palette of every theme. */
export const THEMES: Record<ThemeId, ThemePalette> = {
  // Green hedges over a sandy floor, with a yellow portal.
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
  // Orange sandstone on pale sand, with a cyan portal.
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
  // Grey stone bricks over a near-black floor, with a green portal.
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
  // Blue-grey steel panels over a dark navy floor, with a cyan neon portal.
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

/**
 * Random theme that differs from the previous level's, so consecutive levels never look alike.
 *
 * @param random - Random source returning [0, 1).
 * @param previous - Theme of the level just finished, which is excluded; omit it for the first level.
 * @returns A theme other than `previous`.
 */
export function pickTheme(random: Random, previous?: ThemeId): ThemeId {
  return pick(random, THEME_IDS.filter((id) => id !== previous));
}
