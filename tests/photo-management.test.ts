import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(config.url, config.serviceKey, options);
async function admin(email = "chini-lucky@condos.invalid") {
  const db = createClient(config.url, config.anonKey, options);
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
async function addPhotos(
  db: Awaited<ReturnType<typeof admin>>,
  offerId: string,
  count: number,
) {
  const reserved = await db.rpc("reserve_photos", {
    p_offer_id: offerId,
    p_count: count,
    p_request_id: randomUUID(),
  });
  assert.equal(reserved.error, null);
  const jpeg = await readFile(
    new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
  );
  const token = (await db.auth.getSession()).data.session?.access_token;
  for (const photo of reserved.data) {
    const response = await fetch(`${config.url}/functions/v1/upload-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
        "Content-Type": "image/jpeg",
        "x-reservation-id": photo.id,
      },
      body: jpeg,
    });
    assert.equal(response.status, 200, await response.text());
  }
  return reserved.data;
}
async function createPhotos(
  db: Awaited<ReturnType<typeof admin>>,
  count: number,
) {
  const offer = await db.rpc("create_offer", { p_name: "Managed photos" });
  assert.equal(offer.error, null);
  await addPhotos(db, offer.data.id, count);
  return offer.data.id;
}
test("photo reorder persists independently of cover and rejects stale, incomplete, duplicate and foreign-photo orders", async () => {
  const db = await admin(),
    id = await createPhotos(db, 3),
    other = await createPhotos(db, 1);
  try {
    const initial = await db.rpc("get_offer_photos", { p_offer_id: id });
    assert.equal(initial.error, null);
    const ids = initial.data.photos.map((photo: { id: string }) => photo.id);
    const reordered = await db.rpc("reorder_photos", {
      p_offer_id: id,
      p_expected_revision: initial.data.revision,
      p_ids: [ids[2], ids[0], ids[1]],
    });
    assert.equal(reordered.error, null);
    const fresh = await db.rpc("get_offer_photos", { p_offer_id: id });
    assert.deepEqual(
      fresh.data.photos.map((photo: { id: string }) => photo.id),
      [ids[2], ids[0], ids[1]],
    );
    assert.equal(fresh.data.cover_id, ids[0]);
    assert.equal(fresh.data.revision, initial.data.revision + 1);
    assert.equal(
      (
        await db.rpc("reorder_photos", {
          p_offer_id: id,
          p_expected_revision: initial.data.revision,
          p_ids: ids,
        })
      ).error?.code,
      "40001",
    );
    const foreign = await db.rpc("get_offer_photos", { p_offer_id: other });
    for (const invalid of [
      [ids[0]],
      [ids[0], ids[0], ids[2]],
      [ids[0], ids[1], foreign.data.photos[0].id],
    ]) {
      assert.ok(
        (
          await db.rpc("reorder_photos", {
            p_offer_id: id,
            p_expected_revision: fresh.data.revision,
            p_ids: invalid,
          })
        ).error,
      );
    }
    assert.deepEqual(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data,
      fresh.data,
    );
  } finally {
    await service.from("offers").delete().in("id", [id, other]);
  }
});
test("an explicitly chosen cover survives reorder and new uploads, including a previously reserved earlier photo", async () => {
  const db = await admin();
  const offer = await db.rpc("create_offer", { p_name: "Explicit cover" });
  assert.equal(offer.error, null);
  const id = offer.data.id;
  try {
    const earlier = await db.rpc("reserve_photos", {
      p_offer_id: id,
      p_count: 1,
      p_request_id: randomUUID(),
    });
    assert.equal(earlier.error, null);
    const added = await addPhotos(db, id, 2);
    const snapshot = await db.rpc("get_offer_photos", { p_offer_id: id });
    assert.equal(snapshot.error, null);
    const cover = await db.rpc("choose_photo_cover", {
      p_offer_id: id,
      p_expected_revision: snapshot.data.revision,
      p_photo_id: added[1].id,
    });
    assert.equal(cover.error, null);
    assert.equal(cover.data.cover_id, added[1].id);
    // Complete the lower-position reservation after the user deliberately chose another cover.
    const bytes = await readFile(
      new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
    );
    const token = (await db.auth.getSession()).data.session?.access_token;
    const uploaded = await fetch(`${config.url}/functions/v1/upload-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
        "Content-Type": "image/jpeg",
        "x-reservation-id": earlier.data[0].id,
      },
      body: bytes,
    });
    assert.equal(uploaded.status, 200);
    await addPhotos(db, id, 1);
    const fresh = await db.rpc("get_offer_photos", { p_offer_id: id });
    assert.equal(fresh.data.cover_id, added[1].id);
    const ids = fresh.data.photos.map((photo: { id: string }) => photo.id);
    const order = await db.rpc("reorder_photos", {
      p_offer_id: id,
      p_expected_revision: fresh.data.revision,
      p_ids: ids.reverse(),
    });
    assert.equal(order.error, null);
    assert.equal(order.data.cover_id, added[1].id);
    assert.equal(
      (await db.from("offers").select("version").eq("id", id).single()).data
        ?.version,
      1,
    );
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});

test("deleting a cover selects the first surviving photo, queues cleanup atomically and leaves a placeholder after the last removal", async () => {
  const db = await admin(),
    id = await createPhotos(db, 3);
  try {
    let snapshot = (await db.rpc("get_offer_photos", { p_offer_id: id })).data;
    const [first, second, third] = snapshot.photos;
    snapshot = (
      await db.rpc("choose_photo_cover", {
        p_offer_id: id,
        p_expected_revision: snapshot.revision,
        p_photo_id: third.id,
      })
    ).data;
    snapshot = (
      await db.rpc("reorder_photos", {
        p_offer_id: id,
        p_expected_revision: snapshot.revision,
        p_ids: [second.id, third.id, first.id],
      })
    ).data;
    const signed = await db.storage
      .from("offer-photos")
      .createSignedUrl(third.object_key, 300);
    assert.equal(signed.error, null);
    assert.ok(signed.data);
    const removed = await db.rpc("remove_photo", {
      p_offer_id: id,
      p_expected_revision: snapshot.revision,
      p_photo_id: third.id,
    });
    assert.equal(removed.error, null);
    assert.equal(removed.data.cover_id, second.id);
    assert.deepEqual(
      removed.data.photos.map((photo: { id: string }) => photo.id),
      [second.id, first.id],
    );
    assert.equal(
      (
        await db
          .from("photo_assets")
          .select("state")
          .eq("id", third.id)
          .single()
      ).data?.state,
      "deleting",
    );
    assert.ok(
      (
        await db.storage
          .from("offer-photos")
          .createSignedUrl(third.object_key, 60)
      ).error,
    );
    const job = await db
      .from("photo_cleanup")
      .select("completed_at")
      .eq("object_key", third.object_key)
      .single();
    assert.equal(job.error, null);
    assert.equal(job.data?.completed_at, null);
    // A real external Storage transport interruption cannot revive the removed reference.
    const { runPhotoCleanup } =
      await import("../supabase/functions/_shared/cleanup.ts");
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", third.object_key);
    const interrupted = createClient(config.url, config.serviceKey, {
      ...options,
      global: {
        fetch: async (input, init) => {
          if (String(input).includes("/storage/v1/"))
            throw new TypeError("Temporary Storage transport failure");
          return fetch(input, init);
        },
      },
    });
    await runPhotoCleanup(interrupted);
    const failed = await db
      .from("photo_cleanup")
      .select("last_error,completed_at")
      .eq("object_key", third.object_key)
      .single();
    assert.ok(failed.data?.last_error);
    assert.equal(failed.data?.completed_at, null);
    assert.equal(
      (await service.storage.from("offer-photos").download(third.object_key))
        .error,
      null,
    );
    assert.equal(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.length,
      2,
    );
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", third.object_key);
    await runPhotoCleanup(service);
    assert.ok(
      (await service.storage.from("offer-photos").download(third.object_key))
        .error,
    );
    assert.notEqual((await fetch(signed.data.signedUrl)).status, 200);
    assert.equal(
      (await service.storage.from("offer-photos").download(first.object_key))
        .error,
      null,
    );
    snapshot = removed.data;
    for (const photo of [...snapshot.photos]) {
      const next = await db.rpc("remove_photo", {
        p_offer_id: id,
        p_expected_revision: snapshot.revision,
        p_photo_id: photo.id,
      });
      assert.equal(next.error, null);
      snapshot = next.data;
    }
    assert.deepEqual(snapshot.photos, []);
    assert.equal(snapshot.cover_id, null);
    assert.equal(
      (
        await db
          .from("offers")
          .select("photo_cover_explicit")
          .eq("id", id)
          .single()
      ).data?.photo_cover_explicit,
      false,
    );
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
test("photo mutations enforce identity, offer ownership and revisions, and reject every user command after Trash", async () => {
  const db = await admin(),
    id = await createPhotos(db, 2),
    other = await createPhotos(db, 1);
  try {
    const initial = (await db.rpc("get_offer_photos", { p_offer_id: id })).data;
    const ids = initial.photos.map((photo: { id: string }) => photo.id);
    const foreign = (await db.rpc("get_offer_photos", { p_offer_id: other }))
      .data.photos[0].id;
    for (const command of ["choose_photo_cover", "remove_photo"]) {
      assert.ok(
        (
          await db.rpc(command, {
            p_offer_id: id,
            p_expected_revision: initial.revision,
            p_photo_id: foreign,
          })
        ).error,
      );
    }
    const anon = createClient(config.url, config.anonKey, options),
      outsider = await admin("outsider@condos.invalid");
    for (const denied of [anon, outsider]) {
      for (const command of ["choose_photo_cover", "remove_photo"])
        assert.ok(
          (
            await denied.rpc(command, {
              p_offer_id: id,
              p_expected_revision: initial.revision,
              p_photo_id: ids[0],
            })
          ).error,
        );
      assert.ok(
        (
          await denied.rpc("reorder_photos", {
            p_offer_id: id,
            p_expected_revision: initial.revision,
            p_ids: ids,
          })
        ).error,
      );
      assert.ok(
        (
          await denied.rpc("lock_photo_offer", {
            p_offer_id: id,
            p_expected_revision: initial.revision,
          })
        ).error,
      );
    }
    assert.equal(
      (await outsider.rpc("get_offer_photos", { p_offer_id: id })).data,
      null,
    );
    const second = await admin();
    const concurrent = await Promise.all([
      db.rpc("choose_photo_cover", {
        p_offer_id: id,
        p_expected_revision: initial.revision,
        p_photo_id: ids[0],
      }),
      second.rpc("remove_photo", {
        p_offer_id: id,
        p_expected_revision: initial.revision,
        p_photo_id: ids[1],
      }),
    ]);
    assert.equal(concurrent.filter((result) => !result.error).length, 1);
    assert.equal(
      concurrent.find((result) => result.error)?.error?.code,
      "40001",
    );
    const fresh = (await db.rpc("get_offer_photos", { p_offer_id: id })).data;
    assert.equal(fresh.revision, initial.revision + 1);
    assert.equal(
      (
        await db.rpc("remove_photo", {
          p_offer_id: id,
          p_expected_revision: initial.revision,
          p_photo_id: ids[0],
        })
      ).error?.code,
      "40001",
    );
    const offer = (
      await db.from("offers").select("version").eq("id", id).single()
    ).data;
    assert.equal(
      (
        await db.rpc("trash_offer", {
          p_id: id,
          p_expected_version: offer?.version,
        })
      ).error,
      null,
    );
    for (const command of ["choose_photo_cover", "remove_photo"])
      assert.equal(
        (
          await db.rpc(command, {
            p_offer_id: id,
            p_expected_revision: fresh.revision,
            p_photo_id: ids[0],
          })
        ).error?.code,
        "40001",
      );
    assert.equal(
      (
        await db.rpc("reorder_photos", {
          p_offer_id: id,
          p_expected_revision: fresh.revision,
          p_ids: fresh.photos.map((photo: { id: string }) => photo.id),
        })
      ).error?.code,
      "40001",
    );
    assert.equal(
      (await db.rpc("cancel_photos", { p_ids: ids })).error?.code,
      "40001",
    );
    assert.deepEqual(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data,
      fresh,
    );
  } finally {
    await service.from("offers").delete().in("id", [id, other]);
  }
});
