// Keyboard shortcuts for menu screens.
import Phaser from 'phaser';

/**
 * Runs `handler` once per physical press of any of the named keys (e.g. 'ENTER', 'SPACE').
 * A key that is merely held produces repeated events, which are ignored, so holding Enter
 * through a screen change cannot trigger the next screen's button.
 * The listeners are removed again when the scene shuts down.
 */
export function onKeyPress(scene: Phaser.Scene, keyNames: readonly string[], handler: () => void): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  const listener = (event: KeyboardEvent): void => {
    if (!event.repeat) handler();
  };
  for (const name of keyNames) keyboard.on(`keydown-${name}`, listener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    for (const name of keyNames) keyboard.off(`keydown-${name}`, listener);
  });
}
