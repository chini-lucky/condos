import { homeViewport } from "./viewport.ts";
import type { Point, Viewport } from "./viewport.ts";
export interface MapSize {
  width: number;
  height: number;
}
export interface Rect extends Point {
  width: number;
  height: number;
}
export function fitNetwork(size: MapSize): Viewport {
  const width = Math.max(
    homeViewport.width,
    (homeViewport.height * size.width) / size.height,
  );
  const height = (width * size.height) / size.width;
  return {
    x: homeViewport.x + (homeViewport.width - width) / 2,
    y: homeViewport.y + (homeViewport.height - height) / 2,
    width,
    height,
  };
}
export function focusViewport(station: Point, size: MapSize): Viewport {
  const width = Math.max(160, Math.min(360, size.width * 0.25));
  const height = (width * size.height) / size.width;
  return { x: station.x - width / 2, y: station.y - height / 2, width, height };
}
export function pinVisibility(zoom: number): number {
  return Math.min(1, Math.max(0, (zoom - 1.7) / 0.8));
}
export function semanticStation(
  zoom: number,
  center: Point,
  stations: readonly (Point & { id: string })[],
): string | null | undefined {
  if (zoom < 1.5) return null;
  if (zoom <= 2.2 || stations.length === 0) return undefined;
  return [...stations].sort(
    (a, b) =>
      Math.hypot(a.x - center.x, a.y - center.y) -
      Math.hypot(b.x - center.x, b.y - center.y),
  )[0]?.id;
}
export function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
/** Place complete fixed-size labels; omit when no collision-free space remains. */
export function placeCallouts(
  anchors: readonly (Point & { id: string })[],
  size: MapSize,
  blocked: readonly Rect[],
  box: MapSize,
): (Rect & { id: string })[] {
  const occupied = [...blocked];
  const placed: (Rect & { id: string })[] = [];
  for (const anchor of anchors) {
    const offsets = [
      [18, 14],
      [-box.width - 18, 14],
      [18, -box.height - 14],
      [-box.width - 18, -box.height - 14],
      [-box.width / 2, -box.height - 28],
      [-box.width / 2, 28],
    ];
    const candidates = offsets.map(([dx = 0, dy = 0]) => ({
      x: anchor.x + dx,
      y: anchor.y + dy,
      ...box,
    }));
    // At crowded junctions use screen-side lanes rather than cover the station name.
    for (let y = 90; y + box.height < size.height - 12; y += box.height + 12) {
      candidates.push(
        { x: 12, y, ...box },
        { x: size.width - box.width - 12, y, ...box },
      );
    }
    const candidate = candidates.find(
      (rect) =>
        rect.x >= 12 &&
        rect.y >= 12 &&
        rect.x + rect.width <= size.width - 12 &&
        rect.y + rect.height <= size.height - 12 &&
        !occupied.some((other) => overlaps(rect, other)),
    );
    if (candidate) {
      placed.push({ ...candidate, id: anchor.id });
      occupied.push(candidate);
    }
  }
  return placed;
}
