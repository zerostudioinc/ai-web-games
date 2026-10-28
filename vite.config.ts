/**
 * Vite and Vitest configuration: every game page is a build entry, tests live next to the code they cover, and each
 * game's version is read from its requirements file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { fillVersionPlaceholders, parseVersion } from './shared/version.ts'; // with its extension, as Vite's native config loader requires

const root = fileURLToPath(new URL('.', import.meta.url)); // absolute path of the repo root (the folder of this file)
const gamesDir = resolve(root, 'games'); // folder with one sub-folder per game

// Every games/<name>/index.html becomes its own page.
const input: Record<string, string> = { index: resolve(root, 'index.html') };
for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
  const page = resolve(gamesDir, entry.name, 'index.html');
  // Only folders that actually contain an index.html are games; stray files and empty folders are skipped.
  if (entry.isDirectory() && existsSync(page)) input[entry.name] = page;
}

// Version of every game, read from the `Version:` line of games/<name>.md; a game whose file has no such line is left out.
// Restart the dev server after changing one, because the versions are read once when the config loads.
const versions: Record<string, string> = {};
for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
  const version = parseVersion(readFileSync(resolve(gamesDir, entry.name), 'utf8'));
  if (version !== null) versions[basename(entry.name, '.md')] = version;
}

export default defineConfig({
  base: './', // relative asset URLs, so the built site works from any folder or sub-path
  define: { __GAME_VERSIONS__: JSON.stringify(versions) }, // read by game code as the global __GAME_VERSIONS__
  plugins: [
    {
      // Fills the %GAME_VERSION:<game>% placeholders of every page, such as the game cards on the root page.
      name: 'game-version-placeholders',
      transformIndexHtml: (html) => fillVersionPlaceholders(html, versions),
    },
  ],
  build: {
    rollupOptions: { input }, // one entry per page collected above
    chunkSizeWarningLimit: 1500, // Phaser alone is ~1 MB
  },
  test: {
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'], // tests sit beside the code they cover
  },
});
