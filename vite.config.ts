import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));
const gamesDir = resolve(root, 'games');

// Every games/<name>/index.html becomes its own page.
const input: Record<string, string> = { index: resolve(root, 'index.html') };
for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
  const page = resolve(gamesDir, entry.name, 'index.html');
  if (entry.isDirectory() && existsSync(page)) input[entry.name] = page;
}

export default defineConfig({
  base: './',
  build: {
    rollupOptions: { input },
    chunkSizeWarningLimit: 1500, // Phaser alone is ~1 MB
  },
  test: {
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'],
  },
});
