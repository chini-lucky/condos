import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function create(page: Page) {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Notes browser fixture");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Notes browser fixture", exact: true }),
  ).toBeVisible();
}
test("notes timeline supports persistent composer, inline editing and confirmed deletion", async ({
  page,
}) => {
  await create(page);
  await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
  await page.getByLabel("New note").fill("   ");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a note");
  await page.getByLabel("New note").fill("Call agent tomorrow");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notes (1)" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Call agent tomorrow", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page.getByLabel("Edit note text").fill("Cancelled change");
  await page.getByLabel("Edit note text").press("Escape");
  await expect(
    page.getByText("Call agent tomorrow", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page.getByLabel("Edit note text").fill("Viewing confirmed");
  await page.getByLabel("Edit note text").press("Enter");
  await expect(
    page.getByText("Viewing confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page.getByRole("button", { name: "Keep note", exact: true }).click();
  await expect(
    page.getByText("Viewing confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete note", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
});
test("failed note writes retain drafts and concurrent edits require review", async ({
  page,
  context,
  browser,
}) => {
  await create(page);
  await page.getByLabel("New note").fill("Offline draft");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("not saved");
  await expect(page.getByLabel("New note")).toHaveValue("Offline draft");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByText("Offline draft", { exact: true })).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second);
  await second.goto(link);
  await second.getByRole("button", { name: "Edit note", exact: true }).click();
  await second.getByLabel("Edit note text").fill("My conflicting draft");
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page.getByLabel("Edit note text").fill("Newer saved note");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByText("Newer saved note", { exact: true }),
  ).toBeVisible();
  await second.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText(
    "changed on another device",
  );
  await expect(second.getByLabel("Edit note text")).toHaveValue(
    "My conflicting draft",
  );
  await second.getByRole("button", { name: "Review latest notes" }).click();
  await expect(
    second.getByText(
      "Latest saved note: Newer saved note. Your draft is unchanged.",
    ),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Use latest version to retry" })
    .click();
  await second.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    second.getByText("My conflicting draft", { exact: true }),
  ).toBeVisible();
  await other.close();
});
test("reviewing a remotely deleted note preserves the attempted edit", async ({
  page,
  browser,
}) => {
  await create(page);
  await page.getByLabel("New note").fill("Remotely removed");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Remotely removed", { exact: true }),
  ).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second);
  await second.goto(link);
  await second.getByRole("button", { name: "Edit note", exact: true }).click();
  await second.getByLabel("Edit note text").fill("Keep my deleted-note draft");
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete note", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
  await second.getByRole("button", { name: "Save note", exact: true }).click();
  await second.getByRole("button", { name: "Review latest notes" }).click();
  await expect(second.getByLabel("Edit note text")).toHaveValue(
    "Keep my deleted-note draft",
  );
  await expect(second.getByRole("alert")).toContainText(
    "deleted on another device",
  );
  await other.close();
});
test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const c = localConfig();
  const result = await createClient(c.url, c.serviceKey)
    .from("offers")
    .delete()
    .eq("name", "Notes browser fixture");
  expect(result.error).toBeNull();
});
