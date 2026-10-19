import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
test("HEIC uploads as private JPEG, reloads in the carousel, and a failed conversion retains selection and successful photos", async ({
  page,
}) => {
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const db = createClient(config.url, config.anonKey, options);
  const service = createClient(config.url, config.serviceKey, options);
  const login = await db.auth.signInWithPassword({
    email: "chini-lucky@condos.invalid",
    password: "Disposable-local-test-password-9!",
  });
  expect(login.error).toBeNull();
  const name = `HEIC upload ${randomUUID()}`;
  const offer = await db.rpc("create_offer", { p_name: name });
  expect(offer.error).toBeNull();
  const id: string = offer.data.id;
  try {
    await page.goto(`./#offer=${id}`);
    await page.getByLabel("Username").fill("chini-lucky");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Disposable-local-test-password-9!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("No photos yet", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Choose photos")).toHaveAttribute(
      "accept",
      /image\/heic/,
    );
    const valid = await readFile("tests/fixtures/heic/basic.heic");
    await page.getByLabel("Choose photos").setInputFiles([
      { name: "phone-no-mime.heic", mimeType: "", buffer: valid },
      {
        name: "broken.heic",
        mimeType: "image/heic",
        buffer: valid.subarray(0, 80),
      },
    ]);
    await page.getByRole("button", { name: "Upload selected photos" }).click();
    await expect(
      page.getByText("1 photo saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "HEIC photo could not be decoded" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove selected broken.heic" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    const image = page.getByRole("img", { name: "Offer photo 1 of 1" });
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalWidth : 0,
        ),
      )
      .toBe(64);
    const assets = await db.from("photo_assets").select("*").eq("offer_id", id);
    expect(assets.error).toBeNull();
    expect(
      assets.data?.filter((photo) => photo.state === "ready"),
    ).toHaveLength(1);
    expect(
      assets.data?.filter((photo) => photo.state === "uploading"),
    ).toHaveLength(0);
    const ready = assets.data?.find((photo) => photo.state === "ready");
    expect(ready).toBeTruthy();
    const stored = await service.storage
      .from("offer-photos")
      .download(ready.object_key);
    expect(stored.error).toBeNull();
    expect(stored.data?.type).toBe("image/jpeg");
    if (!stored.data) throw new Error("Uploaded JPEG is missing");
    const bytes = new Uint8Array(await stored.data.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([255, 216, 255]);
    expect(new TextDecoder().decode(bytes)).not.toContain(
      "SYNTHETIC-GPS-METADATA",
    );
    const anonymous = createClient(config.url, config.anonKey, options);
    expect(
      (await anonymous.storage.from("offer-photos").download(ready.object_key))
        .error,
    ).not.toBeNull();
    await page
      .getByRole("button", { name: "Remove selected broken.heic" })
      .click();
    await page.reload();
    await expect(
      page.getByRole("img", { name: "Offer photo 1 of 1" }),
    ).toBeVisible();
  } finally {
    await service.from("offers").delete().eq("id", id);
    const session = await db.auth.getSession();
    expect(session.data.session).not.toBeNull();
    const cleanup = await fetch(`${config.url}/functions/v1/photo-cleanup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token}`,
        apikey: config.anonKey,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(cleanup.status).toBe(200);
  }
});
