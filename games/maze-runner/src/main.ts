// Entry point: configures Phaser and registers the scenes in the order they are first needed.
import Phaser from 'phaser';
import '@fontsource/lilita-one/400.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { HighScoresScene } from './scenes/HighScoresScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { ResultScene } from './scenes/ResultScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b1d2a',
  // Scale to fit any landscape screen while keeping the 16:9 shape.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  scene: [BootScene, MenuScene, HighScoresScene, PlayScene, LevelCompleteScene, ResultScene],
});
