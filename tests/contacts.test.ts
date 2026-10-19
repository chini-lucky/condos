import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
test("contacts persist per offer, trim and clear independently, and reject unsafe identifiers atomically", async () => {
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
  const ids: string[] = [];
  try {
    const patch = {
      agent_name: "  Pim  ",
      agent_company: "  Homes  ",
      agent_phone: "+66 (81) 234-5678",
      agent_line: "@pim.homes",
      source_url: "https://example.com/listing?unit=1",
    };
    for (let index = 0; index < 2; index++) {
      const created = await db.rpc("create_offer_details", {
        p_name: "Contacts boundary fixture",
        p_patch: { ...patch, rent: 25000, station_id: "E6" },
      });
      assert.equal(created.error, null);
      ids.push(created.data.id);
      assert.equal(created.data.agent_name, "Pim");
      assert.equal(created.data.agent_company, "Homes");
      assert.equal(created.data.rent, 25000);
    }
    const id = ids[0];
    const saved = await db.rpc("save_offer", {
      p_id: id,
      p_name: "Contacts updated",
      p_expected_version: 1,
      p_patch: {
        agent_name: null,
        agent_company: " ",
        agent_phone: null,
        agent_line: null,
        source_url: null,
      },
    });
    assert.equal(saved.error, null);
    assert.equal(saved.data.version, 2);
    for (const key of Object.keys(patch)) assert.equal(saved.data[key], null);
    assert.equal(saved.data.station_id, "E6");
    assert.equal(saved.data.rent, 25000);
    const untouched = await db
      .from("offers")
      .select("agent_name,agent_phone,agent_line,source_url")
      .eq("id", ids[1])
      .single();
    assert.deepEqual(untouched.data, {
      agent_name: "Pim",
      agent_phone: patch.agent_phone,
      agent_line: patch.agent_line,
      source_url: patch.source_url,
    });
    for (const invalid of [
      { source_url: "javascript:alert(1)" },
      { source_url: "https://" },
      { source_url: "https://user:pass@example.com" },
      { agent_phone: "123;alert(1)" },
      { agent_line: "https://line.me/evil" },
      { agent_name: 99 },
    ]) {
      assert.ok(
        (
          await db.rpc("save_offer", {
            p_id: id,
            p_name: "Unsafe",
            p_expected_version: 2,
            p_patch: invalid,
          })
        ).error,
        JSON.stringify(invalid),
      );
    }
    assert.equal(
      (
        await db.rpc("save_offer", {
          p_id: id,
          p_name: "Stale",
          p_expected_version: 1,
          p_patch: { agent_name: "Stale" },
        })
      ).error?.code,
      "40001",
    );
    const anonymous = createClient(config.url, config.anonKey, options);
    assert.ok(
      (
        await anonymous.rpc("save_offer", {
          p_id: id,
          p_name: "Intrusion",
          p_expected_version: 2,
          p_patch: { agent_name: "Intrusion" },
        })
      ).error,
    );
  } finally {
    await createClient(config.url, config.serviceKey, options)
      .from("offers")
      .delete()
      .in("id", ids);
  }
});
