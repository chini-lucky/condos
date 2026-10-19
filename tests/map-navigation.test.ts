import { test } from "node:test";
import assert from "node:assert/strict";
import {
  semanticStation,
  pinVisibility,
  placeCallouts,
  fitNetwork,
} from "../src/rail/mapNavigation.ts";
test("free zoom changes panels only across the hysteresis thresholds and finds the nearest station with offers", () => {
  const candidates = [
    { id: "near", x: 10, y: 10 },
    { id: "far", x: 100, y: 100 },
  ];
  assert.equal(semanticStation(2.3, { x: 15, y: 15 }, candidates), "near");
  assert.equal(semanticStation(1.4, { x: 15, y: 15 }, candidates), null);
  assert.equal(semanticStation(1.8, { x: 15, y: 15 }, candidates), undefined);
  assert.equal(semanticStation(3, { x: 15, y: 15 }, []), undefined);
  assert.equal(pinVisibility(1.7), 0);
  assert.ok(Math.abs(pinVisibility(2.1) - 0.5) < 0.00001);
  assert.equal(pinVisibility(2.5), 1);
  const home = fitNetwork({ width: 390, height: 630 });
  assert.ok(Math.abs(home.width / home.height - 390 / 630) < 0.0001);
});
test("callouts avoid station labels, navigation controls, each other and the map edges", () => {
  const blocked = [
    { x: 0, y: 0, width: 200, height: 80 },
    { x: 250, y: 180, width: 100, height: 30 },
  ];
  const placed = placeCallouts(
    [
      { id: "a", x: 230, y: 200 },
      { id: "b", x: 235, y: 205 },
    ],
    { width: 600, height: 450 },
    blocked,
    { width: 190, height: 100 },
  );
  assert.equal(placed.length, 2);
  for (const item of placed) {
    assert.ok(
      item.x >= 12 &&
        item.y >= 12 &&
        item.x + 190 <= 588 &&
        item.y + 100 <= 438,
    );
    for (const obstacle of blocked)
      assert.ok(
        item.x + 190 <= obstacle.x ||
          item.x >= obstacle.x + obstacle.width ||
          item.y + 100 <= obstacle.y ||
          item.y >= obstacle.y + obstacle.height,
      );
  }
  assert.ok(placed[0] && placed[1]);
});
