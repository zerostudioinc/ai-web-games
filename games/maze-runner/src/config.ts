/**
 * Maze Runner's shared constants: screen size, play-area layout, timings, and the scene and texture keys.
 */
import type { Difficulty } from './systems/difficulty';
import type { ThemeId } from './systems/themes';

// Logical canvas size in px (landscape 16:9); Phaser scales it to fit the window.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Height of the status bar along the top of the play screen, in px. */
export const HUD_HEIGHT = 64;

/** Screen region (px; `x`/`y` is its top-left corner) the maze is fitted into; the strips either side stay free for the touch pad. */
export const PLAY_AREA = { x: 320, y: HUD_HEIGHT, width: 640, height: GAME_HEIGHT - HUD_HEIGHT } as const;

/**
 * On-screen direction pad for touch devices, centred in the free strip to the right of the maze.
 * `x`/`y` is the centre of the four-button cross (px), `buttonSize` the edge of one square button (px)
 * and `gap` the space between neighbouring buttons (px).
 */
export const TOUCH_PAD = { x: 1120, y: 500, buttonSize: 88, gap: 8 } as const;

/** Lives the runner has in each level; they are restored to this number whenever a new level starts. */
export const MAX_LIVES = 3;

// Movement and input timing, in ms.
export const STEP_MS = 120; // time to glide across one square
export const REPEAT_DELAY_MS = 260; // a held direction waits this long before it starts repeating
export const REPEAT_MS = 140; // then steps this often
export const MAX_FRAME_MS = 100; // clamps long frames (e.g. after a tab switch)

// How long each beat of a level lasts, in milliseconds.
export const INTRO_MS = 1600; // level banner shown before the clock starts
export const TRAP_MS = 1600; // "TRAPPED!" banner and the runner's stun before being sent back to the start
export const CLEAR_MS = 1500; // "ESCAPED!" banner and cheer before the level-complete screen
export const GAME_OVER_MS = 2000; // final "TRAPPED!" banner (no lives left) before the result screen
export const SEAL_POP_MS = 240; // pop-in animation of the slab that seals a collapsed passage
export const RESPAWN_BLINK_MS = 900; // the runner blinks this long after returning to the start

/** Scene keys, so scenes can start each other without repeating string literals. */
export const SceneKey = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  HighScores: 'HighScoresScene',
  Play: 'PlayScene',
  LevelComplete: 'LevelCompleteScene',
  Result: 'ResultScene',
} as const;

/** Keys of the textures generated at boot (see assets/generateTextures.ts). */
export const TextureKey = {
  MenuBackground: 'menu-bg', // full-screen backdrop of the menu, high-score and result screens
  HudBar: 'hud-bar', // status bar along the top of the play screen
  HeartFull: 'heart-full', // a life the runner still has
  HeartEmpty: 'heart-empty', // a life that has been lost
  Portal: 'exit-portal', // marker drawn just beyond the exit gap
  DpadButton: 'dpad-button', // one arrow button of the on-screen pad
  Spark: 'spark', // small white dot used for menu sparkles and confetti
} as const;

/**
 * Texture key of a theme's full-screen background, baked at boot.
 *
 * @param theme - The theme whose background is addressed.
 * @returns The texture key, `theme-<id>`.
 */
export const themeTextureKey = (theme: ThemeId): string => `theme-${theme}`;

// High Scores (or Back) and Home share one size and sit in the top corners of menu screens.
/** Size (px) of the corner buttons, their font size (px), and their distance from the screen edge (`margin`, px). */
export const CORNER_BUTTON = { width: 150, height: 42, fontSize: 22, margin: 20 } as const;

/** Accent colour (0xRRGGBB) of each difficulty's menu card heading and high-score panel heading. */
export const DIFFICULTY_COLORS: Record<Difficulty, number> = { normal: 0xffd54f, hard: 0xef5350 };
