import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
test("photos upload privately, carousel order survives reload, failures retain selected files and renewal preserves the selected slide", async ({
  page,
}) => {
  const db = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await db.auth.signInWithPassword({
    email: "chini-lucky@condos.invalid",
    password: "Disposable-local-test-password-9!",
  });
  const created = await db.rpc("create_offer", {
    p_name: "Browser photo offer",
  });
  expect(created.error).toBeNull();
  const service = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    await page.goto(`./#offer=${created.data.id}`);
    await page.getByLabel("Username").fill("chini-lucky");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Disposable-local-test-password-9!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("No photos yet", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Choose photos")
      .setInputFiles([
        "tests/fixtures/photos/oriented-gps.jpg",
        "tests/fixtures/photos/landscape.webp",
      ]);
    await page.getByRole("button", { name: "Upload selected photos" }).click();
    await expect(
      page.getByText("2 photos saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Offer photo 1 of 2" }),
    ).toBeVisible();
    let deniedImage = false;
    await page.route(
      "**/storage/v1/object/sign/offer-photos/**",
      async (route) => {
        if (route.request().method() === "GET" && !deniedImage) {
          deniedImage = true;
          await route.fulfill({ status: 403, body: "Signed link expired" });
        } else await route.continue();
      },
    );
    await page.getByRole("button", { name: "Show photo 2" }).click();
    const image = page.getByRole("img", { name: "Offer photo 2 of 2" });
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);
    const initial = await image.getAttribute("src");
    // Image failure uses the public Storage signing boundary to renew the same slide.
    await image.evaluate((element) =>
      element.dispatchEvent(new Event("error")),
    );
    await expect(image).toBeVisible();
    expect(await image.getAttribute("src")).toContain(
      "/object/sign/offer-photos/",
    );
    expect(initial).toContain("/object/sign/offer-photos/");
    await page.reload();
    await expect(
      page.getByRole("img", { name: "Offer photo 1 of 2" }),
    ).toBeVisible();
    await page.getByLabel("Choose photos").setInputFiles({
      name: "broken.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([255, 216, 255, 1]),
    });
    await page.getByRole("button", { name: "Upload selected photos" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "could not be decoded" }),
    ).toBeVisible();
    await expect(page.getByText("broken.jpg", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry failed photos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Browser photo offer" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Remove selected broken.jpg" })
      .click();
    await page
      .getByLabel("Choose photos")
      .setInputFiles("tests/fixtures/photos/landscape.webp");
    let interruptedUpload = false;
    await page.route("**/functions/v1/upload-photo", async (route) => {
      if (!interruptedUpload) {
        interruptedUpload = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary upload interruption" }),
        });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Upload selected photos" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "could not be saved" }),
    ).toBeVisible();
    await expect(
      page.getByText("landscape.webp", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry failed photos" }).click();
    await expect(
      page.getByText("1 photo saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show photo 3" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "Browser photo offer cover photo" }),
    ).toBeVisible();
  } finally {
    await service.from("offers").delete().eq("id", created.data.id);
  }
});
