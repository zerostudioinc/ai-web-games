import type { Difficulty } from './systems/difficulty';
import type { Bounds } from './systems/movement';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const MAX_PLAYERS = 4;

export const FIELD_TOP = 80;
export const FIELD_HEIGHT = GAME_HEIGHT - FIELD_TOP;
export const LANE_HEIGHT = 160;
export const FIELD_BOUNDS: Bounds = { left: 0, top: FIELD_TOP, right: GAME_WIDTH, bottom: GAME_HEIGHT };

export const CATAPULT_X = 110;
export const CATAPULT_MAX_HEALTH = 3;
export const FIRE_COOLDOWN_MS = 700;
export const RETICLE_SPEED = 420; // px per second

export const BOMB_SPAWN_X = GAME_WIDTH + 30;
export const BOMB_STOP_X = CATAPULT_X + 50;

export const SPLASH_RADIUS = 80;
export const BALLOON_SPEED = 900; // px per second
export const MIN_FLIGHT_MS = 300;
export const MAX_FLIGHT_MS = 900;
export const BALLOON_ARC_HEIGHT = 120;

export const MAX_FRAME_MS = 100; // clamps long frames (e.g. after a tab switch)

export const PLAYER_COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xba68c8] as const;

export const SceneKey = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  Difficulty: 'DifficultyScene',
  HighScores: 'HighScoresScene',
  Play: 'PlayScene',
  Result: 'ResultScene',
} as const;

export const TextureKey = {
  HudBar: 'hud-bar',
  Cloud: 'cloud',
  MenuBackground: 'menu-bg',
  BombBody: 'bomb-body',
  Balloon: 'balloon',
} as const;

// Odd player counts use 3 lanes and even counts use 4, so the catapults are always centred.
export const LANE_COUNTS = [3, 4] as const;
export const laneCountFor = (playerCount: number): number => (playerCount % 2 === 1 ? 3 : 4);

export const fieldTextureKey = (laneCount: number): string => `grass-field-${laneCount}`;

// Lanes are LANE_HEIGHT tall and centred on the field; spare field above and below is plain grass.
export const laneCenterY = (lane: number, laneCount: number): number =>
  FIELD_TOP + FIELD_HEIGHT / 2 + (lane - (laneCount - 1) / 2) * LANE_HEIGHT;

/** 0-based lane a player's catapult stands in: 1 player -> lane 2, 2 -> lanes 2-3, 3 -> lanes 1-3, 4 -> lanes 1-4. */
export const playerLane = (playerIndex: number, playerCount: number): number =>
  (laneCountFor(playerCount) - playerCount) / 2 + playerIndex;

export const catapultY = (playerIndex: number, playerCount: number): number =>
  laneCenterY(playerLane(playerIndex, playerCount), laneCountFor(playerCount));

// High scores and Home (and Back) share one size and sit in the top corners of menu screens.
export const CORNER_BUTTON = { width: 150, height: 42, fontSize: 22, margin: 20 } as const;

export const DIFFICULTY_COLORS: Record<Difficulty, number> = { veryEasy: 0x81d4fa, easy: 0x81c784, normal: 0xffd54f, hard: 0xef5350 };
