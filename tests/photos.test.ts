import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(config.url, config.serviceKey, options);
async function signedIn(email = "chini-lucky@condos.invalid") {
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
test("photo reservations serialize concurrent attempts at twenty, preserve selection order, and reject bypasses", async () => {
  const db = await signedIn();
  const created = await db.rpc("create_offer", { p_name: "Photo concurrency" });
  assert.equal(created.error, null);
  const id = created.data.id;
  try {
    const request = randomUUID();
    const first = await db.rpc("reserve_photos", {
      p_offer_id: id,
      p_count: 19,
      p_request_id: request,
    });
    assert.equal(first.error, null);
    assert.equal(first.data.length, 19);
    assert.deepEqual(
      first.data.map((photo: { position: number }) => photo.position),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    );
    assert.deepEqual(
      (
        await db.rpc("reserve_photos", {
          p_offer_id: id,
          p_count: 19,
          p_request_id: request,
        })
      ).data,
      first.data,
    );
    const concurrent = await Promise.all(
      [1, 2].map(() =>
        db.rpc("reserve_photos", {
          p_offer_id: id,
          p_count: 1,
          p_request_id: randomUUID(),
        }),
      ),
    );
    assert.equal(
      concurrent.filter((result) => result.error === null).length,
      1,
    );
    assert.ok(
      (
        await db
          .from("photo_assets")
          .insert({ offer_id: id, object_key: "bypass.jpg" })
      ).error,
    );
    assert.ok(
      (
        await db.storage
          .from("offer-photos")
          .upload("bypass.jpg", new Uint8Array([255, 216, 255, 217]), {
            contentType: "image/jpeg",
          })
      ).error,
    );
    const outsider = await signedIn("outsider@condos.invalid");
    assert.deepEqual(
      (await outsider.from("photo_assets").select("*")).data,
      [],
    );
    assert.ok(
      (
        await outsider.rpc("reserve_photos", {
          p_offer_id: id,
          p_count: 1,
          p_request_id: randomUUID(),
        })
      ).error,
    );
    const anon = createClient(config.url, config.anonKey, options);
    assert.deepEqual((await anon.from("photo_assets").select("*")).data, []);
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});

async function upload(
  db: Awaited<ReturnType<typeof signedIn>>,
  id: string,
  bytes: Uint8Array,
  type = "image/jpeg",
) {
  const session = await db.auth.getSession();
  return fetch(`${config.url}/functions/v1/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token}`,
      apikey: config.anonKey,
      "Content-Type": type,
      "x-reservation-id": id,
    },
    body: bytes,
  });
}
test("real JPEG ingress strips metadata, persists private ordered attachments and issues expiring signed reads", async () => {
  const db = await signedIn();
  const offer = await db.rpc("create_offer", { p_name: "Private photos" });
  assert.equal(offer.error, null);
  const id = offer.data.id;
  try {
    const reserved = await db.rpc("reserve_photos", {
      p_offer_id: id,
      p_count: 2,
      p_request_id: randomUUID(),
    });
    assert.equal(reserved.error, null);
    const { readFile } = await import("node:fs/promises");
    const jpeg = new Uint8Array(
      await readFile(
        new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
      ),
    );
    // Finish second first: order and initial cover must still follow selection.
    for (const photo of [...reserved.data].reverse()) {
      const result = await upload(db, photo.id, jpeg);
      assert.equal(result.status, 200, await result.text());
    }
    const photos = await db
      .from("photo_assets")
      .select("*")
      .eq("offer_id", id)
      .eq("state", "ready")
      .order("position");
    assert.deepEqual(
      photos.data?.map((photo) => photo.id),
      reserved.data.map((photo: { id: string }) => photo.id),
    );
    const fresh = await db
      .from("offers")
      .select("cover_photo_id,version")
      .eq("id", id)
      .single();
    assert.equal(fresh.data?.cover_photo_id, reserved.data[0].id);
    assert.equal(fresh.data?.version, 1);
    const key = reserved.data[0].object_key;
    const signed = await db.storage
      .from("offer-photos")
      .createSignedUrl(key, 1);
    assert.equal(signed.error, null);
    assert.ok(signed.data);
    const stored = await fetch(signed.data.signedUrl);
    assert.equal(stored.status, 200);
    const output = Buffer.from(await stored.arrayBuffer());
    assert.equal(output.includes(Buffer.from("Exif")), false);
    assert.equal(output.includes(Buffer.from("GPS")), false);
    const outsider = await signedIn("outsider@condos.invalid");
    assert.ok(
      (await outsider.storage.from("offer-photos").createSignedUrl(key, 60))
        .error,
    );
    assert.ok(
      (
        await createClient(config.url, config.anonKey, options)
          .storage.from("offer-photos")
          .download(key)
      ).error,
    );
    assert.notEqual(
      (
        await fetch(
          `${config.url}/storage/v1/object/public/offer-photos/${key}`,
        )
      ).status,
      200,
    );
    await new Promise((resolve) => setTimeout(resolve, 2100));
    assert.notEqual((await fetch(signed.data.signedUrl)).status, 200);
    const renewed = await db.storage
      .from("offer-photos")
      .createSignedUrl(key, 60);
    assert.equal(renewed.error, null);
    assert.equal((await fetch(renewed.data?.signedUrl ?? "")).status, 200);
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
