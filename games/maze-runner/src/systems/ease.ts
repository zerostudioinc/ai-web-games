/**
 * Smoothing curves for short animations. Input and output both run 0..1 (an overshooting curve briefly exceeds 1).
 */

/**
 * Overshoots slightly past 1 before settling, which gives pop-in effects a springy feel.
 *
 * @param t - Animation progress from 0 (start) to 1 (end); values outside that range are clamped.
 * @returns Eased progress: 0 at the start, about 1.1 at its peak (around t = 0.58) and exactly 1 at the end.
 */
export function easeOutBack(t: number): number {
  // Standard "back" easing constants: c1 sets how far the curve overshoots, and c3 = c1 + 1.
  const c1 = 1.70158;
  const c3 = c1 + 1;
  // Clamp the progress to 0..1, then shift it so the curve is evaluated on -1..0 and ends at exactly 1.
  const x = Math.min(1, Math.max(0, t)) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}
