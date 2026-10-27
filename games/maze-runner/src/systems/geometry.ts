/**
 * Plain 2D shapes shared by the pure layout and scenery helpers.
 */

/** A position on the screen. */
export interface Point {
  x: number; // horizontal position, px; grows to the right
  y: number; // vertical position, px; grows downward
}

/** An axis-aligned rectangle on the screen. */
export interface Rect {
  x: number; // left edge, px
  y: number; // top edge, px
  width: number; // px
  height: number; // px
}
