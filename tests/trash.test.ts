import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const client = (key = config.anonKey) =>
  createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
test("Trash is admin-only, recoverable and versioned, preserving facts and notes while blocking stale or child writes", async () => {
  const db = await admin();
  const service = client(config.serviceKey);
  const created = await db.rpc("create_offer_details", {
    p_name: "Trash backend offer",
    p_patch: { station_id: "E1", rent: 18000, agent_name: "Retained agent" },
  });
  assert.equal(created.error, null);
  const id = created.data.id;
  try {
    const changed = await db.rpc("update_offer_status", {
      p_id: id,
      p_expected_version: created.data.version,
      p_status: "Rejected",
      p_pending_explanation: null,
      p_rejection_reason: "Unavailable",
      p_viewing_at: "2020-01-01T10:00:00+07:00",
    });
    assert.equal(changed.error, null);
    const note = await db.rpc("create_offer_note", {
      p_offer_id: id,
      p_body: "Retained note",
    });
    assert.equal(note.error, null);
    const args = { p_id: id, p_expected_version: changed.data.version };
    assert.ok((await client().rpc("trash_offer", args)).error);
    const outsider = client();
    await outsider.auth.signInWithPassword({
      email: "outsider@condos.invalid",
      password: "Disposable-local-test-password-9!",
    });
    assert.ok((await outsider.rpc("trash_offer", args)).error);
    const trashed = await db.rpc("trash_offer", args);
    assert.equal(trashed.error, null);
    assert.ok(Date.parse(trashed.data.trashed_at));
    assert.equal(trashed.data.version, changed.data.version + 1);
    const reread = await db.from("offers").select("*").eq("id", id).single();
    assert.equal(reread.data.status, "Rejected");
    assert.equal(reread.data.station_id, "E1");
    assert.equal(reread.data.agent_name, "Retained agent");
    assert.equal(reread.data.rent, 18000);
    assert.ok(
      (
        await db.rpc("rename_offer", {
          p_id: id,
          p_name: "Stale",
          p_expected_version: changed.data.version,
        })
      ).error,
    );
    assert.ok(
      (
        await db.rpc("save_offer", {
          p_id: id,
          p_name: "Must stay trashed",
          p_expected_version: trashed.data.version,
          p_patch: {},
        })
      ).error,
    );
    assert.ok(
      (
        await db.rpc("update_offer_status", {
          p_id: id,
          p_expected_version: trashed.data.version,
          p_status: "Available",
          p_pending_explanation: null,
          p_rejection_reason: null,
          p_viewing_at: null,
        })
      ).error,
    );
    assert.ok(
      (
        await db.rpc("create_offer_note", {
          p_offer_id: id,
          p_body: "Not allowed",
        })
      ).error,
    );
    assert.ok(
      (
        await db.rpc("edit_offer_note", {
          p_id: note.data.id,
          p_expected_version: note.data.version,
          p_body: "Not allowed",
        })
      ).error,
    );
    assert.ok(
      (
        await db.rpc("delete_offer_note", {
          p_id: note.data.id,
          p_expected_version: note.data.version,
        })
      ).error,
    );
    assert.equal(
      (await db.from("offer_notes").select("body").eq("offer_id", id)).data?.[0]
        ?.body,
      "Retained note",
    );
    assert.ok((await db.rpc("restore_offer", args)).error);
    const restoreArgs = { p_id: id, p_expected_version: trashed.data.version };
    assert.ok((await outsider.rpc("restore_offer", restoreArgs)).error);
    const restored = await db.rpc("restore_offer", restoreArgs);
    assert.equal(restored.error, null);
    assert.equal(restored.data.trashed_at, null);
    assert.equal(restored.data.status, "Rejected");
    assert.equal(restored.data.rejection_reason, "Unavailable");
    assert.equal(restored.data.viewing_at, "2020-01-01T03:00:00+00:00");
    assert.equal(restored.data.version, trashed.data.version + 1);
    assert.ok(
      (
        await db.rpc("restore_offer", {
          p_id: id,
          p_expected_version: restored.data.version,
        })
      ).error,
    );
    assert.equal(
      (
        await db.rpc("edit_offer_note", {
          p_id: note.data.id,
          p_expected_version: note.data.version,
          p_body: "Editable after restore",
        })
      ).error,
      null,
    );
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
