import type { Bounds } from './systems/movement';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const MAX_PLAYERS = 4;
export const LANE_COUNT = 4;

export const FIELD_TOP = 80;
export const LANE_HEIGHT = (GAME_HEIGHT - FIELD_TOP) / LANE_COUNT;
export const FIELD_BOUNDS: Bounds = { left: 0, top: FIELD_TOP, right: GAME_WIDTH, bottom: GAME_HEIGHT };

export const CATAPULT_X = 110;
export const RETICLE_SPEED = 420; // px per second

export const PLAYER_COLORS = [0x4fc3f7, 0xffb74d, 0x81c784, 0xba68c8] as const;

export const SceneKey = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  Play: 'PlayScene',
} as const;

export const laneCenterY = (lane: number): number => FIELD_TOP + (lane + 0.5) * LANE_HEIGHT;

// A lone catapult is centred in the field; otherwise player N sits in lane N.
export const catapultY = (playerIndex: number, playerCount: number): number =>
  playerCount === 1 ? FIELD_TOP + (GAME_HEIGHT - FIELD_TOP) / 2 : laneCenterY(playerIndex);
