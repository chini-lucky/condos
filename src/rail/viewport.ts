export interface Point {
  x: number;
  y: number;
}
export interface Viewport extends Point {
  width: number;
  height: number;
}
export const homeViewport: Viewport = {
  x: -170,
  y: -240,
  width: 1100,
  height: 1280,
};
export function zoomAt(
  view: Viewport,
  factor: number,
  anchor: Point,
): Viewport {
  const width = Math.min(2200, Math.max(120, view.width / factor));
  const ratio = width / view.width;
  return {
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
    width,
    height: view.height * ratio,
  };
}
export function panBy(view: Viewport, x: number, y: number): Viewport {
  return { ...view, x: view.x + x, y: view.y + y };
}
