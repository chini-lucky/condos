import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentInstant,
  appointmentInput,
  formatAppointment,
} from "../src/offers/appointments.ts";
test("Bangkok appointment input is an exact instant across midnight and never depends on device timezone", () => {
  assert.equal(
    appointmentInstant("2026-10-20T00:30"),
    "2026-10-19T17:30:00.000Z",
  );
  assert.equal(
    appointmentInput("2026-10-19T17:30:00.000Z"),
    "2026-10-20T00:30",
  );
  assert.match(
    formatAppointment("2026-10-19T17:30:00.000Z"),
    /20 Oct 2026.*00:30/,
  );
  assert.equal(appointmentInstant(""), null);
  assert.throws(() => appointmentInstant("2026-02-30T10:00"));
  assert.throws(() => appointmentInstant("2026-10-20T25:00"));
});
