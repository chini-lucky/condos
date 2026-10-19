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
