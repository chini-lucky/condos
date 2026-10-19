import assert from 'node:assert/strict';
import test from 'node:test';
import { lines, stations, interchanges, connectedStations } from '../src/rail/network.ts';

test('official complete routes retain the outer stations and Blue loop closure', () => {
  assert.equal(lines.sukhumvit.stations.length, 47);
  assert.equal(lines.silom.stations.length, 14);
  assert.equal(lines.blue.stations.length, 38);
  assert.deepEqual([lines.sukhumvit.stations[0], lines.sukhumvit.stations.at(-1)], ['N24', 'E23']);
  assert.deepEqual([lines.silom.stations[0], lines.silom.stations.at(-1)], ['W1', 'S12']);
  assert.equal(stations.find(s => s.id === 'BL33')?.name, 'Bang Phai');
  assert.equal(stations.find(s => s.id === 'BL34')?.name, 'Bang Wa');
  assert.ok(connectedStations('BL01').includes('BL32'));
  assert.ok(connectedStations('BL01').includes('BL33'));
  assert.ok(connectedStations('BL01').includes('BL02'));
  assert.ok(interchanges.some(pair => pair.includes('E4') && pair.includes('BL22')));
  const reached = new Set<string>(['N24']);
  for (const id of reached) for (const neighbor of connectedStations(id)) reached.add(neighbor);
  assert.equal(reached.size, 98);
});
