import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const service = createClient(config.url, config.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function admin() {
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.equal(
    (
      await client.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
    null,
  );
  return client;
}
test("station, walking distance and bearing persist independently and clear without fabricated positions", async () => {
  const db = await admin();
  const created = await db.rpc("create_offer_details", {
    p_name: "Location boundary fixture",
    p_patch: { station_id: "E6", walking_metres: null, bearing: 0 },
  });
  assert.equal(created.error, null);
  const id = created.data.id;
  try {
    assert.equal(created.data.station_id, "E6");
    assert.equal(created.data.walking_metres, null);
    assert.equal(created.data.bearing, 0);
    const saved = await db.rpc("save_offer", {
      p_id: id,
      p_expected_version: 1,
      p_name: "Changed location fixture",
      p_patch: { station_id: "N5", walking_metres: 800, bearing: 90 },
    });
    assert.equal(saved.error, null);
    assert.equal(saved.data.version, 2);
    const stale = await db.rpc("save_offer", {
      p_id: id,
      p_expected_version: 1,
      p_name: "Stale location fixture",
      p_patch: { station_id: "E9" },
    });
    assert.equal(stale.error?.code, "40001");
    const cleared = await db.rpc("save_offer", {
      p_id: id,
      p_expected_version: 2,
      p_name: "Cleared location fixture",
      p_patch: { station_id: null, walking_metres: null, bearing: null },
    });
    assert.equal(cleared.error, null);
    const reread = await db
      .from("offers")
      .select("station_id,walking_metres,bearing")
      .eq("id", id)
      .single();
    assert.deepEqual(reread.data, {
      station_id: null,
      walking_metres: null,
      bearing: null,
    });
    for (const patch of [
      { station_id: "missing" },
      { walking_metres: -1 },
      { bearing: 360 },
      { bearing: -1 },
      { version: 99 },
    ]) {
      assert.ok(
        (
          await db.rpc("save_offer", {
            p_id: id,
            p_expected_version: 3,
            p_name: "Invalid location fixture",
            p_patch: patch,
          })
        ).error,
      );
    }
    assert.ok(
      (
        await createClient(config.url, config.anonKey).rpc("save_offer", {
          p_id: id,
          p_expected_version: 3,
          p_name: "Unauthorized",
          p_patch: {},
        })
      ).error,
    );
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
