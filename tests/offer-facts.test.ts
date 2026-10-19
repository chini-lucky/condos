import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
test("optional facts preserve unknowns and studio zero, clear atomically, and reject invalid edits", async () => {
  const db = createClient(config.url, config.anonKey, options);
  assert.equal(
    (
      await db.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
    null,
  );
  const created = await db.rpc("create_offer", {
    p_name: "Facts boundary fixture",
  });
  assert.equal(created.error, null);
  const id = created.data.id;
  try {
    const facts = {
      rent: 25000,
      property_type: "condominium",
      size_sqm: 31.5,
      beds: 0,
      floor: -1,
      washer: true,
      garden: false,
      pool: null,
      microwave: true,
      extra_facilities: [" Balcony ", "Gym"],
    };
    const result = await db.rpc("save_offer", {
      p_id: id,
      p_expected_version: 1,
      p_name: "Facts changed",
      p_patch: facts,
    });
    assert.equal(result.error, null);
    for (const [key, value] of Object.entries({
      ...facts,
      extra_facilities: ["Balcony", "Gym"],
    }))
      assert.deepEqual(result.data[key], value);
    for (const patch of [
      { rent: 0 },
      { rent: -1 },
      { size_sqm: 0 },
      { beds: -1 },
      { beds: 0.5 },
      { floor: 1.5 },
      { property_type: "house" },
      { washer: "yes" },
      { extra_facilities: ["Gym", " gym "] },
      { extra_facilities: [" "] },
      { version: 88 },
    ]) {
      assert.ok(
        (
          await db.rpc("save_offer", {
            p_id: id,
            p_expected_version: 2,
            p_name: "Invalid",
            p_patch: patch,
          })
        ).error,
        JSON.stringify(patch),
      );
    }
    assert.equal(
      (
        await db.rpc("save_offer", {
          p_id: id,
          p_expected_version: 1,
          p_name: "Stale",
          p_patch: { rent: 30000 },
        })
      ).error?.code,
      "40001",
    );
    const cleared = await db.rpc("save_offer", {
      p_id: id,
      p_expected_version: 2,
      p_name: "Facts cleared",
      p_patch: Object.fromEntries(
        Object.keys(facts).map((key) => [
          key,
          key === "extra_facilities" ? [] : null,
        ]),
      ),
    });
    assert.equal(cleared.error, null);
    for (const key of Object.keys(facts))
      assert.deepEqual(
        cleared.data[key],
        key === "extra_facilities" ? [] : null,
      );
    const unknown = await db.from("offers").select("*").eq("id", id).single();
    assert.equal(unknown.data?.beds, null);
    const anonymous = createClient(config.url, config.anonKey, options);
    assert.ok(
      (
        await anonymous.rpc("save_offer", {
          p_id: id,
          p_expected_version: 3,
          p_name: "Intrusion",
          p_patch: {},
        })
      ).error,
    );
  } finally {
    await createClient(config.url, config.serviceKey, options)
      .from("offers")
      .delete()
      .eq("id", id);
  }
});
