// Standard-mapping face buttons, bumpers and triggers. Anything higher is Select/Start, stick clicks, the D-pad or Home,
// and some Bluetooth controllers report held directions on other indices, which must never mask or trigger a shot.
export const FIRE_BUTTON_COUNT = 8;

export function fireButtonStates(buttons: readonly { pressed: boolean }[]): boolean[] {
  return Array.from({ length: FIRE_BUTTON_COUNT }, (_, index) => buttons[index]?.pressed ?? false);
}

/** True when any fire button went down this frame, even while other buttons are already held. */
export function anyNewPress(previous: readonly boolean[], current: readonly boolean[]): boolean {
  return current.some((down, index) => down && !previous[index]);
}
