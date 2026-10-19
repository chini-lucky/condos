import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const ids: string[] = [];
let offerId = "";
test.use({ reducedMotion: "reduce" });
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
  for (const fixture of [
    {
      name: "Navigation river fixture",
      station_id: "E6",
      walking_metres: 800,
      bearing: 90,
      rent: 21000,
      washer: true,
    },
    {
      name: "Navigation north fixture",
      station_id: "N5",
      walking_metres: 400,
      bearing: 270,
      rent: null,
      washer: null,
    },
  ]) {
    const { name, ...patch } = fixture;
    const result = await db.rpc("create_offer_details", {
      p_name: name,
      p_patch: patch,
    });
    expect(result.error).toBeNull();
    ids.push(result.data.id);
    if (!offerId) offerId = result.data.id;
  }
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("station deep links show rings and clear callouts, hover joins pins/cards, and Escape follows navigation parents", async ({
  page,
}) => {
  await login(page);
  await page.goto("./#station=E6");
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5 min · 400 m", { exact: true })).toBeVisible();
  const callout = page.getByRole("button", {
    name: "Details for Navigation river fixture",
  });
  await expect(callout).toBeVisible();
  const card = page.locator(`[data-offer-card="${offerId}"]`);
  const pin = page.getByRole("button", {
    name: "Open Navigation river fixture",
    exact: true,
  });
  await card.hover();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await pin.hover();
  await expect(card).toHaveClass(/is-highlighted/);
  const box = await callout.boundingBox();
  const back = await page
    .getByRole("button", { name: "All stations", exact: true })
    .boundingBox();
  expect(box).not.toBeNull();
  expect(back).not.toBeNull();
  if (box && back)
    expect(
      box.x + box.width <= back.x ||
        box.x >= back.x + back.width ||
        box.y + box.height <= back.y ||
        box.y >= back.y + back.height,
    ).toBeTruthy();
  await callout.click();
  await expect(
    page.getByRole("heading", {
      name: "Navigation river fixture",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  await page.goto(`./#edit-${offerId}`);
  await expect(page.getByLabel("Offer name")).toHaveValue(
    "Navigation river fixture",
  );
  await page.getByLabel("Offer name").fill("Retained map draft");
  await page.mouse.move(1000, 250);
  await page.mouse.wheel(0, 1800);
  await expect(page.getByLabel("Offer name")).toHaveValue("Retained map draft");
  await expect(page).toHaveURL(/edit-/);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", {
      name: "Navigation river fixture",
      exact: true,
    }),
  ).toBeVisible();
  await page.mouse.wheel(0, 1800);
  await expect(
    page.getByRole("heading", {
      name: "Navigation river fixture",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("./#station=missing");
  await expect(
    page.getByRole("heading", { name: "Station unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to all stations" }).click();
  await page.goto("./#add-E6");
  await expect(page.getByLabel("Station", { exact: true })).toHaveValue("E6");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
});
test("free zoom selects nearest offers without snapping the camera, pans switch stations, and zooming out restores overview", async ({
  page,
}) => {
  await login(page);
  const map = page.getByRole("group", { name: "Bangkok rail map" });
  const home = (await map.getAttribute("viewBox"))?.split(" ").map(Number);
  if (!home) throw new Error("Map missing");
  const marker = await page
    .getByRole("button", { name: "Select Thong Lo", exact: true })
    .boundingBox();
  if (!marker) throw new Error("Station missing");
  await page.mouse.move(
    marker.x + marker.width / 2,
    marker.y + marker.height / 2,
  );
  await page.mouse.wheel(0, -550);
  await expect(
    page.getByRole("heading", { name: "Thong Lo", exact: true }),
  ).toBeVisible();
  const after = (await map.getAttribute("viewBox"))?.split(" ").map(Number);
  expect(after?.[2]).toBeCloseTo((home[2] ?? 0) / Math.exp(1.1), 0);
  await map.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("heading", { name: "Ari", exact: true }),
  ).toBeVisible();
  await page.mouse.wheel(0, 1000);
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const config = localConfig();
  const service = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(
    (await service.from("offers").delete().in("id", ids)).error,
  ).toBeNull();
});
