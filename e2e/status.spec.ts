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
    page.getByText("2 Mar 2027, 14:15 (Bangkok)", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await expect(page.getByLabel("Viewing time (Bangkok)")).toHaveValue("");
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

test("conflicting and failed status saves keep the draft until the admin reviews and retries", async ({
  page,
  browser,
  context,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Status conflict offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("button", { name: "Change status or viewing" }),
  ).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second);
  await second.goto(link);
  await second
    .getByRole("button", { name: "Change status or viewing" })
    .click();
  await second.getByLabel("Offer status").selectOption("Rejected");
  await second.getByLabel("Rejection reason").fill("Retained reason");
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Offer status").selectOption("Available");
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(second.getByRole("alert")).toContainText(
    "changed on another device",
  );
  await expect(second.getByLabel("Rejection reason")).toHaveValue(
    "Retained reason",
  );
  await second.getByRole("button", { name: "Review latest status" }).click();
  await expect(
    second
      .getByRole("form", { name: "Status and viewing" })
      .getByRole("status"),
  ).toContainText("Latest saved status: Available");
  await second.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(
    second.getByText("Retained reason", { exact: true }),
  ).toBeVisible();
  await other.close();
  await page.reload();
  await page.getByRole("button", { name: "Change status or viewing" }).click();
  await page.getByLabel("Rejection reason").fill("Offline reason");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByRole("alert")).toContainText("not saved");
  await expect(page.getByLabel("Rejection reason")).toHaveValue(
    "Offline reason",
  );
  await context.setOffline(false);
  await page.getByRole("button", { name: "Save status and viewing" }).click();
  await expect(page.getByText("Offline reason", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  const row = page.getByRole("listitem").filter({
    has: page.getByRole("link", {
      name: "Status conflict offer",
      exact: true,
    }),
  });
  await expect(row.getByText("Rejected", { exact: true })).toBeVisible();
  expect(await row.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const config = localConfig();
  await createClient(config.url, config.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Status conflict offer");
});
