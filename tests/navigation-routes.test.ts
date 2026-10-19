import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRoute,
  routeHash,
  parentRoute,
} from "../src/offers/navigation.ts";
test("station, offer, add and edit deep links round-trip and Escape has a defined parent", () => {
  assert.deepEqual(parseRoute("#station=E6"), {
    kind: "list",
    stationId: "E6",
  });
  assert.deepEqual(parseRoute("#add-offer&station=E6"), {
    kind: "add",
    stationId: "E6",
  });
  assert.deepEqual(parseRoute("#thonglo"), { kind: "list", stationId: "E6" });
  assert.deepEqual(parseRoute("#edit-room"), { kind: "edit", id: "room" });
  assert.equal(
    routeHash({ kind: "detail", id: "one two" }),
    "#offer=one%20two",
  );
  assert.deepEqual(parentRoute({ kind: "edit", id: "x" }, "E6"), {
    kind: "detail",
    id: "x",
  });
  assert.deepEqual(parentRoute({ kind: "detail", id: "x" }, "E6"), {
    kind: "list",
    stationId: "E6",
  });
  assert.deepEqual(parseRoute("#station=missing"), {
    kind: "list",
    stationId: "missing",
  });
});
test("Trash retains its deep link and returns to overview", () => {
  assert.deepEqual(parseRoute("#trash"), { kind: "trash" });
  assert.equal(routeHash({ kind: "trash" }), "#trash");
  assert.deepEqual(parentRoute({ kind: "trash" }, "E6"), {
    kind: "list",
    stationId: null,
  });
});
