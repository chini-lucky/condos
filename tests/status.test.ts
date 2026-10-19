import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const client = (key = config.anonKey) =>
  createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
test("admin freely changes status and optional explanations/appointments, with stale writes and unauthorized calls rejected", async () => {
  const db = client();
  await db.auth.signInWithPassword({
    email: "chini-lucky@condos.invalid",
    password: "Disposable-local-test-password-9!",
  });
  const created = await db.rpc("create_offer", {
    p_name: "Status boundary fixture",
  });
  assert.equal(created.error, null);
  const id = created.data.id;
  let version = created.data.version;
  const args = (status: string, expected = version) => ({
    p_id: id,
    p_expected_version: expected,
    p_status: status,
    p_pending_explanation: null,
    p_rejection_reason: null,
    p_viewing_at: null,
  });
  try {
    for (const status of [
      "Available",
      "Viewing",
      "Rejected",
      "Pending",
      "Rejected",
      "Available",
    ]) {
      const saved = await db.rpc("update_offer_status", args(status));
      assert.equal(saved.error, null);
      assert.equal(saved.data.status, status);
      assert.equal(saved.data.viewing_at, null);
      assert.equal(saved.data.version, ++version);
    }
    const booked = await db.rpc("update_offer_status", {
      ...args("Viewing"),
      p_viewing_at: "2020-01-01T10:00:00+07:00",
      p_pending_explanation: "Waiting for reply",
      p_rejection_reason: "Too small",
    });
    assert.equal(booked.error, null);
    version++;
    assert.equal(booked.data.status, "Viewing");
    assert.equal(booked.data.viewing_at, "2020-01-01T03:00:00+00:00");
    assert.equal(booked.data.pending_explanation, "Waiting for reply");
    assert.equal(booked.data.rejection_reason, "Too small");
    const stale = await db.rpc("update_offer_status", args("Rejected", 1));
    assert.equal(stale.error?.code, "40001");
    assert.ok((await db.rpc("update_offer_status", args("Imaginary"))).error);
    assert.ok(
      (
        await db.rpc("update_offer_status", {
          ...args("Viewing"),
          p_viewing_at: "infinity",
        })
      ).error,
    );
    const cleared = await db.rpc("update_offer_status", args("Viewing"));
    assert.equal(cleared.error, null);
    version++;
    const reread = await db.from("offers").select("*").eq("id", id).single();
    assert.equal(reread.data.viewing_at, null);
    assert.equal(reread.data.pending_explanation, null);
    assert.equal(reread.data.status, "Viewing");
    assert.ok(
      (await client().rpc("update_offer_status", args("Rejected"))).error,
    );
    const outsider = client();
    await outsider.auth.signInWithPassword({
      email: "outsider@condos.invalid",
      password: "Disposable-local-test-password-9!",
    });
    assert.ok(
      (await outsider.rpc("update_offer_status", args("Rejected"))).error,
    );
    assert.ok(
      (await db.from("offers").update({ status: "Rejected" }).eq("id", id))
        .error,
    );
  } finally {
    await client(config.serviceKey).from("offers").delete().eq("id", id);
  }
});
