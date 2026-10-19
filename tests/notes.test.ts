import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const client = (key = config.anonKey) =>
  createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
async function signed(email = "chini-lucky@condos.invalid") {
  const db = client();
  assert.equal(
    (
      await db.auth.signInWithPassword({
        email,
        password: "Disposable-local-test-password-9!",
      })
    ).error,
    null,
  );
  return db;
}
test("notes persist independently per offer with server timestamps and reject blank bodies", async () => {
  const db = await signed();
  const first = await db.rpc("create_offer", { p_name: "Notes fixture" });
  const second = await db.rpc("create_offer", {
    p_name: "Other notes fixture",
  });
  try {
    const created = await db.rpc("create_offer_note", {
      p_offer_id: first.data.id,
      p_body: "  Call agent tomorrow  ",
    });
    assert.equal(created.error, null);
    assert.equal(created.data.body, "Call agent tomorrow");
    assert.equal(created.data.version, 1);
    assert.ok(Date.parse(created.data.created_at));
    assert.equal(created.data.updated_at, created.data.created_at);
    const read = await db
      .from("offer_notes")
      .select("*")
      .eq("offer_id", first.data.id);
    assert.equal(read.data?.[0].id, created.data.id);
    assert.deepEqual(
      (await db.from("offer_notes").select("*").eq("offer_id", second.data.id))
        .data,
      [],
    );
    assert.ok(
      (
        await db.rpc("create_offer_note", {
          p_offer_id: first.data.id,
          p_body: "\t\n\u00a0",
        })
      ).error,
    );
  } finally {
    await client(config.serviceKey)
      .from("offers")
      .delete()
      .in("id", [first.data.id, second.data.id]);
  }
});
