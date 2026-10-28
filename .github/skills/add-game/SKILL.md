---
name: add-game
description: 'Scaffold a new Phaser 3 + TypeScript game in this repo. Use when asked to add a game, create a new game, or scaffold a game such as pong or snake.'
---

# Add a game

Follow the layout and conventions in [AGENTS.md](../../../AGENTS.md).

## Steps

1. Pick a kebab-case name (e.g. `pong`) and confirm `games/<name>/` does not already exist. Read `games/<name>.md` for the requirements if it exists.
2. Create `games/<name>/index.html` with a `<div id="game">` and a module script pointing at `./src/main.ts`.
3. Create `games/<name>/src/main.ts` exporting a `Phaser.Game` config (fixed size, `Phaser.AUTO`, `parent: 'game'`, scene list).
4. Create `games/<name>/src/config.ts` (size, scene keys, constants) and `src/{scenes,entities,systems,assets}/`; one scene per file, with at least `BootScene.ts` and `PlayScene.ts`.
5. Use generated graphics rather than external assets; put any real assets in `games/<name>/src/assets/` and import them.
6. Add a link to the game in the root [index.html](../../../index.html), and put `<span class="version">%GAME_VERSION:<name>%</span>` after the game's name in its card so the card shows its version. The Vite config discovers `games/*/index.html` automatically.
7. Put testable logic in pure `systems/*.ts` files with `*.test.ts` beside them.
8. Add a `Version: 1.0` line under the title of `games/<name>.md` (the version's source of truth), and show it in small text in the bottom-right corner of the main menu: define `VERSION_LABEL` in `src/config.ts` as `formatVersion(__GAME_VERSIONS__['<name>'])` (from `shared/version.ts`), as [games/balloon-catapult](../../../games/balloon-catapult) does.
9. Run `npm run typecheck`, `npm run test` and `npm run build`, and fix any errors.
10. Run the `game-reviewer` agent as a subagent on `games/<name>/`, passing the game name and its requirements file. Fix every high and medium finding, then re-run step 9. Report any low findings you leave unfixed.

Use [games/balloon-catapult](../../../games/balloon-catapult) as the reference layout.

## Checks

- No imports from other `games/*` folders.
- `PlayScene` uses `delta` for movement and cleans up listeners and timers on `shutdown`.
- Restart from `GameOverScene` resets all state.
