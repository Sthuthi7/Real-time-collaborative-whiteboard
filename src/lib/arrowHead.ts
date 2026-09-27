import { LineStroke } from '../types/stroke';

export interface Point {
  x: number;
  y: number;
}

/**
 * Returns the three points of an arrowhead polygon:
 * [tip, leftWing, rightWing]
 * Tip is at (x2, y2); wings are 14px back at ±25°.
 */
export function arrowHead(stroke: LineStroke): [Point, Point, Point] {
  const { x1, y1, x2, y2 } = stroke;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = 14;
  const spread = Math.PI / 180 * 25; // 25 degrees

  const tip: Point = { x: x2, y: y2 };

  const leftWing: Point = {
    x: x2 - length * Math.cos(angle - spread),
    y: y2 - length * Math.sin(angle - spread),
  };

  const rightWing: Point = {
    x: x2 - length * Math.cos(angle + spread),
    y: y2 - length * Math.sin(angle + spread),
  };

  return [tip, leftWing, rightWing];
}
