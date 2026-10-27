// Smoothing curves for short animations. Input and output both run 0..1.

/** Overshoots slightly past 1 before settling, which gives pop-in effects a springy feel. */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t)) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}
