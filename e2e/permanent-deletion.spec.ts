import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("irreversible deletion is only in Trash, names its target, can be cancelled, and stays deleted after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Permanently removed browser offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Permanently removed browser offer",
      exact: true,
    }),
  ).toBeVisible();
  const link = page.url();
  await expect(
    page.getByRole("button", { name: "Delete permanently", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm move to Trash" }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Confirm permanent deletion" }),
  ).toContainText("Permanently removed browser offer");
  await expect(
    page.getByRole("group", { name: "Confirm permanent deletion" }),
  ).toContainText("cannot be restored");
  await page.getByRole("button", { name: "Cancel permanent deletion" }).click();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Permanently removed browser offer",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Permanently removed browser offer");
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Cleanup complete");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Permanent deletion cleanup" }),
  ).toContainText("Permanently removed browser offer");
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Offer unavailable", exact: true }),
  ).toBeVisible();
});
test.afterAll(async () => {
  const c = localConfig();
  await createClient(c.url, c.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Permanently removed browser offer");
});

test("a lost deletion response is safe to retry and pending photo cleanup stays visible and recoverable", async ({
  page,
}) => {
  const c = localConfig(),
    options = { auth: { persistSession: false, autoRefreshToken: false } },
    db = createClient(c.url, c.anonKey, options),
    service = createClient(c.url, c.serviceKey, options);
  await db.auth.signInWithPassword({
    email: "chini-lucky@condos.invalid",
    password: "Disposable-local-test-password-9!",
  });
  const created = await db.rpc("create_offer", {
    p_name: "Deletion retry browser offer",
  });
  expect(created.error).toBeNull();
  const id = created.data.id;
  const { randomUUID } = await import("node:crypto");
  const reserved = await db.rpc("reserve_photos", {
    p_offer_id: id,
    p_count: 1,
    p_request_id: randomUUID(),
  });
  expect(reserved.error).toBeNull();
  const photo = reserved.data[0];
  const { readFile } = await import("node:fs/promises");
  const jpeg = await readFile(
    new URL("../tests/fixtures/photos/oriented-gps.jpg", import.meta.url),
  );
  const token = (await db.auth.getSession()).data.session?.access_token;
  const uploaded = await fetch(`${c.url}/functions/v1/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: c.anonKey,
      "Content-Type": "image/jpeg",
      "x-reservation-id": photo.id,
    },
    body: jpeg,
  });
  expect(uploaded.status).toBe(200);
  await db.rpc("trash_offer", { p_id: id, p_expected_version: 1 });
  await login(page);
  await page.goto(`./#offer=${id}`);
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page.route(
    "**/rest/v1/rpc/permanently_delete_offer",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Deletion was not confirmed",
  );
  await expect(
    page.getByRole("group", { name: "Confirm permanent deletion" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toBeVisible();
  const status = page.getByRole("region", {
    name: "Permanent deletion cleanup",
  });
  const receipt = status
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Deletion retry browser offer",
        exact: true,
      }),
    })
    .first();
  await expect(receipt).toContainText("1 photo cleanup jobs pending");
  // Model a previously recorded Storage failure; real bytes and durable job remain.
  await service
    .from("photo_cleanup")
    .update({
      last_error: "Temporary Storage deletion failure",
      due_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .eq("deletion_offer_id", id);
  await page.getByRole("button", { name: "Refresh deletion cleanup" }).click();
  await expect(receipt).toContainText("1 awaiting retry");
  expect(
    (await service.storage.from("offer-photos").download(photo.object_key))
      .error,
  ).toBeNull();
  // The shared worker handles bounded batches; older jobs can precede this receipt.
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await receipt.textContent())?.includes("Cleanup complete")) break;
    const refreshed = page.waitForResponse((response) =>
      response.url().includes("/rest/v1/rpc/list_offer_deletions"),
    );
    await receipt
      .getByRole("button", {
        name: "Retry cleanup for Deletion retry browser offer",
        exact: true,
      })
      .click();
    await refreshed;
    await expect(
      receipt.getByRole("button", { name: "Retrying cleanup…" }),
    ).toHaveCount(0);
  }
  await expect(receipt).toContainText("Cleanup complete");
  expect(
    (await service.storage.from("offer-photos").download(photo.object_key))
      .error,
  ).not.toBeNull();
  expect((await db.from("offers").select("id").eq("id", id)).data).toEqual([]);
});
