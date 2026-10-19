import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
function client(key = config.anonKey) {
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function admin() {
  const db = client();
  assert.equal(
    (
      await db.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
    null,
  );
  return db;
}
test("an admin creates distinct name-only offers, while unknown facts stay absent and non-admin access is denied", async () => {
  const db = await admin();
  const ids: string[] = [];
  try {
    for (let index = 0; index < 2; index++) {
      const result = await db.rpc("create_offer", {
        p_name: "  Riverside offer  ",
      });
      assert.equal(result.error, null);
      const offer = result.data;
      assert.equal(offer.name, "Riverside offer");
      assert.equal(offer.status, "Pending");
      assert.equal(offer.version, 1);
      assert.ok(Date.parse(offer.created_at));
      assert.equal(offer.updated_at, offer.created_at);
      ids.push(offer.id);
    }
    assert.notEqual(ids[0], ids[1]);
    const reread = await db.from("offers").select("*").in("id", ids);
    assert.equal(reread.error, null);
    assert.equal(reread.data?.length, 2);
    assert.ok((await db.rpc("create_offer", { p_name: "   " })).error);
    assert.deepEqual((await client().from("offers").select("*")).data, []);
    assert.ok(
      (await client().rpc("create_offer", { p_name: "intrusion" })).error,
    );
    const outsider = client();
    assert.equal(
      (
        await outsider.auth.signInWithPassword({
          email: "outsider@condos.invalid",
          password: "Disposable-local-test-password-9!",
        })
      ).error,
      null,
    );
    assert.deepEqual((await outsider.from("offers").select("*")).data, []);
    assert.ok(
      (await outsider.rpc("create_offer", { p_name: "intrusion" })).error,
    );
  } finally {
    await client(config.serviceKey).from("offers").delete().in("id", ids);
  }
});
