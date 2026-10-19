import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { localConfig } from "./local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(config.url, config.serviceKey, options);
const admin = createClient(config.url, config.anonKey, options);
assert.equal(
  (
    await admin.auth.signInWithPassword({
      email: "chini-lucky@condos.invalid",
      password: "Disposable-local-test-password-9!",
    })
  ).error,
  null,
);
const offer = await admin.rpc("create_offer", {
  p_name: "Scheduled cleanup proof",
});
assert.equal(offer.error, null);
const id = offer.data.id;
const sql = (command: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_condos-local",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: command, stdio: ["pipe", "pipe", "pipe"] },
  );
try {
  const reserved = await admin.rpc("reserve_photos", {
    p_offer_id: id,
    p_count: 1,
    p_request_id: randomUUID(),
  });
  assert.equal(reserved.error, null);
  const photo = reserved.data[0];
  assert.equal(
    (await admin.rpc("cancel_photos", { p_ids: [photo.id] })).error,
    null,
  );
  const bytes = await readFile(
    new URL("../tests/fixtures/photos/oriented-gps.jpg", import.meta.url),
  );
  assert.equal(
    (
      await service.storage
        .from("offer-photos")
        .upload(photo.object_key, bytes, { contentType: "image/jpeg" })
    ).error,
    null,
  );
  // Prioritize only this proof job, so a backlog from other tests cannot delay it.
  await service
    .from("photo_cleanup")
    .update({ due_at: new Date(0).toISOString() })
    .eq("object_key", photo.object_key);
  sql(
    "select cron.alter_job((select jobid from cron.job where jobname = 'condos-photo-cleanup'), active := true);",
  );
  let done = false;
  for (let attempt = 0; attempt < 70; attempt++) {
    const job = await admin
      .from("photo_cleanup")
      .select("completed_at,last_error")
      .eq("object_key", photo.object_key)
      .single();
    if (job.data?.completed_at) {
      done = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(
    done,
    true,
    "pg_cron/pg_net did not complete queued cleanup within 70 seconds",
  );
  const objects = await service.storage
    .from("offer-photos")
    .list(id, { search: `${photo.id}.jpg` });
  assert.equal(objects.error, null);
  assert.deepEqual(objects.data, []);
  console.log(
    "Scheduled cleanup completed without an admin/browser request; underlying object is absent.",
  );
} finally {
  sql(
    "select cron.alter_job((select jobid from cron.job where jobname = 'condos-photo-cleanup'), active := false);",
  );
  await service.from("offers").delete().eq("id", id);
}
