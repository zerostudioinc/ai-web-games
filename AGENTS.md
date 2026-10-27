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
- Use the `add-game` skill to scaffold a new game. Example: [games/water-balloon-bombardment](games/water-balloon-bombardment).

## Conventions

- One Phaser `Scene` per file; the game config lives in `main.ts`.
- Prefer generated or primitive graphics (shapes, graphics objects, generated textures) over binary assets.
- Movement and timers must use the `delta` passed to `update`, not frame counts.

## Pitfalls

- Scenes need a canvas-capable DOM; don't unit-test them under plain Node. Keep logic in pure functions under `systems/` and test those.
- Import assets from `src/assets/` instead of hardcoding URLs; the build uses `base: './'`.
- Remove event listeners and timers in the scene `shutdown` handler so restarts don't leak.
