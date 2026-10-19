import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("admin books, reschedules and clears Bangkok viewings, with optional status explanations and persistent full-strength rejected offers", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Status browser offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Offer status").selectOption("Viewing");
  await page.getByLabel("Viewing time (Bangkok)").fill("2020-01-01T00:30");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(
    page.getByText("1 Jan 2020, 00:30 (Bangkok)", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("1 Jan 2020, 00:30 (Bangkok)", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await expect(page.getByLabel("Offer status")).toHaveValue("Viewing");
  await page.getByLabel("Viewing time (Bangkok)").fill("2027-03-02T14:15");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(
    page.getByText("2 Mar 2027, 14:15 (Bangkok)", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByRole("button", { name: "Clear viewing time" }).click();
  await page.getByLabel("Offer status").selectOption("Rejected");
  await page.getByLabel("Rejection reason").fill("Too far");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByText("Too far", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Viewing time not arranged", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Offer status").selectOption("Pending");
  await page.getByLabel("Waiting on").fill("Agent reply");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByText("Agent reply", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Offer status").selectOption("Available");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
});
test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const config = localConfig();
  await createClient(config.url, config.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Status browser offer");
});
