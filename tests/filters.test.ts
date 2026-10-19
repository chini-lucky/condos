import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyOffer,
  defaultFilters,
  filterSummary,
  matchingStationSummaries,
} from "../src/offers/filters.ts";
const unknown = {
  rent: null,
  propertyType: null,
  washer: null,
  garden: null,
  pool: null,
  microwave: null,
  stationId: "E6",
};
test("filter rules preserve unknowns when inactive, combine facilities, and treat both types and Any rent correctly", () => {
  assert.deepEqual(classifyOffer(unknown, defaultFilters()), { kind: "match" });
  const washer = { ...defaultFilters(), facilities: ["washer"] as const };
  assert.deepEqual(classifyOffer(unknown, washer), {
    kind: "missing-facility",
    missing: [{ facility: "washer", state: "unknown" }],
  });
  assert.deepEqual(classifyOffer({ ...unknown, washer: false }, washer), {
    kind: "missing-facility",
    missing: [{ facility: "washer", state: "absent" }],
  });
  assert.deepEqual(classifyOffer({ ...unknown, washer: true }, washer), {
    kind: "match",
  });
  assert.deepEqual(
    classifyOffer(
      { ...unknown, washer: true, pool: null },
      { ...washer, facilities: ["washer", "pool"] },
    ),
    {
      kind: "missing-facility",
      missing: [{ facility: "pool", state: "unknown" }],
    },
  );
  assert.deepEqual(
    classifyOffer(unknown, { ...defaultFilters(), types: ["condominium"] }),
    { kind: "excluded" },
  );
  assert.deepEqual(
    classifyOffer(unknown, {
      ...defaultFilters(),
      types: ["condominium", "townhouse"],
    }),
    { kind: "match" },
  );
  assert.deepEqual(
    classifyOffer({ ...unknown, rent: 42000 }, defaultFilters()),
    { kind: "match" },
  );
  assert.deepEqual(
    classifyOffer(
      { ...unknown, rent: 34500 },
      { ...defaultFilters(), rentLimit: 34500 },
    ),
    { kind: "match" },
  );
  assert.deepEqual(
    classifyOffer(
      { ...unknown, rent: 35000 },
      { ...defaultFilters(), rentLimit: 34500 },
    ),
    { kind: "excluded" },
  );
  assert.deepEqual(
    classifyOffer(unknown, { ...defaultFilters(), rentLimit: 20000 }),
    { kind: "excluded" },
  );
  assert.deepEqual(
    classifyOffer(
      { ...unknown, washer: false, rent: 30000 },
      { ...washer, rentLimit: 20000 },
    ),
    { kind: "excluded" },
  );
  assert.equal(filterSummary(defaultFilters()), "All offers · Any rent");
});
test("matching station totals and minimum rent retain occupied stations with zero matches", () => {
  const offers = [
    { ...unknown, stationId: "E6", rent: 42000, washer: true },
    { ...unknown, stationId: "E6", rent: 15000, washer: false },
    { ...unknown, stationId: "N5", rent: null, washer: null },
  ];
  assert.deepEqual(
    matchingStationSummaries(offers, {
      ...defaultFilters(),
      facilities: ["washer"],
    }),
    [
      { stationId: "E6", count: 1, total: 2, lowestRent: 42000 },
      { stationId: "N5", count: 0, total: 1, lowestRent: null },
    ],
  );
});
