import type { Bounds } from './systems/movement';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const MAX_PLAYERS = 4;
export const LANE_COUNT = 4;

export const FIELD_TOP = 80;
export const LANE_HEIGHT = (GAME_HEIGHT - FIELD_TOP) / LANE_COUNT;
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
  Play: 'PlayScene',
  Result: 'ResultScene',
} as const;

export const TextureKey = {
  Field: 'grass-field',
  HudBar: 'hud-bar',
  Cloud: 'cloud',
  MenuBackground: 'menu-bg',
  BombBody: 'bomb-body',
  Balloon: 'balloon',
} as const;

export const laneCenterY = (lane: number): number => FIELD_TOP + (lane + 0.5) * LANE_HEIGHT;

// A lone catapult is centred in the field; otherwise player N sits in lane N.
export const catapultY = (playerIndex: number, playerCount: number): number =>
  playerCount === 1 ? FIELD_TOP + (GAME_HEIGHT - FIELD_TOP) / 2 : laneCenterY(playerIndex);
