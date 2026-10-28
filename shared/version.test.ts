/**
 * Tests for reading a game's version from its requirements file and showing it as a label.
 */
import { describe, expect, it } from 'vitest';
import { fillVersionPlaceholders, formatVersion, parseVersion } from './version';

// The version is the "Version:" line near the top of a game's requirements file.
describe('parseVersion', () => {
  it('reads the version line under the title', () => {
    expect(parseVersion('## Balloon Catapult\nVersion: 1.1\n\n### Instruction\nCreate a game.')).toBe('1.1');
  });

  it('copes with Windows line endings, extra spaces and any letter case', () => {
    expect(parseVersion('## Game\r\nVersion: 1.1\r\n\r\n### Instruction')).toBe('1.1');
    expect(parseVersion('## Game\n  version:   2.0.3  \n')).toBe('2.0.3');
  });

  it('drops a leading "v" before a digit, but keeps a word that merely starts with v', () => {
    expect(parseVersion('Version: v1.2')).toBe('1.2');
    expect(parseVersion('Version: Very early')).toBe('Very early');
  });

  it('uses the first version line only', () => {
    expect(parseVersion('Version: 1.1\nVersion: 9.9')).toBe('1.1');
  });

  it('ignores "Version:" that is not at the start of a line', () => {
    expect(parseVersion('- Show the Version: 2 somewhere')).toBeNull();
    expect(parseVersion('- Version: 3')).toBeNull();
  });

  it('returns null when there is no version, or no value on the same line', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('## Title\nRequirements only')).toBeNull();
    expect(parseVersion('Version:\n1.1')).toBeNull();
    expect(parseVersion('Version:   \n')).toBeNull();
  });
});

// The label is the version with a "v" in front, or nothing at all.
describe('formatVersion', () => {
  it('puts a "v" in front of the version', () => {
    expect(formatVersion('1.1')).toBe('v1.1');
  });

  it('gives an empty label when there is no version', () => {
    expect(formatVersion(undefined)).toBe('');
    expect(formatVersion('')).toBe('');
  });
});

// Pages such as the root game list name the game they want the version of.
describe('fillVersionPlaceholders', () => {
  const versions = { 'balloon-catapult': '1.1', 'maze-runner': '2.0' };

  it("replaces each placeholder with that game's version label", () => {
    const html = '<h2>Balloon <span>%GAME_VERSION:balloon-catapult%</span></h2><h2>%GAME_VERSION:maze-runner%</h2>';
    expect(fillVersionPlaceholders(html, versions)).toBe('<h2>Balloon <span>v1.1</span></h2><h2>v2.0</h2>');
  });

  it('leaves nothing behind for a game without a version, even one named like an object built-in', () => {
    expect(fillVersionPlaceholders('[%GAME_VERSION:pong%][%GAME_VERSION:constructor%]', versions)).toBe('[][]');
  });

  it('leaves every other percent sign alone', () => {
    const css = 'background: linear-gradient(#fff, #000) 0 14% / 100% 20% no-repeat; width: 50%; font: 100%/1.4 serif';
    expect(fillVersionPlaceholders(css, versions)).toBe(css);
  });
});
