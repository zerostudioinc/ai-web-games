/**
 * Entry point: configures Phaser and registers the scenes in the order they are first needed.
 */
import Phaser from 'phaser';
// Bundles the Lilita One display font, the first family of `FONT` in style.ts.
import '@fontsource/lilita-one/400.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { HighScoresScene } from './scenes/HighScoresScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { ResultScene } from './scenes/ResultScene';

new Phaser.Game({
  type: Phaser.AUTO, // WebGL when the browser supports it, otherwise Canvas
  parent: 'game', // id of the <div> in index.html that receives the canvas
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b1d2a', // same as COLOR.night in style.ts
  // Scale to fit any landscape screen while keeping the 16:9 shape.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true }, // turns on the gamepad plugin so controllers can be read
  // The first scene (BootScene) starts automatically; every other scene is started with `scene.start`.
  scene: [BootScene, MenuScene, HighScoresScene, PlayScene, LevelCompleteScene, ResultScene],
});
