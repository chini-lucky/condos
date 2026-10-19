import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(config.url, config.serviceKey, options);
const password = "Disposable-local-test-password-9!";
export const testPassword = password;
async function identity(email: string) {
  const listed = await service.auth.admin.listUsers();
  const existing = listed.data.users.find((user) => user.email === email);
  const result = existing
    ? await service.auth.admin.updateUserById(existing.id, { password })
    : await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
  assert.equal(result.error, null);
  assert.ok(result.data.user);
  return result.data.user;
}
test("only the provisioned admin can access the private admin identity; nobody can self-enrol", async () => {
  const admin = await identity("chini-lucky@condos.invalid");
  const outsider = await identity("outsider@condos.invalid");
  const saved = await service
    .from("admin_identity")
    .upsert({ singleton: true, user_id: admin.id });
  assert.equal(saved.error, null);
  const anonymous = createClient(config.url, config.anonKey, options);
  assert.deepEqual(
    (await anonymous.from("admin_identity").select("user_id")).data,
    [],
  );
  for (const [email, expected] of [
    ["chini-lucky@condos.invalid", [admin.id]],
    ["outsider@condos.invalid", []],
  ] as const) {
    const client = createClient(config.url, config.anonKey, options);
    assert.equal(
      (await client.auth.signInWithPassword({ email, password })).error,
      null,
    );
    const read = await client.from("admin_identity").select("user_id");
    assert.equal(read.error, null);
    assert.deepEqual(
      read.data?.map((row) => row.user_id),
      expected,
    );
    assert.equal(
      (await client.rpc("is_admin")).data,
      email === "chini-lucky@condos.invalid",
    );
    assert.ok(
      (await client.from("admin_identity").insert({ user_id: outsider.id }))
        .error,
    );
  }
  assert.ok(
    (
      await anonymous.auth.signUp({
        email: "uninvited@condos.invalid",
        password,
      })
    ).error,
  );
});
