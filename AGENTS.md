# Simple 2D Web Based Games

Simple 2D browser games built with Vite, TypeScript (strict) and Phaser 3. See [README.md](README.md) for the project overview.

## Commands

- `npm install`
- `npm run dev` — Vite dev server; the root page links to each game
- `npm run build` — typecheck, then production build
- `npm run preview` — serve the production build
- `npm run test` — Vitest (`games/**/*.test.ts`, `shared/**/*.test.ts`)
- `npm run typecheck` — `tsc --noEmit`

## Layout

- One self-contained folder per game: `games/<kebab-name>/` with `index.html`, `src/main.ts`, `src/config.ts`, and `src/{scenes,entities,systems,assets}/`.
- A single Vite project at the repo root; every `games/*/index.html` is auto-registered as a build page. Also list new games in the root [index.html](index.html).
- Games never import from each other. Code used by several games goes in `shared/`.
- Each game's assets live in its own `src/assets/` and are imported, so Vite bundles them.
- Use the `add-game` skill to scaffold a new game. Example: [games/balloon-catapult](games/balloon-catapult).
- Each game's overview and requirements live in `games/<kebab-name>.md` (e.g. [balloon-catapult.md](games/balloon-catapult.md)); check it before changing gameplay.

## Conventions

- One Phaser `Scene` per file; the game config lives in `main.ts`.
- Prefer generated or primitive graphics (shapes, graphics objects, generated textures) over binary assets.
- Movement and timers must use the `delta` passed to `update`, not frame counts.
- Write code with proper comments in them so developers can easily review the written source code.
- Make sure all function has a header comment describing what it does, and what each parameter is.
- The game version is store in each of the game overview and requirements markdown file, it will be the game version number source of truth. When new requirements is added, the version number will be updated and will need to be updated to the game.
  - The build reads the `Version:` line (line 2, under the title) of `games/<kebab-name>.md` (`vite.config.ts`, parsed by `shared/version.ts`), so a game follows it automatically; never hard-code a version. Game code reads it as `__GAME_VERSIONS__['<kebab-name>']`, and HTML pages use a `%GAME_VERSION:<kebab-name>%` placeholder. Restart `npm run dev` after changing a version, because it is read once when the config loads.
  - Every game's main menu should show its version in small text in the bottom-right corner: define `VERSION_LABEL` in the game's `src/config.ts` and draw it in its `MenuScene`. [games/balloon-catapult](games/balloon-catapult) is the reference. Each game's card on the root [index.html](index.html) shows its version too.
- Add a tiny copyright label on the bottom center of each game menu and the home screen. Make the year dynamic based on current year.
  - © 2026 Zero Studio Inc

## Pitfalls

- Scenes need a canvas-capable DOM; don't unit-test them under plain Node. Keep logic in pure functions under `systems/` and test those.
- Import assets from `src/assets/` instead of hardcoding URLs; the build uses `base: './'`.
- Remove event listeners and timers in the scene `shutdown` handler so restarts don't leak.
