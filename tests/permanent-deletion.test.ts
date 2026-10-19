import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const c = localConfig(),
  options = { auth: { persistSession: false, autoRefreshToken: false } },
  service = createClient(c.url, c.serviceKey, options);
async function admin(email = "chini-lucky@condos.invalid") {
  const db = createClient(c.url, c.anonKey, options);
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
test("permanent deletion requires confirmed current Trash, cascades notes, and retains an idempotent cleanup receipt", async () => {
  const db = await admin();
  const offer = await db.rpc("create_offer", {
    p_name: "Permanent deletion boundary",
  });
  assert.equal(offer.error, null);
  const id = offer.data.id;
  try {
    assert.ok(
      (
        await db.rpc("permanently_delete_offer", {
          p_id: id,
          p_expected_version: 1,
        })
      ).error,
    );
    const note = await db.rpc("create_offer_note", {
      p_offer_id: id,
      p_body: "Must cascade",
    });
    assert.equal(note.error, null);
    const trash = await db.rpc("trash_offer", {
      p_id: id,
      p_expected_version: 1,
    });
    assert.equal(trash.error, null);
    const args = { p_id: id, p_expected_version: trash.data.version };
    const outsider = await admin("outsider@condos.invalid");
    assert.ok((await outsider.rpc("permanently_delete_offer", args)).error);
    assert.ok(
      (
        await createClient(c.url, c.anonKey, options).rpc(
          "permanently_delete_offer",
          args,
        )
      ).error,
    );
    assert.equal(
      (
        await db.rpc("permanently_delete_offer", {
          ...args,
          p_expected_version: 1,
        })
      ).error?.code,
      "40001",
    );
    const deleted = await db.rpc("permanently_delete_offer", args);
    assert.equal(deleted.error, null);
    assert.equal(deleted.data.offer_id, id);
    assert.equal(deleted.data.name, "Permanent deletion boundary");
    assert.equal(deleted.data.pending, 0);
    assert.equal(
      (await db.from("offers").select("*").eq("id", id)).data?.length,
      0,
    );
    assert.equal(
      (await db.from("offer_notes").select("*").eq("offer_id", id)).data
        ?.length,
      0,
    );
    assert.deepEqual(
      (await db.rpc("permanently_delete_offer", args)).data,
      deleted.data,
    );
    assert.ok((await db.rpc("restore_offer", args)).error);
    assert.ok(
      (
        await db.rpc("save_offer", {
          ...args,
          p_name: "Resurrect",
          p_patch: {},
        })
      ).error,
    );
    assert.ok(
      (await db.rpc("create_offer_note", { p_offer_id: id, p_body: "Orphan" }))
        .error,
    );
    assert.ok(
      (
        await db.rpc("reserve_photos", {
          p_offer_id: id,
          p_count: 1,
          p_request_id: randomUUID(),
        })
      ).error,
    );
    assert.deepEqual((await outsider.rpc("list_offer_deletions")).data, []);
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
