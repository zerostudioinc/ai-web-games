import Phaser from 'phaser';
import { SceneKey } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  // Asset loading goes here once the game has any.
  create(): void {
    this.scene.start(SceneKey.Menu);
  }
}
