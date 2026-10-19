import { test, expect } from "@playwright/test";
test("create, inspect and clear optional facts and facilities without fabricating values", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  const details = page.getByRole("complementary", { name: "Offer details" });
  await page.getByLabel("Offer name").fill("Facts browser fixture");
  await page.getByLabel("Station", { exact: true }).selectOption("E6");
  await page.getByLabel("Walking distance (metres)").fill("800");
  await page.getByLabel("Direction (degrees clockwise from north)").fill("90");
  await page.getByLabel("Monthly rent (THB)").fill("25000");
  await page.getByLabel("Property type").selectOption("condominium");
  await page.getByLabel("Size (m²)").fill("31.5");
  await page.getByLabel("Beds (0 for studio)").fill("0");
  await page.getByLabel("Floor", { exact: true }).fill("-1");
  await details
    .getByRole("combobox", { name: "Washer", exact: true })
    .selectOption("present");
  await details
    .getByRole("combobox", { name: "Garden", exact: true })
    .selectOption("absent");
  await page.getByLabel("Extra facility").fill(" Balcony ");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  await page.getByLabel("Extra facility").fill("balcony");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "That facility is already listed.",
  );
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Facts browser fixture", exact: true }),
  ).toBeVisible();
  await expect(
    details.getByText("฿25,000 / month", { exact: true }),
  ).toBeVisible();
  await expect(details.getByText(/Studio \(0 beds\)/)).toBeVisible();
  await expect(
    details.getByText("✓ Washer: Present", { exact: true }),
  ).toBeVisible();
  await expect(
    details.getByText("✕ Garden: Absent", { exact: true }),
  ).toBeVisible();
  await expect(
    details.getByText("? Pool: Unknown", { exact: true }),
  ).toBeVisible();
  const detailLink = page.url();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  const card = page.getByRole("listitem").filter({
    has: page.getByRole("link", {
      name: "Facts browser fixture",
      exact: true,
    }),
  });
  await expect(
    card.getByText("✓ Washer: Present", { exact: true }),
  ).toBeVisible();
  await page.goto(detailLink);
  await page.reload();
  await page.getByRole("button", { name: "Edit offer", exact: true }).click();
  await expect(page.getByLabel("Beds (0 for studio)")).toHaveValue("0");
  await expect(page.getByLabel("Station", { exact: true })).toHaveValue("E6");
  for (const label of [
    "Monthly rent (THB)",
    "Size (m²)",
    "Beds (0 for studio)",
    "Floor",
  ])
    await page.getByLabel(label, { exact: true }).fill("");
  await page.getByLabel("Property type").selectOption("");
  await details
    .getByRole("combobox", { name: "Washer", exact: true })
    .selectOption("unknown");
  await details
    .getByRole("combobox", { name: "Garden", exact: true })
    .selectOption("unknown");
  await page
    .getByRole("button", { name: "Remove Balcony", exact: true })
    .click();
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(
    details.getByText("Rent not recorded", { exact: true }),
  ).toBeVisible();
  await expect(
    details.getByText("? Washer: Unknown", { exact: true }),
  ).toBeVisible();
  await expect(details.getByText(/Beds unknown/)).toBeVisible();
  await expect(details.getByText("Balcony", { exact: true })).toHaveCount(0);
  await expect(
    details.getByText("Station: Thong Lo", { exact: true }),
  ).toBeVisible();
  await expect(
    details.getByText("800 m · estimated 10 min walk", { exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const config = localConfig();
  const result = await createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
    .from("offers")
    .delete()
    .eq("name", "Facts browser fixture");
  expect(result.error).toBeNull();
});
