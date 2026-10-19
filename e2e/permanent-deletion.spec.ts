import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("irreversible deletion is only in Trash, names its target, can be cancelled, and stays deleted after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Permanently removed browser offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Permanently removed browser offer",
      exact: true,
    }),
  ).toBeVisible();
  const link = page.url();
  await expect(
    page.getByRole("button", { name: "Delete permanently", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm move to Trash" }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Confirm permanent deletion" }),
  ).toContainText("Permanently removed browser offer");
  await expect(
    page.getByRole("group", { name: "Confirm permanent deletion" }),
  ).toContainText("cannot be restored");
  await page.getByRole("button", { name: "Cancel permanent deletion" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Permanently removed browser offer",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Permanently removed browser offer");
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Cleanup complete");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Permanently removed browser offer");
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Offer unavailable", exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const c = localConfig();
  await createClient(c.url, c.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Permanently removed browser offer");
});
