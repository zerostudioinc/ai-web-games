/**
 * Decides which gamepad buttons count as "fire" and detects fresh presses of them.
 */

/**
 * How many of the first gamepad buttons are fire buttons (indices 0 to 7): the standard-mapping face buttons,
 * bumpers and triggers. Anything higher is Select/Start, stick clicks, the D-pad or Home, and some Bluetooth
 * controllers report held directions on other indices, which must never mask or trigger a shot.
 */
export const FIRE_BUTTON_COUNT = 8;

/**
 * Snapshots the pressed state of the fire buttons only.
 *
 * @param buttons - A gamepad's buttons; entries may be missing on controllers with fewer buttons.
 * @returns One flag per fire button (length `FIRE_BUTTON_COUNT`), true while pressed; missing buttons read as released.
 */
export function fireButtonStates(buttons: readonly { pressed: boolean }[]): boolean[] {
  return Array.from({ length: FIRE_BUTTON_COUNT }, (_, index) => buttons[index]?.pressed ?? false);
}

/**
 * True when any fire button went down this frame, even while other buttons are already held.
 *
 * @param previous - Fire-button snapshot from the previous frame.
 * @param current - Fire-button snapshot from this frame.
 * @returns Whether at least one button is down now that was up before.
 */
export function anyNewPress(previous: readonly boolean[], current: readonly boolean[]): boolean {
  return current.some((down, index) => down && !previous[index]);
}
