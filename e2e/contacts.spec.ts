import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("optional contacts round trip, expose safe actions and clear independently on mobile", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Contacts browser fixture");
  await page.getByLabel("Agent name", { exact: true }).fill(" Pim ");
  await page.getByLabel("Agent company").fill(" Homes ");
  await page.getByLabel("Agent phone").fill("+66 (81) 234-5678");
  await page.getByLabel("Agent LINE ID").fill("@pim.homes");
  await page
    .getByLabel("Source URL")
    .fill("https://example.com/listing?unit=1");
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  const card = page.getByRole("group", { name: "Agent contact" });
  await expect(card.getByRole("link", { name: "Call agent" })).toBeHidden();
  await card.getByText("Pim", { exact: true }).click();
  await expect(card.getByText("Homes", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "Call agent" })).toHaveAttribute(
    "href",
    "tel:+66812345678",
  );
  await expect(card.getByRole("link", { name: "Open LINE" })).toHaveAttribute(
    "href",
    "https://line.me/R/ti/p/%40pim.homes",
  );
  await expect(
    page.getByRole("link", { name: "Open source listing" }),
  ).toHaveAttribute("rel", /noopener/);
  await card.getByRole("button", { name: "Copy phone" }).click();
  await expect(card.getByRole("status")).toHaveText("Phone copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "+66 (81) 234-5678",
  );
  await card.getByRole("button", { name: "Copy LINE ID" }).click();
  await expect(card.getByRole("status")).toHaveText("LINE ID copied.");
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Edit offer", exact: true }).click();
  await expect(page.getByLabel("Agent name", { exact: true })).toHaveValue(
    "Pim",
  );
  await page.getByLabel("Agent name", { exact: true }).fill("");
  await page.getByLabel("Agent company").fill("");
  await page.getByLabel("Agent phone").fill("");
  await page.getByLabel("Agent LINE ID").fill("pim.personal");
  await page.getByLabel("Source URL").fill("");
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await card.getByText("Agent details", { exact: true }).click();
  await expect(card.getByRole("link", { name: "Call agent" })).toHaveCount(0);
  await expect(
    card.getByRole("link", { name: "Find in LINE" }),
  ).toHaveAttribute("href", "https://line.me/R/nv/addFriends");
  await expect(
    card.getByText("Search LINE using this ID: pim.personal", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open source listing" }),
  ).toHaveCount(0);
});
test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig } = await import("../scripts/local-config.ts");
  const config = localConfig();
  expect(
    (
      await createClient(config.url, config.serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
        .from("offers")
        .delete()
        .eq("name", "Contacts browser fixture")
    ).error,
  ).toBeNull();
});
