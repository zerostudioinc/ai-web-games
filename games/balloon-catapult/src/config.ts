/**
 * Balloon Catapult's shared constants (screen size, field layout, tuning, scene and texture keys)
 * and the helpers that lay out lanes and catapults.
 */
import type { Difficulty } from './systems/difficulty';
import type { Bounds } from './systems/movement';

// Logical canvas size in px; Phaser scales it to fit the window.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Most players that can share one game (one catapult each). */
export const MAX_PLAYERS = 4;

// Playing field: the HUD strip sits above FIELD_TOP and the field below it is split into horizontal lanes.
export const FIELD_TOP = 80; // y of the field's top edge, px
export const FIELD_HEIGHT = GAME_HEIGHT - FIELD_TOP; // px
export const LANE_HEIGHT = 160; // px
/** Area reticles may move in: the whole field below the HUD. */
export const FIELD_BOUNDS: Bounds = { left: 0, top: FIELD_TOP, right: GAME_WIDTH, bottom: GAME_HEIGHT };

// Catapults.
export const CATAPULT_X = 110; // x of every catapult, px
export const CATAPULT_MAX_HEALTH = 3; // bomb hits a catapult survives
export const FIRE_COOLDOWN_MS = 700; // reload time after a shot
export const RETICLE_SPEED = 420; // px per second

// Bombs.
export const BOMB_SPAWN_X = GAME_WIDTH + 30; // just off the right edge, px
export const BOMB_STOP_X = CATAPULT_X + 50; // a bomb walking past this x explodes on its catapult, px

// Balloons.
export const SPLASH_RADIUS = 80; // px
export const BALLOON_SPEED = 900; // px per second
export const MIN_FLIGHT_MS = 300; // shortest flight time
export const MAX_FLIGHT_MS = 900; // longest flight time
export const BALLOON_ARC_HEIGHT = 120; // peak of the lob above the straight line, px

export const MAX_FRAME_MS = 100; // clamps long frames (e.g. after a tab switch)

/** Tint of each player's catapult, reticle and balloons, in player order (P1 to P4). */
export const PLAYER_COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xba68c8] as const;

/** Scene keys, so scenes start each other without repeating string literals. */
export const SceneKey = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  Difficulty: 'DifficultyScene',
  HighScores: 'HighScoresScene',
  Play: 'PlayScene',
  Result: 'ResultScene',
} as const;

/** Keys of the textures generated at boot (see assets/generateTextures.ts). */
export const TextureKey = {
  HudBar: 'hud-bar',
  Cloud: 'cloud',
  MenuBackground: 'menu-bg',
  BombBody: 'bomb-body',
  Balloon: 'balloon',
} as const;

// Odd player counts use 3 lanes and even counts use 4, so the catapults are always centred.
/** The lane counts a field can have; one field texture is baked for each. */
export const LANE_COUNTS = [3, 4] as const;

/**
 * Number of lanes used for a player count.
 *
 * @param playerCount - Number of players (1 to 4).
 * @returns 3 for an odd count, 4 for an even count.
 */
export const laneCountFor = (playerCount: number): number => (playerCount % 2 === 1 ? 3 : 4);

/**
 * Texture key of the baked field for a lane count.
 *
 * @param laneCount - Lanes on the field (3 or 4).
 * @returns The texture key.
 */
export const fieldTextureKey = (laneCount: number): string => `grass-field-${laneCount}`;

/**
 * Vertical centre of a lane. Lanes are LANE_HEIGHT tall and centred on the field; spare field above and below is plain grass.
 *
 * @param lane - 0-based lane index, top to bottom.
 * @param laneCount - Total lanes on the field.
 * @returns Y of the lane's centre line, in px.
 */
export const laneCenterY = (lane: number, laneCount: number): number =>
  // Start at the field's centre, then shift by how far this lane is from the middle of the lane block.
  FIELD_TOP + FIELD_HEIGHT / 2 + (lane - (laneCount - 1) / 2) * LANE_HEIGHT;

/**
 * 0-based lane a player's catapult stands in: 1 player -> lane 2, 2 -> lanes 2-3, 3 -> lanes 1-3, 4 -> lanes 1-4
 * (counting lanes from 1 in that description).
 *
 * @param playerIndex - 0-based player index.
 * @param playerCount - Number of players (1 to 4).
 * @returns The 0-based lane index.
 */
export const playerLane = (playerIndex: number, playerCount: number): number =>
  // Spare lanes are split evenly above and below the block of catapults.
  (laneCountFor(playerCount) - playerCount) / 2 + playerIndex;

/**
 * Y of a player's catapult, which stands at the centre of its lane.
 *
 * @param playerIndex - 0-based player index.
 * @param playerCount - Number of players (1 to 4).
 * @returns Y in px.
 */
export const catapultY = (playerIndex: number, playerCount: number): number =>
  laneCenterY(playerLane(playerIndex, playerCount), laneCountFor(playerCount));

// High scores and Home (and Back) share one size and sit in the top corners of menu screens.
/** Size (px) of the corner buttons, their font size, and their distance from the screen edge (`margin`). */
export const CORNER_BUTTON = { width: 150, height: 42, fontSize: 22, margin: 20 } as const;

/** Accent colour of each difficulty's button and high-score panel. */
export const DIFFICULTY_COLORS: Record<Difficulty, number> = { veryEasy: 0x81d4fa, easy: 0x81c784, normal: 0xffd54f, hard: 0xef5350 };
