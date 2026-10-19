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

async function uploadReady(
  db: Awaited<ReturnType<typeof admin>>,
  offerId: string,
) {
  const reserved = await db.rpc("reserve_photos", {
    p_offer_id: offerId,
    p_count: 1,
    p_request_id: randomUUID(),
  });
  assert.equal(reserved.error, null);
  const photo = reserved.data[0];
  const jpeg = await readFile(
    new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
  );
  const token = (await db.auth.getSession()).data.session?.access_token;
  const response = await fetch(`${c.url}/functions/v1/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: c.anonKey,
      "Content-Type": "image/jpeg",
      "x-reservation-id": photo.id,
    },
    body: jpeg,
  });
  assert.equal(response.status, 200, await response.text());
  return { photo, jpeg };
}
test("permanent deletion cleans exact real Storage keys after failures, expired leases and late uploads without touching another offer", async () => {
  const db = await admin();
  const offer = await db.rpc("create_offer", {
      p_name: "Permanent photo boundary",
    }),
    other = await db.rpc("create_offer", {
      p_name: "Unrelated permanent photo boundary",
    });
  assert.equal(offer.error, null);
  assert.equal(other.error, null);
  const id = offer.data.id,
    otherId = other.data.id;
  const { runPhotoCleanup } =
    await import("../supabase/functions/_shared/cleanup.ts");
  try {
    const { photo, jpeg } = await uploadReady(db, id),
      unrelated = (await uploadReady(db, otherId)).photo;
    const reserved = await db.rpc("reserve_photos", {
      p_offer_id: id,
      p_count: 1,
      p_request_id: randomUUID(),
    });
    assert.equal(reserved.error, null);
    const late = reserved.data[0];
    const trash = await db.rpc("trash_offer", {
      p_id: id,
      p_expected_version: 1,
    });
    assert.equal(trash.error, null);
    const args = { p_id: id, p_expected_version: trash.data.version };
    const [first, second] = await Promise.all([
      db.rpc("permanently_delete_offer", args),
      db.rpc("permanently_delete_offer", args),
    ]);
    assert.equal(first.error, null);
    assert.equal(second.error, null);
    assert.equal(first.data.offer_id, second.data.offer_id);
    assert.equal(first.data.pending, 2);
    const assets = await db
      .from("photo_assets")
      .select("id,offer_id,state")
      .in("id", [photo.id, late.id]);
    assert.equal(assets.data?.length, 2);
    assert.ok(
      assets.data?.every((a) => a.offer_id === null && a.state === "deleting"),
    );
    assert.ok(
      (
        await db.storage
          .from("offer-photos")
          .createSignedUrl(photo.object_key, 60)
      ).error,
    );
    const interrupted = createClient(c.url, c.serviceKey, {
      ...options,
      global: {
        fetch: async (input, init) => {
          if (String(input).includes("/storage/v1/"))
            throw new TypeError("Temporary Storage interruption");
          return fetch(input, init);
        },
      },
    });
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("deletion_offer_id", id);
    await runPhotoCleanup(interrupted);
    let receipts = await db.rpc("list_offer_deletions");
    assert.equal(
      receipts.data.find((r: { offer_id: string }) => r.offer_id === id).failed,
      2,
    );
    assert.equal(
      (await service.storage.from("offer-photos").download(photo.object_key))
        .error,
      null,
    );
    assert.equal(
      (await db.rpc("retry_offer_deletion_cleanup", { p_id: id })).error,
      null,
    );
    // Model a worker dying after claiming: another worker waits for the exact lease to expire.
    await service
      .from("photo_cleanup")
      .update({
        due_at: new Date(0).toISOString(),
        lease_id: randomUUID(),
        lease_until: new Date(Date.now() + 120000).toISOString(),
      })
      .eq("deletion_offer_id", id);
    await runPhotoCleanup(service);
    assert.equal(
      (await service.storage.from("offer-photos").download(photo.object_key))
        .error,
      null,
    );
    await service
      .from("photo_cleanup")
      .update({ lease_until: new Date(0).toISOString() })
      .eq("deletion_offer_id", id);
    await runPhotoCleanup(service);
    assert.ok(
      (await service.storage.from("offer-photos").download(photo.object_key))
        .error,
    );
    assert.equal(
      (
        await service.storage
          .from("offer-photos")
          .download(unrelated.object_key)
      ).error,
      null,
    );
    receipts = await db.rpc("list_offer_deletions");
    assert.equal(
      receipts.data.find((r: { offer_id: string }) => r.offer_id === id)
        .pending,
      0,
    );
    // Bytes can arrive after the earlier removal; immutable tombstones must reopen cleanup.
    assert.equal(
      (
        await service.storage
          .from("offer-photos")
          .upload(late.object_key, jpeg, { contentType: "image/jpeg" })
      ).error,
      null,
    );
    assert.equal(
      (
        await service.rpc("finalize_photo", {
          p_id: late.id,
          p_bytes: jpeg.length,
          p_width: 120,
          p_height: 80,
        })
      ).data?.id ?? null,
      null,
    );
    await runPhotoCleanup(service);
    assert.ok(
      (await service.storage.from("offer-photos").download(late.object_key))
        .error,
    );
    assert.equal(
      (
        await service.storage
          .from("offer-photos")
          .download(unrelated.object_key)
      ).error,
      null,
    );
    assert.equal(
      (await db.rpc("permanently_delete_offer", args)).data.pending,
      0,
    );
  } finally {
    await service.from("offers").delete().in("id", [id, otherId]);
    await runPhotoCleanup(service);
  }
});
