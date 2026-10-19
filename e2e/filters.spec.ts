import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const fixtures = [
  {
    name: "Filters confirmed",
    station_id: "N24",
    rent: 20000,
    property_type: "condominium",
    washer: true,
    pool: true,
    bearing: 90,
  },
  {
    name: "Filters absent",
    station_id: "N24",
    rent: 15000,
    property_type: "condominium",
    washer: false,
    pool: null,
    bearing: 180,
  },
  {
    name: "Filters unknown",
    station_id: "N24",
    rent: null,
    property_type: null,
    washer: null,
    pool: null,
    bearing: 270,
  },
  {
    name: "Filters expensive",
    station_id: "E23",
    rent: 42000,
    property_type: "townhouse",
    washer: true,
    pool: true,
    bearing: 90,
  },
  {
    name: "Filters zero",
    station_id: "BL38",
    rent: 12000,
    property_type: "townhouse",
    washer: false,
    pool: false,
    bearing: 90,
  },
  {
    name: "Filters unassigned",
    station_id: null,
    rent: null,
    property_type: null,
    washer: null,
    pool: null,
    bearing: null,
  },
];
fixtures.push({
  name: "Filters trashed",
  station_id: "N24",
  rent: 10000,
  property_type: "condominium",
  washer: true,
  pool: true,
  bearing: 90,
});
const ids = new Map<string, string>();
test.beforeAll(async () => {
  const config = localConfig();
  const db = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(
    (
      await db.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
  ).toBeNull();
  for (const fixture of fixtures) {
    const { name, ...patch } = fixture;
    const result = await db.rpc("create_offer_details", {
      p_name: name,
      p_patch: { ...patch, walking_metres: fixture.station_id ? 400 : null },
    });
    expect(result.error).toBeNull();
    ids.set(name, result.data.id);
    if (name === "Filters trashed")
      expect(
        (
          await db.rpc("trash_offer", {
            p_id: result.data.id,
            p_expected_version: result.data.version,
          })
        ).error,
      ).toBeNull();
  }
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("combined filters agree across station cards, matching counts and truthful facility groups", async ({
  page,
}, testInfo) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "Filters unassigned", exact: true }),
  ).toBeVisible();
  const controls = page.getByRole("group", { name: "Offer filters" });
  await controls.getByRole("checkbox", { name: "Washer", exact: true }).check();
  const khu = page.getByRole("button", {
    name: "Browse Khu Khot",
    exact: true,
  });
  await expect(khu).toContainText("1 of 3 matching");
  await expect(khu).toContainText("from ฿20,000");
  const zero = page.getByRole("button", {
    name: "Browse Lak Song",
    exact: true,
  });
  await expect(zero).toHaveAttribute("data-zero-matches", "true");
  await expect(page.locator('[data-station="BL38"] .rail-dot')).toHaveCSS(
    "opacity",
    "0.32",
  );
  await expect(
    page.locator(`[data-offer="${ids.get("Filters absent")}"]`).locator(".."),
  ).toHaveAttribute("opacity", "0.35");
  await expect(
    page
      .locator(`[data-offer="${ids.get("Filters confirmed")}"]`)
      .locator(".."),
  ).toHaveAttribute("opacity", "1");
  await expect(
    page.locator('[data-station="N24"] text').filter({ hasText: /^1$/ }),
  ).toHaveCount(1);

  await expect(
    page.getByRole("link", { name: "Filters unassigned", exact: true }),
  ).toBeVisible();
  await khu.click();
  const panelBounds = await page.getByRole("complementary").boundingBox();
  const toolbarBounds = await page.locator(".offer-filters").boundingBox();
  const browserBounds = await page.locator(".rail-browser").boundingBox();
  if (!panelBounds || !toolbarBounds || !browserBounds)
    throw new Error("Missing desktop layout");
  expect(toolbarBounds.x).toBeGreaterThanOrEqual(
    panelBounds.x + panelBounds.width - 1,
  );
  expect(panelBounds.y).toBeCloseTo(browserBounds.y, 0);
  await expect(
    page.getByRole("button", {
      name: "Details for Filters confirmed",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("filters-desktop.png") });

  const station = page.getByRole("region", {
    name: "Offers near Khu Khot",
    exact: true,
  });
  await expect(
    station.getByRole("heading", { name: "Missing a facility", exact: true }),
  ).toBeVisible();
  await expect(station.getByText("No washer", { exact: true })).toBeVisible();
  await expect(
    station.getByText("Washer unknown", { exact: true }),
  ).toBeVisible();
  await controls
    .getByRole("checkbox", { name: "Condominium", exact: true })
    .check();
  await expect(
    station.getByRole("link", { name: "Filters unknown", exact: true }),
  ).toHaveCount(0);
  await controls
    .getByRole("checkbox", { name: "Townhouse", exact: true })
    .check();
  await expect(
    station.getByRole("link", { name: "Filters unknown", exact: true }),
  ).toBeVisible();
  await controls
    .getByRole("slider", { name: "Maximum monthly rent" })
    .fill("19500");
  await expect(
    station.getByRole("link", { name: "Filters confirmed", exact: true }),
  ).toHaveCount(0);
  await expect(
    station.getByRole("link", { name: "Filters unknown", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('[data-station="N24"] .rail-dot')).toHaveCSS(
    "opacity",
    "0.32",
  );

  await expect(
    station.getByRole("link", { name: "Filters absent", exact: true }),
  ).toBeVisible();
  await expect(
    station.getByText("No offers match these filters.", { exact: true }),
  ).toBeVisible();
  await controls
    .getByRole("slider", { name: "Maximum monthly rent" })
    .fill("35000");
  await expect(controls.getByText("Any rent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "All stations", exact: true }).click();
  await page.getByRole("button", { name: "Browse Kheha", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Filters expensive", exact: true }),
  ).toBeVisible();

  await controls
    .getByRole("checkbox", { name: "Townhouse", exact: true })
    .uncheck();
  await expect(
    page.getByRole("link", { name: "Filters expensive", exact: true }),
  ).toHaveCount(0);
  const expensiveCallout = page.getByRole("button", {
    name: "Details for Filters expensive",
    exact: true,
  });
  await expect(expensiveCallout).toBeVisible();
  await expect(
    page.locator(".offer-map-callout").filter({ has: expensiveCallout }),
  ).toHaveAttribute("opacity", "0.45");
  await controls
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByRole("status", { name: "Filter summary" })).toHaveText(
    "All offers · Any rent",
  );
});
test("phone filters pill exposes controls, reports active state and clears without losing incomplete offers", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const controls = page.getByRole("group", { name: "Offer filters" });
  const pill = page.getByRole("button", { name: "Filters", exact: true });
  await expect(controls).toBeHidden();
  await expect(pill).toHaveAttribute("aria-expanded", "false");
  await pill.click();
  await controls.getByRole("checkbox", { name: "Washer", exact: true }).check();
  await expect(pill.locator(".filters-dot")).toBeVisible();
  const sheet = await page.getByRole("complementary").boundingBox();
  const toolbar = await page.locator(".offer-filters").boundingBox();
  if (!sheet || !toolbar) throw new Error("Missing phone layout");
  expect(sheet.height).toBeCloseTo(214, 0);
  expect(toolbar.y + toolbar.height).toBeLessThan(sheet.y);
  await page.screenshot({
    path: testInfo.outputPath("filters-phone-open.png"),
  });

  await pill.click();
  await expect(controls).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath("filters-phone-pill.png"),
  });
  await expect(
    page.getByRole("status", { name: "Filter summary" }),
  ).toContainText("Washer");
  await pill.click();
  await controls
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(pill.locator(".filters-dot")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Filters unassigned", exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const config = localConfig();
  expect(
    (
      await createClient(config.url, config.serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
        .from("offers")
        .delete()
        .in("id", [...ids.values()])
    ).error,
  ).toBeNull();
});
