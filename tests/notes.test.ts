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

test("note edits and deletion reject stale versions and unauthorized writes", async () => {
  const db = await signed();
  const other = await signed("outsider@condos.invalid");
  const created = await db.rpc("create_offer", {
    p_name: "Concurrent notes fixture",
  });
  try {
    const note = await db.rpc("create_offer_note", {
      p_offer_id: created.data.id,
      p_body: "Original",
    });
    const args = { p_id: note.data.id, p_expected_version: 1 };
    const updated = await db.rpc("edit_offer_note", {
      ...args,
      p_body: "Newer",
    });
    assert.equal(updated.error, null);
    assert.equal(updated.data.version, 2);
    assert.equal(updated.data.created_at, note.data.created_at);
    assert.ok(
      Date.parse(updated.data.updated_at) >= Date.parse(note.data.created_at),
    );
    assert.equal(
      (await db.rpc("edit_offer_note", { ...args, p_body: "Stale" })).error
        ?.code,
      "40001",
    );
    assert.equal(
      (await db.rpc("delete_offer_note", args)).error?.code,
      "40001",
    );
    for (const denied of [client(), other]) {
      assert.deepEqual((await denied.from("offer_notes").select("*")).data, []);
      assert.ok(
        (
          await denied.rpc("create_offer_note", {
            p_offer_id: created.data.id,
            p_body: "Intrusion",
          })
        ).error,
      );
      assert.ok(
        (await denied.rpc("edit_offer_note", { ...args, p_body: "Intrusion" }))
          .error,
      );
      assert.ok(
        (
          await denied.rpc("delete_offer_note", {
            ...args,
            p_expected_version: 2,
          })
        ).error,
      );
    }
    assert.ok(
      (
        await db
          .from("offer_notes")
          .update({ body: "Bypass" })
          .eq("id", note.data.id)
      ).error,
    );
    assert.ok(
      (await db.from("offer_notes").delete().eq("id", note.data.id)).error,
    );
    assert.ok(
      (
        await db.rpc("edit_offer_note", {
          ...args,
          p_expected_version: 2,
          p_body: " ",
        })
      ).error,
    );
    assert.equal(
      (await db.rpc("delete_offer_note", { ...args, p_expected_version: 2 }))
        .error,
      null,
    );
    assert.deepEqual(
      (await db.from("offer_notes").select("*").eq("offer_id", created.data.id))
        .data,
      [],
    );
  } finally {
    await client(config.serviceKey)
      .from("offers")
      .delete()
      .eq("id", created.data.id);
  }
});
