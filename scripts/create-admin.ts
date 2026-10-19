// Trusted CLI only: service keys never reach the frontend or saved environment.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "./local-config.ts";
const [target, fileArg] = process.argv.slice(2);
if (!target || !fileArg)
  throw new Error(
    "Usage: node scripts/create-admin.ts local|project-ref /outside/repo/password.txt",
  );
const file = resolve(fileArg);
const repo = realpathSync(resolve(import.meta.dirname, ".."));
const physicalFile = resolve(
  realpathSync(dirname(file)),
  file.split("/").at(-1) ?? "",
);
const inside = relative(repo, physicalFile);
if (!inside.startsWith("..") && !isAbsolute(inside))
  throw new Error("Password file must be outside the repository");
let password: string;
try {
  const info = statSync(file);
  if (
    !info.isFile() ||
    (info.mode & 0o077) !== 0 ||
    realpathSync(file) !== physicalFile
  )
    throw new Error(
      "Password file must be a regular owner-only file, without symlinks",
    );
  const saved = readFileSync(file, "utf8").trim();
  // Accept the labelled file already generated during project planning.
  const labelled = saved
    .split(/\r?\n/)
    .find((line) => line.startsWith("Password:"));
  password = labelled ? labelled.slice("Password:".length).trim() : saved;
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw error;
  password = randomBytes(32).toString("base64url");
  writeFileSync(file, `${password}\n`, { flag: "wx", mode: 0o600 });
}
if (password.length < 24 || /\s/.test(password))
  throw new Error("Password file must contain one long password only");
let url: string;
let serviceKey: string;
if (target === "local") ({ url, serviceKey } = localConfig());
else {
  if (!/^[a-z]{20}$/.test(target))
    throw new Error("Invalid Supabase project reference");
  const keys: unknown = JSON.parse(
    execFileSync(
      "supabase",
      [
        "projects",
        "api-keys",
        "--project-ref",
        target,
        "--reveal",
        "-o",
        "json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );
  if (!Array.isArray(keys)) throw new Error("Unexpected API key response");
  const key: unknown = keys.find(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      item.name === "service_role",
  );
  if (
    typeof key !== "object" ||
    key === null ||
    !("api_key" in key) ||
    typeof key.api_key !== "string"
  )
    throw new Error("Service role key unavailable");
  url = `https://${target}.supabase.co`;
  serviceKey = key.api_key;
}
const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = "chini-lucky@condos.invalid";
const users = await client.auth.admin.listUsers();
if (users.error) throw new Error("Could not inspect existing admin");
const existing = users.data.users.find((user) => user.email === email);
const result = existing
  ? await client.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
  : await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
if (result.error || !result.data.user)
  throw new Error("Could not provision admin identity");
const saved = await client
  .from("admin_identity")
  .upsert({ singleton: true, user_id: result.data.user.id });
if (saved.error)
  throw new Error(
    "Admin account exists but access registration failed; fix migration and rerun",
  );
console.log(`Provisioned chini-lucky; password retained only in ${file}`);
