/**
 * Entry point: creates the Phaser game and registers every scene.
 */
import Phaser from 'phaser';
import '@fontsource/lilita-one/400.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { DifficultyScene } from './scenes/DifficultyScene';
import { HighScoresScene } from './scenes/HighScoresScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { ResultScene } from './scenes/ResultScene';

new Phaser.Game({
  type: Phaser.AUTO, // WebGL when available, otherwise canvas
  parent: 'game', // id of the <div> in index.html that holds the canvas
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#12303f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, // letterbox to fit any window
  input: { gamepad: true }, // enables controller support
  scene: [BootScene, MenuScene, HighScoresScene, DifficultyScene, PlayScene, ResultScene], // the first scene starts automatically
});
