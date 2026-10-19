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
test("confirmed Trash survives reload, hides station counts and pins, and restores retained rejected offers and notes", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Trash browser retained");
  await page.getByLabel("Station", { exact: true }).selectOption("E1");
  await page.getByLabel("Walking distance (metres)").fill("320");
  await page.getByLabel("Direction (degrees clockwise from north)").fill("90");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Trash browser retained", exact: true }),
  ).toBeVisible();
  const link = page.url();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Offer status").selectOption("Rejected");
  await page.getByLabel("Rejection reason").fill("Still retained");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await page.getByLabel("New note").fill("Remember this offer");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Remember this offer", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel move to Trash" }).click();
  await expect(
    page.getByText("Offer is in Trash", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm move to Trash" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Trash browser retained",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Trash browser retained", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Trash browser retained", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash" }),
  ).toBeVisible();
  await page.goto(link);
  await page
    .getByRole("button", { name: "Restore offer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash browser retained", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Remember this offer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Trash browser retained",
      exact: true,
    }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const c = localConfig();
  await createClient(c.url, c.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Trash browser retained");
});
