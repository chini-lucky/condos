import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
test("failed next-photo preview retries independently and main-photo retry preserves keyboard selection", async ({
  page,
}) => {
  const db = createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
  expect(
    (
      await db.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
  ).toBeNull();
  const created = await db.rpc("create_offer", {
    p_name: "Gallery retry fixture",
  });
  expect(created.error).toBeNull();
  const service = createClient(config.url, config.serviceKey);
  try {
    await page.goto(`./#offer=${created.data.id}`);
    await page.getByLabel("Username").fill("chini-lucky");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Disposable-local-test-password-9!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByText("Add photos", { exact: true }).click();
    await page
      .getByLabel("Choose photos")
      .setInputFiles([
        "tests/fixtures/photos/oriented-gps.jpg",
        "tests/fixtures/photos/landscape.webp",
      ]);
    await page.getByRole("button", { name: "Upload selected photos" }).click();
    await expect(
      page.getByRole("img", { name: "Offer photo 1 of 2" }),
    ).toBeVisible();
    const source = await page.locator(".gallery-next img").getAttribute("src");
    if (!source) throw new Error("Missing next-photo URL");
    const nextPath = new URL(source).pathname;
    const pattern = "**/storage/v1/object/sign/offer-photos/**";
    await page.route(pattern, async (route) => {
      if (
        route.request().method() === "GET" &&
        new URL(route.request().url()).pathname === nextPath
      )
        await route.fulfill({ status: 403, body: "Expired photo" });
      else await route.continue();
    });
    await page.reload();
    const previewRetry = page
      .locator(".gallery-next")
      .getByRole("button", { name: "Retry photo", exact: true });
    await expect(previewRetry).toBeVisible();
    await expect(page.locator("button button")).toHaveCount(0);
    await page.unroute(pattern);
    await previewRetry.click();
    await expect(
      page.getByRole("button", { name: "Show photo 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const next = page.getByRole("button", { name: "Next photo", exact: true });
    await next.focus();
    await page.keyboard.press("Enter");
    const main = page.getByRole("img", { name: "Offer photo 2 of 2" });
    await expect(main).toBeVisible();
    await page.route(pattern, async (route) => {
      if (
        route.request().method() === "GET" &&
        new URL(route.request().url()).pathname === nextPath
      )
        await route.fulfill({ status: 403, body: "Expired photo" });
      else await route.continue();
    });
    await main.dispatchEvent("error");
    const mainRetry = page
      .locator(".gallery-current")
      .getByRole("button", { name: "Retry photo", exact: true });
    await expect(mainRetry).toBeVisible();
    await page.unroute(pattern);
    await mainRetry.click();
    await expect(main).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show photo 2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    const photos = await service
      .from("offer_photos")
      .select("object_key")
      .eq("offer_id", created.data.id);
    if (photos.data?.length)
      await service.storage
        .from("offer-photos")
        .remove(photos.data.map((photo) => photo.object_key));
    await service.from("offers").delete().eq("id", created.data.id);
  }
});
