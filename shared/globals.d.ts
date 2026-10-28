/**
 * Build-time constants that `vite.config.ts` injects into every game.
 */

/**
 * Version of each game by folder name (for example "balloon-catapult"), taken from the `Version:` line of
 * games/<name>.md. A game whose requirements file has no such line has no entry.
 */
declare const __GAME_VERSIONS__: Readonly<Record<string, string | undefined>>;
