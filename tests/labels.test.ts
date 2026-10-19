import assert from "node:assert/strict";
import test from "node:test";
import { stationLabels } from "../src/rail/labels.ts";

test("focused station name takes priority over a nearby overlapping label", () => {
  const labels = stationLabels(
    [
      {
        id: "a",
        name: "Long station name",
        x: 20,
        y: 20,
        label: "r",
        lines: ["blue"],
      },
      {
        id: "b",
        name: "Focused station",
        x: 40,
        y: 20,
        label: "r",
        lines: ["blue"],
      },
    ],
    1,
    "b",
    false,
  );
  assert.equal(labels.has("b"), true);
  assert.equal(labels.has("a"), false);
});
