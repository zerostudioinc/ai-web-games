/**
 * Vite and Vitest configuration: every game page is a build entry and tests live next to the code they cover.
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url)); // absolute path of the repo root (the folder of this file)
const gamesDir = resolve(root, 'games'); // folder with one sub-folder per game

// Every games/<name>/index.html becomes its own page.
const input: Record<string, string> = { index: resolve(root, 'index.html') };
for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
  const page = resolve(gamesDir, entry.name, 'index.html');
  // Only folders that actually contain an index.html are games; stray files and empty folders are skipped.
  if (entry.isDirectory() && existsSync(page)) input[entry.name] = page;
}

export default defineConfig({
  base: './', // relative asset URLs, so the built site works from any folder or sub-path
  build: {
    rollupOptions: { input }, // one entry per page collected above
    chunkSizeWarningLimit: 1500, // Phaser alone is ~1 MB
  },
  test: {
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'], // tests sit beside the code they cover
  },
});
