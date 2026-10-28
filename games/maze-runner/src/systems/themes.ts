/**
 * Visual themes. A run gives every level one of them; the palette drives how the maze walls and floor are drawn.
 */
import { shuffle, type Random } from './rng';

/** The five looks a level can have. */
export type ThemeId = 'grassland' | 'desert' | 'dungeon' | 'spaceship' | 'mountain';

/** Every theme, in the order the backgrounds are baked. */
export const THEME_IDS: readonly ThemeId[] = ['grassland', 'desert', 'dungeon', 'spaceship', 'mountain'];

/** How the wall surface is decorated when the maze is baked: leafy hedge, sandstone blocks, stone bricks, steel panels or snowy boulders. */
export type WallStyle = 'hedge' | 'sandstone' | 'brick' | 'panel' | 'rock';

/** Colours and wall look of one theme; every colour is 0xRRGGBB. */
export interface ThemePalette {
  label: string; // display name, shown in the level intro banner
  wallStyle: WallStyle; // how the walls are decorated
  wall: number; // main colour of the wall body
  wallLight: number; // highlights on the walls (lit edge, leaf and grit sparkles, rivets, snow on boulders)
  wallShadow: number; // dark details on the walls (block joints, brick lines, grit, boulder outlines)
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
  // Grey boulders dusted with snow over a pale alpine meadow, with an orange portal.
  mountain: {
    label: 'Mountain',
    wallStyle: 'rock',
    wall: 0x7d8a96,
    wallLight: 0xcfd8e0,
    wallShadow: 0x37424d,
    floor: 0xdbe7cf,
    floorAlpha: 0.9,
    accent: 0xff7043,
  },
};

const MAX_SHUFFLES = 200; // how many shuffles `themeSchedule` tries before it accepts a schedule with neighbours that match

/**
 * Whether any two neighbouring entries of a list are equal.
 *
 * @param order - The list to check.
 * @returns True when some entry is followed by an identical one.
 */
const hasNeighbourRepeat = (order: readonly ThemeId[]): boolean => order.some((id, index) => index > 0 && id === order[index - 1]);

/**
 * The look of every level in a run. Each theme comes up equally often (twice in a ten-level run with five themes),
 * in a random order in which no two neighbouring levels look alike.
 *
 * @param random - Random source returning [0, 1).
 * @param levels - Number of levels in the run.
 * @returns One theme per level, level 1 first.
 */
export function themeSchedule(random: Random, levels: number): ThemeId[] {
  // The deck holds every theme the same number of times; when the levels do not divide evenly it is topped up from the start of the list.
  const deck = Array.from({ length: levels }, (_, index) => THEME_IDS[index % THEME_IDS.length]);
  let order = shuffle(random, deck);
  // About a third of the shuffles have no repeat next to each other, so this ends quickly; the cap is only a safety net.
  for (let attempt = 0; attempt < MAX_SHUFFLES && hasNeighbourRepeat(order); attempt++) order = shuffle(random, deck);
  return order;
}
