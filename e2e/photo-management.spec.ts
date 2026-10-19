import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig(),
  options = { auth: { persistSession: false, autoRefreshToken: false } };
async function fixture() {
  const db = createClient(config.url, config.anonKey, options);
  expect(
    (
      await db.auth.signInWithPassword({
        email: "chini-lucky@condos.invalid",
        password: "Disposable-local-test-password-9!",
      })
    ).error,
  ).toBeNull();
  const offer = await db.rpc("create_offer", {
    p_name: "Photo organization browser",
  });
  expect(offer.error).toBeNull();
  const reserved = await db.rpc("reserve_photos", {
    p_offer_id: offer.data.id,
    p_count: 3,
    p_request_id: randomUUID(),
  });
  expect(reserved.error).toBeNull();
  const bytes = await readFile("tests/fixtures/photos/oriented-gps.jpg"),
    token = (await db.auth.getSession()).data.session?.access_token;
  for (const photo of reserved.data)
    expect(
      (
        await fetch(`${config.url}/functions/v1/upload-photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: config.anonKey,
            "Content-Type": "image/jpeg",
            "x-reservation-id": photo.id,
          },
          body: bytes,
        })
      ).status,
    ).toBe(200);
  return {
    db,
    id: offer.data.id,
    ids: reserved.data.map((photo: { id: string }) => photo.id),
  };
}
for (const viewport of [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
]) {
  test(`reorder, explicit cover, confirmed deletion and empty state persist on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport.size);
    const { db, id, ids } = await fixture();
    const service = createClient(config.url, config.serviceKey, options);
    try {
      await page.goto(`./#offer=${id}`);
      await page.getByLabel("Username").fill("chini-lucky");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Disposable-local-test-password-9!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByText("Manage photos", { exact: true }).click();
      await page
        .getByRole("button", { name: "Move photo 3 earlier", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Move photo 2 earlier", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save photo order", exact: true })
        .click();
      await expect(
        page.getByText("Photo order saved.", { exact: true }),
      ).toBeVisible();
      expect(
        (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.map(
          (photo: { id: string }) => photo.id,
        ),
      ).toEqual([ids[2], ids[0], ids[1]]);
      await page
        .getByRole("button", { name: "Use photo 3 as cover", exact: true })
        .click();
      await expect(
        page.getByText("Cover photo saved.", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Back", exact: true }).click();
      const cover = page.getByRole("img", {
        name: "Photo organization browser cover photo",
      });
      await expect(cover).toBeVisible();
      await expect
        .poll(async () =>
          Boolean((await cover.getAttribute("src"))?.includes(ids[1])),
        )
        .toBe(true);
      await page.reload();
      await expect(cover).toBeVisible();
      await expect
        .poll(async () =>
          Boolean((await cover.getAttribute("src"))?.includes(ids[1])),
        )
        .toBe(true);
      const beforeRemote = (
        await db.rpc("get_offer_photos", { p_offer_id: id })
      ).data;
      expect(
        (
          await db.rpc("choose_photo_cover", {
            p_offer_id: id,
            p_expected_revision: beforeRemote.revision,
            p_photo_id: ids[2],
          })
        ).error,
      ).toBeNull();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect
        .poll(async () =>
          Boolean((await cover.getAttribute("src"))?.includes(ids[2])),
        )
        .toBe(true);
      const remote = (await db.rpc("get_offer_photos", { p_offer_id: id }))
        .data;
      expect(
        (
          await db.rpc("choose_photo_cover", {
            p_offer_id: id,
            p_expected_revision: remote.revision,
            p_photo_id: ids[1],
          })
        ).error,
      ).toBeNull();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect
        .poll(async () =>
          Boolean((await cover.getAttribute("src"))?.includes(ids[1])),
        )
        .toBe(true);
      await page
        .getByRole("link", { name: "Photo organization browser", exact: true })
        .click();
      await page.getByText("Manage photos", { exact: true }).click();
      await page
        .getByRole("button", { name: "Delete photo 3", exact: true })
        .click();
      expect(
        (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos,
      ).toHaveLength(3);
      await page
        .getByRole("button", { name: "Keep photo", exact: true })
        .click();
      expect(
        (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos,
      ).toHaveLength(3);
      await page
        .getByRole("button", { name: "Delete photo 3", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm delete photo 3", exact: true })
        .click();
      await expect(
        page.getByText("Photo deleted. Storage cleanup is queued.", {
          exact: true,
        }),
      ).toBeVisible();
      let fresh = (await db.rpc("get_offer_photos", { p_offer_id: id })).data;
      expect(fresh.cover_id).toBe(ids[2]);
      expect(fresh.photos).toHaveLength(2);
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Show photo 2", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Show photo 3", exact: true }),
      ).toHaveCount(0);
      await page.getByText("Manage photos", { exact: true }).click();
      for (let remaining = 2; remaining > 0; remaining--) {
        await page
          .getByRole("button", { name: "Delete photo 1", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Confirm delete photo 1", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos
                .length,
          )
          .toBe(remaining - 1);
      }
      await expect(
        page.getByText("No photos yet", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByText("No photos yet", { exact: true }),
      ).toBeVisible();
      fresh = (await db.rpc("get_offer_photos", { p_offer_id: id })).data;
      expect(fresh.cover_id).toBeNull();
    } finally {
      await service.from("offers").delete().eq("id", id);
    }
  });
}

test("a conflicting device and offline save retain the proposed order until explicit review or retry", async ({
  page,
  browser,
}) => {
  const { db, id, ids } = await fixture(),
    service = createClient(config.url, config.serviceKey, options);
  const context = await browser.newContext(),
    second = await context.newPage();
  try {
    for (const target of [page, second]) {
      await target.goto(`./#offer=${id}`);
      await target.getByLabel("Username").fill("chini-lucky");
      await target
        .getByLabel("Password", { exact: true })
        .fill("Disposable-local-test-password-9!");
      await target
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await target.getByText("Manage photos", { exact: true }).click();
    }
    await second
      .getByRole("button", { name: "Move photo 2 earlier", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Move photo 3 earlier", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      page.getByText("Photo order saved.", { exact: true }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      second.getByRole("alert").filter({ hasText: "Photos changed" }),
    ).toBeVisible();
    expect(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.map(
        (photo: { id: string }) => photo.id,
      ),
    ).toEqual([ids[0], ids[2], ids[1]]);
    await second
      .getByRole("button", { name: "Review latest photos", exact: true })
      .click();
    await expect(
      second.getByText(
        "Latest photos loaded. Your order is kept; save to apply it.",
        { exact: true },
      ),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      second.getByText("Photo order saved.", { exact: true }),
    ).toBeVisible();
    expect(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.map(
        (photo: { id: string }) => photo.id,
      ),
    ).toEqual([ids[1], ids[0], ids[2]]);
    await second
      .getByRole("button", { name: "Move photo 3 earlier", exact: true })
      .click();
    await second.route("**/rest/v1/rpc/reorder_photos", (route) =>
      route.abort("internetdisconnected"),
    );
    await second
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      second
        .getByRole("alert")
        .filter({ hasText: "Photo changes were not saved" }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Save photo order", exact: true }),
    ).toBeVisible();
    await second.unroute("**/rest/v1/rpc/reorder_photos");
    await second
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      second.getByText("Photo order saved.", { exact: true }),
    ).toBeVisible();
    expect(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.map(
        (photo: { id: string }) => photo.id,
      ),
    ).toEqual([ids[1], ids[2], ids[0]]);
    await second
      .getByRole("group", { name: "Photo 3", exact: true })
      .dragTo(second.getByRole("group", { name: "Photo 1", exact: true }));
    await second
      .getByRole("button", { name: "Save photo order", exact: true })
      .click();
    await expect(
      second.getByText("Photo order saved.", { exact: true }),
    ).toBeVisible();
    expect(
      (await db.rpc("get_offer_photos", { p_offer_id: id })).data.photos.map(
        (photo: { id: string }) => photo.id,
      ),
    ).toEqual([ids[0], ids[1], ids[2]]);
  } finally {
    await context.close();
    await service.from("offers").delete().eq("id", id);
  }
});
