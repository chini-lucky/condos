import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
async function login(page: Page, link = "./") {
  await page.goto(link);
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function focusRefresh(page: Page) {
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/offers?") &&
      response.request().method() === "GET",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
}
async function trash(page: Page) {
  await page
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm move to Trash", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Offer is in Trash", exact: true }),
  ).toBeVisible();
}
async function remove(page: Page) {
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toBeVisible();
}
async function clipboard(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

test("an offer edit remains copyable and cannot revive a permanently deleted offer after focus refresh", async ({
  page,
  browser,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Deleted edit draft fixture");
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Deleted edit draft fixture",
      exact: true,
    }),
  ).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await login(second, link);
    await page.getByRole("button", { name: "Edit offer", exact: true }).click();
    await page.getByLabel("Offer name").fill("Keep this edited name");
    await page.getByLabel("Monthly rent (THB)").fill("24000");
    await page.getByLabel("Agent phone").fill("0812345678");
    await trash(second);
    await second.goto(`${link}&edit`);
    await expect(
      second.getByRole("button", { name: "Save offer", exact: true }),
    ).toBeDisabled();
    await second
      .getByRole("link", { name: "Open recovery options", exact: true })
      .click();
    await expect(
      second.getByRole("heading", { name: "Offer is in Trash", exact: true }),
    ).toBeVisible();
    await remove(second);
    await focusRefresh(page);
    await expect(page.getByLabel("Offer name")).toHaveValue(
      "Keep this edited name",
    );
    await expect(page.getByLabel("Monthly rent (THB)")).toHaveValue("24000");
    await expect(page.getByLabel("Offer name")).toBeEnabled();
    await expect(
      page.getByRole("alert").filter({ hasText: "permanently deleted" }),
    ).toContainText("Your drafts are kept");
    await expect(
      page.getByRole("button", { name: "Save offer", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Copy offer draft", exact: true })
      .click();
    await expect.poll(() => clipboard(page)).toContain("Keep this edited name");
    expect(await clipboard(page)).toContain("24000");
    expect(await clipboard(page)).toContain("0812345678");
    await page
      .getByRole("button", { name: "Exit unavailable offer", exact: true })
      .click();
    await expect(page.getByLabel("Offer name")).toHaveCount(0);
    await page.goto(link);
    await expect(
      page.getByRole("heading", { name: "Offer unavailable", exact: true }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test("note and status drafts survive remote Trash then permanent deletion with copying and writes disabled", async ({
  page,
  browser,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Deleted child draft fixture");
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await page.getByLabel("New note").fill("Saved original note");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Saved original note", { exact: true }),
  ).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await login(second, link);
    await page.getByRole("button", { name: "Edit note", exact: true }).click();
    await page.getByLabel("Edit note text").fill("Keep edited note draft");
    await page.getByLabel("New note").fill("Keep new note draft");
    await page
      .getByRole("button", { name: "Change status or viewing", exact: true })
      .click();
    await page.getByLabel("Waiting on").fill("Keep status explanation draft");
    await trash(second);
    await focusRefresh(page);
    await expect(page.getByLabel("New note")).toHaveValue(
      "Keep new note draft",
    );
    await expect(page.getByLabel("Edit note text")).toHaveValue(
      "Keep edited note draft",
    );
    await expect(page.getByLabel("Waiting on")).toHaveValue(
      "Keep status explanation draft",
    );
    await expect(
      page.getByRole("button", { name: "Add note", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save note", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: "Save status and viewing",
        exact: true,
      }),
    ).toBeDisabled();
    await remove(second);
    await focusRefresh(page);
    await expect(page.getByLabel("New note")).toHaveValue(
      "Keep new note draft",
    );
    await expect(page.getByLabel("Edit note text")).toHaveValue(
      "Keep edited note draft",
    );
    await expect(page.getByLabel("Waiting on")).toHaveValue(
      "Keep status explanation draft",
    );
    for (const [label, text] of [
      ["Copy new note draft", "Keep new note draft"],
      ["Copy edited note draft", "Keep edited note draft"],
      ["Copy status draft", "Keep status explanation draft"],
    ] as const) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect.poll(() => clipboard(page)).toContain(text);
    }
    await page
      .getByRole("button", { name: "Exit unavailable offer", exact: true })
      .click();
    await expect(page.getByLabel("New note")).toHaveCount(0);
  } finally {
    await other.close();
  }
});
test.afterAll(async () => {
  const config = localConfig();
  await createClient(config.url, config.serviceKey)
    .from("offers")
    .delete()
    .in("name", ["Deleted edit draft fixture", "Deleted child draft fixture"]);
});
