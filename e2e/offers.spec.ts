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
test("create a name-only offer, reopen its direct link, rename it, and navigate back", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("  Browser name-only offer  ");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser name-only offer", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await expect(page.getByText("Station not assigned")).toBeVisible();
  const link = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Browser name-only offer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit offer" }).click();
  await page.getByLabel("Offer name").fill("Renamed browser offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Renamed browser offer", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Renamed browser offer", exact: true }),
  ).toBeVisible();
});
