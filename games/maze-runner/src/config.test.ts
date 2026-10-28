/**
 * Tests for Maze Runner's constants: the version label must come from the requirements file, which is the only place the version is written.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatVersion, parseVersion } from '../../../shared/version';
import { GAME_ID, VERSION_LABEL } from './config';

// The game id names the requirements file (games/maze-runner.md); the menu label must show the version declared in it.
describe('VERSION_LABEL', () => {
  it('shows the version from the requirements file', () => {
    const markdown = readFileSync(new URL(`../../${GAME_ID}.md`, import.meta.url), 'utf8');
    const version = parseVersion(markdown);
    expect(version).not.toBeNull(); // the file declares a version on its `Version:` line
    expect(VERSION_LABEL).toBe(formatVersion(version ?? undefined));
    expect(VERSION_LABEL).toMatch(/^v\d/); // for example "v1.1"
  });
});
