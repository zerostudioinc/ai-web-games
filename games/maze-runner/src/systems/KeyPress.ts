/**
 * Keyboard shortcuts for menu screens.
 */
import Phaser from 'phaser';

/**
 * Runs `handler` once per physical press of any of the named keys (e.g. 'ENTER', 'SPACE').
 * A key that is merely held produces repeated events, which are ignored, so holding Enter
 * through a screen change cannot trigger the next screen's button.
 * The listeners are removed again when the scene shuts down.
 *
 * @param scene - Scene whose keyboard plugin is listened to; its shutdown removes the listeners.
 * @param keyNames - Phaser key names, such as 'ENTER', 'SPACE' or 'UP'.
 * @param handler - Callback run once for every fresh press.
 */
export function onKeyPress(scene: Phaser.Scene, keyNames: readonly string[], handler: () => void): void {
  // The plugin is missing when keyboard input is disabled, so there is nothing to listen to.
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  /**
   * Forwards a key-down to `handler`, skipping the auto-repeat events of a held key.
   *
   * @param event - The browser keyboard event; its `repeat` flag is true for auto-repeats.
   */
  const listener = (event: KeyboardEvent): void => {
    if (!event.repeat) handler();
  };
  for (const name of keyNames) keyboard.on(`keydown-${name}`, listener);
  // Unhook on shutdown so a restarted scene does not stack duplicate handlers.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    for (const name of keyNames) keyboard.off(`keydown-${name}`, listener);
  });
}
