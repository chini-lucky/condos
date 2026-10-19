import type { Station } from './network';
interface Label { x: number; y: number; fontSize: number; anchor: 'start' | 'end' }
interface Bounds { left: number; right: number; top: number; bottom: number }
function intersects(a: Bounds, b: Bounds) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
/** Keep focused names readable while revealing nearby names as diagram space allows. */
export function stationLabels(stations: readonly Station[], scale: number, selectedId: string | null, overview: boolean, interchanges: readonly string[] = []): Map<string, Label> {
  const labels = new Map<string, Label>();
  const occupied: Bounds[] = [];
  function priority(station: Station) { return station.id === selectedId ? 0 : interchanges.includes(station.id) || station.lines.length > 1 ? 1 : 2; }
  for (const station of [...stations].sort((a, b) => priority(a) - priority(b))) {
    if (overview && priority(station) > 1) continue;
    const focused = station.id === selectedId;
    const left = station.label.includes('l');
    const label: Label = {
      x: station.x + (left ? -10 : 10) * scale,
      y: station.y + (station.label.includes('t') ? -11 : station.label.includes('b') ? 18 : 4) * scale,
      fontSize: (focused ? 16 : 11) * scale,
      anchor: left ? 'end' : 'start',
    };
    const width = station.name.length * label.fontSize * .58;
    const bounds: Bounds = { left: label.x - (left ? width : 0) - 3 * scale, right: label.x + (left ? 0 : width) + 3 * scale, top: label.y - label.fontSize, bottom: label.y + 3 * scale };
    if (!focused && occupied.some(other => intersects(bounds, other))) continue;
    labels.set(station.id, label);
    occupied.push(bounds);
  }
  return labels;
}
