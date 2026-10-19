import { test, expect } from "@playwright/test";
const password = "Disposable-local-test-password-9!";
test("admin signs in, stays signed in after reload, and signs out", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("invalid credentials show a useful error and retain the entered username", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Username or password is incorrect.",
  );
  await expect(page.getByLabel("Username")).toHaveValue("chini-lucky");
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test("signing out in another tab removes access from the open app", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  const other = await context.newPage();
  await other.goto("./");
  await other.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("an expired session refreshes, then returns to login when its refresh permission is revoked", async ({
  page,
}) => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  // Operate at the external SDK's persisted session boundary to simulate time passing.
  async function expireSession() {
    return page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([key]) =>
        key.endsWith("-auth-token"),
      );
      if (!entry) throw new Error("No persisted session");
      const value: unknown = JSON.parse(entry[1]);
      if (
        typeof value !== "object" ||
        value === null ||
        !("access_token" in value) ||
        typeof value.access_token !== "string"
      )
        throw new Error("Invalid session");
      Object.assign(value, { expires_at: Math.floor(Date.now() / 1000) - 120 });
      localStorage.setItem(entry[0], JSON.stringify(value));
      return String(value.access_token);
    });
  }
  await expireSession();
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  const token = await expireSession();
  const config = localConfig();
  const service = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect((await service.auth.admin.signOut(token, "global")).error).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
