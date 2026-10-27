// Shared constants: screen layout, timings, and the scene and texture keys.
import type { Difficulty } from './systems/difficulty';
import type { ThemeId } from './systems/themes';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Height of the status bar along the top of the play screen. */
export const HUD_HEIGHT = 64;

/** Screen region the maze is fitted into; the strips either side stay free for the touch pad. */
export const PLAY_AREA = { x: 320, y: HUD_HEIGHT, width: 640, height: GAME_HEIGHT - HUD_HEIGHT } as const;

/** On-screen direction pad for touch devices, centred in the free strip to the right of the maze. */
export const TOUCH_PAD = { x: 1120, y: 500, buttonSize: 88, gap: 8 } as const;

export const MAX_LIVES = 3;

export const STEP_MS = 120; // time to glide across one square
export const REPEAT_DELAY_MS = 260; // a held direction waits this long before it starts repeating
export const REPEAT_MS = 140; // then steps this often
export const MAX_FRAME_MS = 100; // clamps long frames (e.g. after a tab switch)

// How long each beat of a level lasts, in milliseconds.
export const INTRO_MS = 1600;
export const TRAP_MS = 1600;
export const CLEAR_MS = 1500;
export const GAME_OVER_MS = 2000;
export const SEAL_POP_MS = 240;
export const RESPAWN_BLINK_MS = 900; // the runner blinks this long after returning to the start

export const SceneKey = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  HighScores: 'HighScoresScene',
  Play: 'PlayScene',
  LevelComplete: 'LevelCompleteScene',
  Result: 'ResultScene',
} as const;

export const TextureKey = {
  MenuBackground: 'menu-bg',
  HudBar: 'hud-bar',
  HeartFull: 'heart-full',
  HeartEmpty: 'heart-empty',
  Portal: 'exit-portal',
  DpadButton: 'dpad-button',
  Spark: 'spark',
} as const;

export const themeTextureKey = (theme: ThemeId): string => `theme-${theme}`;

// High Scores (or Back) and Home share one size and sit in the top corners of menu screens.
export const CORNER_BUTTON = { width: 150, height: 42, fontSize: 22, margin: 20 } as const;

export const DIFFICULTY_COLORS: Record<Difficulty, number> = { normal: 0xffd54f, hard: 0xef5350 };
