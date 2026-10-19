import { test } from "node:test";
import assert from "node:assert/strict";
import {
  offerPosition,
  walkingMinutes,
  offersByDistance,
  stationSummaries,
  nearestStationWithOffers,
} from "../src/offers/location.ts";
const location = { stationId: "E6", walkingMetres: 1000, bearing: 90 };
test("only complete location facts produce a schematic pin; supplied walking metres produce an estimate", () => {
  assert.deepEqual(offerPosition(location), { x: 625, y: 468 });
  assert.equal(offerPosition({ ...location, bearing: null }), null);
  assert.equal(offerPosition({ ...location, walkingMetres: null }), null);
  assert.equal(offerPosition({ ...location, stationId: null }), null);
  assert.equal(walkingMinutes(800), 10);
  assert.equal(walkingMinutes(null), null);
  assert.equal(walkingMinutes(0), 0);
});
test("station counts include incomplete positioning, unknown distances sort last, and rent summaries ignore unknowns", () => {
  const offers = [
    {
      id: "far",
      stationId: "E6",
      walkingMetres: 800,
      bearing: null,
      rent: null,
    },
    {
      id: "unknown",
      stationId: "E6",
      walkingMetres: null,
      bearing: 0,
      rent: 21000,
    },
    {
      id: "near",
      stationId: "E6",
      walkingMetres: 100,
      bearing: 90,
      rent: 15000,
    },
    {
      id: "unassigned",
      stationId: null,
      walkingMetres: 0,
      bearing: 0,
      rent: 9000,
    },
  ];
  assert.deepEqual(
    offersByDistance(offers.slice(0, 3)).map((offer) => offer.id),
    ["near", "far", "unknown"],
  );
  assert.deepEqual(stationSummaries(offers), [
    { stationId: "E6", count: 3, lowestRent: 15000 },
  ]);
  assert.equal(nearestStationWithOffers("E5", offers)?.id, "E6");
  assert.equal(nearestStationWithOffers("E6", offers), null);
});
