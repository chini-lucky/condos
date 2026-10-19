import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page.getByLabel("Username").fill("chini-lucky");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Disposable-local-test-password-9!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("create a name-only offer, reopen its direct link, rename it, and navigate back", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("  Browser name-only offer  ");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser name-only offer", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await expect(page.getByText("Station not assigned")).toBeVisible();
  const link = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Browser name-only offer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit offer" }).click();
  await page.getByLabel("Offer name").fill("Renamed browser offer");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Renamed browser offer", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Renamed browser offer", exact: true }),
  ).toBeVisible();
});

test("two devices preserve a conflicting draft and explicitly review the latest saved offer before retrying", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Conflict original");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Conflict original", exact: true }),
  ).toBeVisible();
  const link = page.url();
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second);
  await second.goto(link);
  await second.getByRole("button", { name: "Edit offer" }).click();
  await second.getByLabel("Offer name").fill("My retained draft");
  await page.getByRole("button", { name: "Edit offer" }).click();
  await page.getByLabel("Offer name").fill("Newer saved name");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "Newer saved name", exact: true }),
  ).toBeVisible();
  await second.getByRole("button", { name: "Save offer" }).click();
  await expect(second.getByRole("alert")).toContainText(
    "changed on another device",
  );
  await expect(second.getByLabel("Offer name")).toHaveValue(
    "My retained draft",
  );
  await second.getByRole("button", { name: "Review latest offer" }).click();
  await expect(
    second.getByText(
      "Latest saved name: Newer saved name. Your draft is unchanged.",
    ),
  ).toBeVisible();
  await expect(second.getByLabel("Offer name")).toHaveValue(
    "My retained draft",
  );
  await second.getByRole("button", { name: "Save offer" }).click();
  await expect(
    second.getByRole("heading", { name: "My retained draft", exact: true }),
  ).toBeVisible();
  await other.close();
});

test("whitespace is rejected and offline saves keep the draft until confirmed persistence", async ({
  page,
  context,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("   ");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter an offer name.");
  await page.getByLabel("Offer name").fill("Offline retained offer");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByRole("alert")).toContainText("not saved");
  await expect(page.getByLabel("Offer name")).toHaveValue(
    "Offline retained offer",
  );
  await expect(page).toHaveURL(/add-offer/);
  await context.setOffline(false);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/rpc/create_offer", async (route) => {
    await held;
    await route.continue();
  });
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Offline retained offer", exact: true }),
  ).toHaveCount(0);
  release();
  await expect(
    page.getByRole("heading", { name: "Offline retained offer", exact: true }),
  ).toBeVisible();
});

test("missing direct links recover and focus refresh keeps an unsaved form draft", async ({
  page,
}) => {
  await login(page);
  await page.goto("./#offer=missing");
  await expect(
    page.getByRole("heading", { name: "Offer unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to Unassigned" }).click();
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await page.getByLabel("Offer name").fill("Keep on focus");
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/offers?") &&
      response.request().method() === "GET",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(page.getByLabel("Offer name")).toHaveValue("Keep on focus");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
});

test("mobile offers reuse the draggable sheet and forms open fully with accessible back navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const panel = page.getByRole("complementary");
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
  let bounds = await panel.boundingBox();
  expect(bounds?.height).toBeCloseTo(214, 0);
  await page.getByRole("button", { name: "Expand station sheet" }).click();
  bounds = await panel.boundingBox();
  expect(bounds?.height).toBeCloseTo(844 * 0.46, 0);
  const handle = page.getByRole("button", { name: "Expand station sheet" });
  const box = await handle.boundingBox();
  if (!box) throw new Error("No sheet handle");
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y - 100, { steps: 5 });
  await page.mouse.up();
  bounds = await panel.boundingBox();
  expect(bounds?.height).toBeCloseTo(836, 0);
  await page.getByRole("button", { name: "Add offer", exact: true }).click();
  await expect(page.getByLabel("Offer name")).toBeVisible();
  bounds = await panel.boundingBox();
  expect(bounds?.height).toBeCloseTo(836, 0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Unassigned", exact: true }),
  ).toBeVisible();
});
