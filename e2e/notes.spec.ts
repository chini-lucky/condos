import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function create(page: Page) {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Notes browser fixture");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Notes browser fixture", exact: true }),
  ).toBeVisible();
}
test("notes timeline supports persistent composer, inline editing and confirmed deletion", async ({
  page,
}) => {
  await create(page);
  await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
  await page.getByLabel("New note").fill("   ");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a note");
  await page.getByLabel("New note").fill("Call agent tomorrow");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notes (1)" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Call agent tomorrow", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page.getByLabel("Edit note text").fill("Cancelled change");
  await page.getByLabel("Edit note text").press("Escape");
  await expect(
    page.getByText("Call agent tomorrow", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page.getByLabel("Edit note text").fill("Viewing confirmed");
  await page.getByLabel("Edit note text").press("Enter");
  await expect(
    page.getByText("Viewing confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page.getByRole("button", { name: "Keep note", exact: true }).click();
  await expect(
    page.getByText("Viewing confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete note", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
});
test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const c = localConfig();
  const result = await createClient(c.url, c.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Notes browser fixture");
  expect(result.error).toBeNull();
});
