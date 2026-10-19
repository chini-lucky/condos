import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const names: [string, string] = [
  "Station incomplete fixture",
  "Station positioned fixture",
];
test("assign, position, reassign and clear offers while station lists and pins agree after reload", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill(names[0] ?? "");
  await page.getByLabel("Station", { exact: true }).selectOption("E6");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Offer details" })
      .getByText("Thong Lo", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Station incomplete fixture",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: names[0], exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Walking distance unknown", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill(names[1] ?? "");
  await page.getByLabel("Walking distance (metres)").fill("800");
  await page.getByLabel("Direction (degrees clockwise from north)").fill("90");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByText("800 m · estimated 10 min walk", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Open Station positioned fixture",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Open Station positioned fixture",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Station positioned fixture",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit offer", exact: true }).click();
  await page.getByLabel("Station", { exact: true }).selectOption("N5");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Offer details" })
      .getByText("Ari", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ari", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: names[1], exact: true }).click();
  await page.getByRole("button", { name: "Edit offer", exact: true }).click();
  await page.getByLabel("Station", { exact: true }).selectOption("");
  await page.getByLabel("Walking distance (metres)").fill("");
  await page.getByLabel("Direction (degrees clockwise from north)").fill("");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByText("Station not assigned", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: names[1], exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Browse Thong Lo", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: names[0], exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose a station").selectOption("E5");
  await expect(
    page.getByText("Nothing on file here yet.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nearest with offers: Thong Lo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const config = localConfig();
  const service = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(
    (await service.from("offers").delete().in("name", names)).error,
  ).toBeNull();
});
