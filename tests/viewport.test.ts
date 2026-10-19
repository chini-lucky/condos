import assert from "node:assert/strict";
import test from "node:test";
import { zoomAt, panBy } from "../src/rail/viewport.ts";

test("zoom keeps the pointer location anchored and clamps the reachable range", () => {
  assert.deepEqual(
    zoomAt({ x: 0, y: 0, width: 1000, height: 800 }, 2, { x: 250, y: 200 }),
    { x: 125, y: 100, width: 500, height: 400 },
  );
  assert.deepEqual(
    panBy({ x: 100, y: 100, width: 500, height: 400 }, 50, -20),
    { x: 150, y: 80, width: 500, height: 400 },
  );
  assert.equal(
    zoomAt({ x: 0, y: 0, width: 120, height: 96 }, 10, { x: 0, y: 0 }).width,
    120,
  );
});
