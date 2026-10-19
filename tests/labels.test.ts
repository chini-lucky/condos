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

test("overview keeps the names of stations with offers visible before empty nearby stations", () => {
  const labels = stationLabels(
    [
      {
        id: "offer-station",
        name: "Named shortlist station",
        x: 100,
        y: 100,
        label: "r",
        lines: ["blue"],
      },
    ],
    1,
    null,
    true,
    [],
    undefined,
    ["offer-station"],
  );
  assert.equal(labels.has("offer-station"), true);
});
