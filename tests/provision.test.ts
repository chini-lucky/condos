import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
test("trusted provisioning reuses the existing labelled credential file without disclosing its password", async () => {
  const folder = mkdtempSync(join(tmpdir(), "condos-provision-"));
  const file = join(folder, "admin.txt");
  const password = "Disposable-local-test-password-9!";
  const original = `Condos admin\nUsername: chini-lucky\nPassword: ${password}\n`;
  writeFileSync(file, original, { mode: 0o600 });
  try {
    const output = execFileSync(
      process.execPath,
      ["scripts/create-admin.ts", "local", file],
      { encoding: "utf8" },
    );
    assert.ok(!output.includes(password));
    assert.equal(readFileSync(file, "utf8"), original);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    const config = localConfig();
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal(
      (
        await client.auth.signInWithPassword({
          email: "chini-lucky@condos.invalid",
          password,
        })
      ).error,
      null,
    );
    assert.equal((await client.rpc("is_admin")).data, true);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
