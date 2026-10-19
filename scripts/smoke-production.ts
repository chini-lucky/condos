// Explicit operator-only smoke: no traces, screenshots, passwords or keys in output.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { production } from "./production-target.ts";
import { validatePublicConfig } from "./public-config.ts";
const file = process.env.CONDOS_ADMIN_PASSWORD_FILE;
if (!file)
  throw new Error(
    "Set CONDOS_ADMIN_PASSWORD_FILE to the existing private owner-only credential file.",
  );
if ((statSync(file).mode & 0o077) !== 0)
  throw new Error("Admin password file must be owner-only.");
const saved = readFileSync(file, "utf8").trim();
const labelled = saved
  .split(/\r?\n/)
  .find((line) => line.startsWith("Password:"));
const password = labelled ? labelled.slice("Password:".length).trim() : saved;
const raw: unknown = JSON.parse(
  execFileSync(
    "supabase",
    [
      "projects",
      "api-keys",
      "--project-ref",
      production.projectRef,
      "--reveal",
      "-o",
      "json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ),
);
function key(name: string) {
  if (!Array.isArray(raw)) throw new Error("API keys unavailable");
  const found: unknown = raw.find(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      item.name === name,
  );
  if (
    typeof found !== "object" ||
    found === null ||
    !("api_key" in found) ||
    typeof found.api_key !== "string"
  )
    throw new Error("Required project key unavailable");
  return found.api_key;
}
const url = `https://${production.projectRef}.supabase.co`;
const anonKey = key("anon");
validatePublicConfig(url, anonKey);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(url, anonKey, options);
const service = createClient(url, key("service_role"), options);
const name = `Deployment smoke ${randomUUID()}`,
  renamed = `${name} renamed`;
let stage = "verify anonymous denial";
let failed = false;
try {
  const denied = await anonymous.from("offers").select("id");
  if (denied.error || denied.data.length !== 0)
    throw new Error("Anonymous access policy failed");
  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  });
  const authSettings: unknown = await settings.json();
  if (
    typeof authSettings !== "object" ||
    authSettings === null ||
    !("disable_signup" in authSettings) ||
    authSettings.disable_signup !== true
  )
    throw new Error("Public registration must be disabled");
  if (process.argv.includes("--api-only")) {
    stage = "verify hosted API login and persistence";
    const client = createClient(url, anonKey, options);
    if (
      (
        await client.auth.signInWithPassword({
          email: "chini-lucky@condos.invalid",
          password,
        })
      ).error
    )
      throw new Error("Sign-in failed");
    const created = await client.rpc("create_offer", { p_name: name });
    if (created.error) throw new Error("Create failed");
    const value: unknown = created.data;
    if (
      typeof value !== "object" ||
      value === null ||
      !("id" in value) ||
      typeof value.id !== "string"
    )
      throw new Error("Invalid offer response");
    const read = await client
      .from("offers")
      .select("name")
      .eq("id", value.id)
      .single();
    if (read.error || read.data.name !== name)
      throw new Error("Persistence failed");
    const changed = await client.rpc("rename_offer", {
      p_id: value.id,
      p_name: renamed,
      p_expected_version: 1,
    });
    if (changed.error) throw new Error("Rename failed");
    await client.auth.signOut();
  } else {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      stage = "open hosted login";
      await page.goto(production.siteUrl, { waitUntil: "domcontentloaded" });
      await page.getByLabel("Username").waitFor({ timeout: 10000 });
      stage = "sign in";
      await page.getByLabel("Username").fill("chini-lucky");
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByRole("button", { name: "Sign out" }).waitFor();
      stage = "create hosted offer";
      await page
        .getByRole("button", { name: "Add offer", exact: true })
        .click();
      await page.getByLabel("Offer name").fill(name);
      await page.getByRole("button", { name: "Save offer" }).click();
      await page.getByRole("heading", { name, exact: true }).waitFor();
      stage = "reload direct offer link";
      const direct = page.url();
      await page.goto(direct, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name, exact: true }).waitFor();
      stage = "edit hosted offer";
      await page.getByRole("button", { name: "Edit offer" }).click();
      await page.getByLabel("Offer name").fill(renamed);
      await page.getByRole("button", { name: "Save offer" }).click();
      await page.getByRole("heading", { name: renamed, exact: true }).waitFor();
      stage = "sign out";
      await page.getByRole("button", { name: "Sign out" }).click();
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .waitFor();
    } finally {
      await browser.close();
    }
  }
  console.log(
    process.argv.includes("--api-only")
      ? "Hosted API smoke passed: admin login, create/read/edit, anonymous denial, registration disabled."
      : "Hosted browser smoke passed: sign-in, create, direct-link reload, edit, logout; anonymous denial and disabled registration verified.",
  );
} catch {
  failed = true;
  console.error(
    `Production smoke failed: ${stage}. Credentials and traces are suppressed.`,
  );
} finally {
  const cleanup = await service
    .from("offers")
    .delete()
    .in("name", [name, renamed]);
  if (cleanup.error) {
    failed = true;
    console.error(
      "Smoke cleanup failed; remove only Deployment smoke fixtures in trusted administration.",
    );
  }
}
if (failed) process.exitCode = 1;
