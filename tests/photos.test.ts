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
    body: new Uint8Array(bytes),
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

async function cleanup(db: Awaited<ReturnType<typeof signedIn>>) {
  const session = await db.auth.getSession();
  return fetch(`${config.url}/functions/v1/photo-cleanup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token}`,
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
}
test("ingress rejects invalid content, dimensions and body size; stored object limits cannot be bypassed", async () => {
  const db = await signedIn();
  const offer = await db.rpc("create_offer", { p_name: "Invalid photos" });
  const id = offer.data.id;
  const { readFile } = await import("node:fs/promises");
  try {
    const cases = [
      { bytes: new Uint8Array([255, 216, 255, 217]), type: "image/jpeg" },
      {
        bytes: new Uint8Array(
          await readFile(
            new URL("./fixtures/photos/oversized.jpg", import.meta.url),
          ),
        ),
        type: "image/jpeg",
      },
      { bytes: new Uint8Array(10 * 1024 * 1024 + 1), type: "image/jpeg" },
      { bytes: new TextEncoder().encode("<svg></svg>"), type: "image/jpeg" },
      {
        bytes: new Uint8Array(
          await readFile(
            new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
          ),
        ),
        type: "image/png",
      },
    ];
    for (const input of cases) {
      const reservation = await db.rpc("reserve_photos", {
        p_offer_id: id,
        p_count: 1,
        p_request_id: randomUUID(),
      });
      assert.equal(reservation.error, null);
      const result = await upload(
        db,
        reservation.data[0].id,
        input.bytes,
        input.type,
      );
      assert.equal(result.status, 400);
      const asset = await db
        .from("photo_assets")
        .select("state")
        .eq("id", reservation.data[0].id)
        .single();
      assert.equal(asset.data?.state, "deleting");
      assert.equal(
        (
          await service.storage
            .from("offer-photos")
            .exists(reservation.data[0].object_key)
        ).data,
        false,
      );
    }
    const huge = await service.storage
      .from("offer-photos")
      .upload(`${id}/too-large.jpg`, new Uint8Array(10 * 1024 * 1024 + 1), {
        contentType: "image/jpeg",
      });
    assert.ok(huge.error);
    assert.equal((await cleanup(db)).status, 200);
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});
test("cleanup retries are observable and idempotent, and reconciliation removes late writes after cancellation and permanent deletion", async () => {
  const db = await signedIn();
  const offer = await db.rpc("create_offer", { p_name: "Cleanup races" });
  const id = offer.data.id;
  const { readFile } = await import("node:fs/promises");
  const bytes = new Uint8Array(
    await readFile(
      new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
    ),
  );
  try {
    const reserved = await db.rpc("reserve_photos", {
      p_offer_id: id,
      p_count: 2,
      p_request_id: randomUUID(),
    });
    assert.equal(reserved.error, null);
    const [first, late] = reserved.data;
    // Partial success while a sibling is cancelled: retain the completed attachment.
    assert.equal((await upload(db, first.id, bytes)).status, 200);
    assert.equal(
      (await db.rpc("cancel_photos", { p_ids: [late.id] })).error,
      null,
    );
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", late.object_key);
    const jobs = await service.rpc("claim_photo_cleanup", { p_limit: 1 });
    assert.equal(jobs.error, null);
    const job = jobs.data.find(
      (job: { object_key: string }) => job.object_key === late.object_key,
    );
    assert.ok(job);
    assert.equal(
      (
        await service.rpc("finish_photo_cleanup", {
          p_key: job.object_key,
          p_lease: job.lease_id,
          p_error: "Storage temporarily unavailable",
        })
      ).error,
      null,
    );
    const failure = await db
      .from("photo_cleanup")
      .select("attempts,last_error,completed_at")
      .eq("object_key", late.object_key)
      .single();
    assert.equal(failure.data?.last_error, "Storage temporarily unavailable");
    assert.equal(failure.data?.completed_at, null);
    // Simulate the retry's due time through the trusted test fixture boundary.
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", late.object_key);
    assert.equal((await cleanup(db)).status, 200);
    let status = await db
      .from("photo_cleanup")
      .select("completed_at,attempts,last_error")
      .eq("object_key", late.object_key)
      .single();
    assert.ok(status.data?.completed_at);
    assert.ok((status.data?.attempts ?? 0) >= 2);
    assert.equal(status.data?.last_error, null);
    // A request that was already in flight can finish after the absent-object delete.
    assert.equal(
      (
        await service.storage
          .from("offer-photos")
          .upload(late.object_key, bytes, { contentType: "image/jpeg" })
      ).error,
      null,
    );
    assert.equal(
      (
        await service.rpc("finalize_photo", {
          p_id: late.id,
          p_bytes: bytes.length,
          p_width: 40,
          p_height: 20,
        })
      ).data?.id,
      null,
    );
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", late.object_key);
    assert.equal((await cleanup(db)).status, 200);
    assert.equal(
      (await service.storage.from("offer-photos").exists(late.object_key)).data,
      false,
    );
    assert.equal(
      (await service.storage.from("offer-photos").exists(first.object_key))
        .data,
      true,
    );
    // Reconciliation also catches a later write when finalization never runs.
    assert.equal(
      (
        await service.storage
          .from("offer-photos")
          .upload(late.object_key, bytes, { contentType: "image/jpeg" })
      ).error,
      null,
    );
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", late.object_key);
    assert.equal((await cleanup(db)).status, 200);
    assert.equal(
      (await service.storage.from("offer-photos").exists(late.object_key)).data,
      false,
    );
    // Permanent offer deletion must retain a tombstone and durable cleanup work.
    await service.from("offers").delete().eq("id", id);
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", first.object_key);
    assert.equal((await cleanup(db)).status, 200);
    assert.equal(
      (await service.storage.from("offer-photos").exists(first.object_key))
        .data,
      false,
    );
    assert.equal((await cleanup(db)).status, 200);
    status = await db
      .from("photo_cleanup")
      .select("completed_at,attempts,last_error")
      .eq("object_key", first.object_key)
      .single();
    assert.ok(status.data?.completed_at);
    assert.equal(
      (
        await db
          .from("photo_assets")
          .select("state,offer_id")
          .eq("id", first.id)
          .single()
      ).data?.state,
      "deleting",
    );
  } finally {
    await service.from("offers").delete().eq("id", id);
  }
});

test("a full 1600-pixel noisy JPEG is validated and stored within the Edge resource envelope", async () => {
  const db = await signedIn();
  const offer = await db.rpc("create_offer", { p_name: "Bounded processing" });
  assert.equal(offer.error, null);
  try {
    const reserved = await db.rpc("reserve_photos", {
      p_offer_id: offer.data.id,
      p_count: 1,
      p_request_id: randomUUID(),
    });
    assert.equal(reserved.error, null);
    const { readFile } = await import("node:fs/promises");
    const bytes = new Uint8Array(
      await readFile(
        new URL("./fixtures/photos/bounded-noise.jpg", import.meta.url),
      ),
    );
    const result = await upload(db, reserved.data[0].id, bytes);
    assert.equal(result.status, 200, await result.text());
    const photo = await db
      .from("photo_assets")
      .select("width,height,byte_size")
      .eq("id", reserved.data[0].id)
      .single();
    assert.equal(photo.error, null);
    assert.equal(photo.data?.width, 1600);
    assert.equal(photo.data?.height, 1600);
    assert.ok((photo.data?.byte_size ?? Infinity) < 10 * 1024 * 1024);
  } finally {
    await service.from("offers").delete().eq("id", offer.data.id);
  }
});

test("cleanup retries a Storage transport failure while retaining real bytes, and rejects invalid scheduler secrets", async () => {
  const db = await signedIn();
  const { runPhotoCleanup } =
    await import("../supabase/functions/_shared/cleanup.ts");
  const key = `transport-${randomUUID()}/photo.jpg`;
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(
    new URL("./fixtures/photos/oriented-gps.jpg", import.meta.url),
  );
  assert.equal(
    (
      await service.storage
        .from("offer-photos")
        .upload(key, bytes, { contentType: "image/jpeg" })
    ).error,
    null,
  );
  assert.equal(
    (
      await service
        .from("photo_cleanup")
        .insert({ object_key: key, due_at: new Date(0).toISOString() })
    ).error,
    null,
  );
  const interrupted = createClient(config.url, config.serviceKey, {
    ...options,
    global: {
      fetch: async (input, init) => {
        // Fault injection is only at the external HTTP transport; SDK, SQL queue and
        // stored bytes are real. No application functions or collaborators are mocked.
        if (String(input).includes("/storage/v1/"))
          throw new TypeError("Storage transport interrupted");
        return fetch(input, init);
      },
    },
  });
  try {
    await runPhotoCleanup(interrupted);
    const status = await db
      .from("photo_cleanup")
      .select("attempts,last_error,completed_at,due_at")
      .eq("object_key", key)
      .single();
    assert.ok(status.data?.last_error);
    assert.equal(status.data?.completed_at, null);
    assert.equal(status.data?.attempts, 1);
    assert.ok(Date.parse(status.data?.due_at ?? "") > Date.now());
    assert.equal(
      (await service.storage.from("offer-photos").download(key)).error,
      null,
    );
    await service
      .from("photo_cleanup")
      .update({ due_at: new Date(0).toISOString() })
      .eq("object_key", key);
    await runPhotoCleanup(service);
    const success = await db
      .from("photo_cleanup")
      .select("completed_at,last_error,attempts")
      .eq("object_key", key)
      .single();
    assert.ok(success.data?.completed_at);
    assert.equal(success.data?.last_error, null);
    assert.equal(success.data?.attempts, 2);
    assert.ok((await service.storage.from("offer-photos").download(key)).error);
    for (const headers of [
      {},
      { "x-cleanup-secret": "" },
      { "x-cleanup-secret": "not-the-worker-secret" },
    ]) {
      assert.equal(
        (
          await fetch(`${config.url}/functions/v1/photo-cleanup`, {
            method: "POST",
            headers,
          })
        ).status,
        403,
      );
    }
  } finally {
    await service.storage.from("offer-photos").remove([key]);
    await service.from("photo_cleanup").delete().eq("object_key", key);
  }
});
