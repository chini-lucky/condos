import { expect, test } from "@playwright/test";

test("browse outer stations and select stations by keyboard", async ({
  page,
}) => {
  await page.goto("e2e/rail.html");
  await page.getByLabel("Choose a station").selectOption("N24");
  await expect(
    page.getByRole("heading", { name: "Khu Khot", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Nothing on file here yet.")).toBeVisible();
  await page.getByRole("button", { name: "All stations", exact: true }).click();
  await page.getByRole("button", { name: "Select Siam", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Siam", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: /Condos/ })).toBeVisible();
  await page.getByLabel("Choose a station").selectOption("E4");
  await expect(
    page
      .getByRole("complementary", { name: "Station details" })
      .getByLabel("MRT Blue", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose a station").selectOption("E23");
  await expect(
    page.getByRole("heading", { name: "Kheha", exact: true }),
  ).toBeVisible();
});

test("phone sheet opens, expands and browses the western terminus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("e2e/rail.html");
  await page.getByLabel("Choose a station").selectOption("BL38");
  await expect(
    page.getByRole("heading", { name: "Lak Song", exact: true }),
  ).toBeVisible();
  const handle = page.getByRole("button", { name: "Expand station sheet" });
  await handle.click();
  await expect(page.getByText("Nothing on file here yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeHidden();
  await handle.click();
  await expect(
    page.getByRole("button", { name: "Collapse station sheet" }),
  ).toBeVisible();
});

test("map responds to wheel, keyboard, double click and mouse drag", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("e2e/rail.html");
  const map = page.getByRole("group", { name: "Bangkok rail map" });
  const original = await map.getAttribute("viewBox");
  await map.focus();
  await page.keyboard.press("+");
  await expect(map).not.toHaveAttribute("viewBox", original ?? "");
  const zoomed = await map.getAttribute("viewBox");
  await page.keyboard.press("ArrowRight");
  await expect(map).not.toHaveAttribute("viewBox", zoomed ?? "");
  await page.mouse.move(1100, 300);
  const beforeWheel = await map.getAttribute("viewBox");
  await page.mouse.wheel(0, -200);
  await expect(map).not.toHaveAttribute("viewBox", beforeWheel ?? "");
  const beforeDrag = await map.getAttribute("viewBox");
  await page.mouse.move(1100, 300);
  await page.mouse.down();
  await page.mouse.move(1150, 350, { steps: 5 });
  await page.mouse.up();
  await expect(map).not.toHaveAttribute("viewBox", beforeDrag ?? "");
  const beforeDouble = await map.getAttribute("viewBox");
  await page.mouse.dblclick(1100, 300);
  await expect(map).not.toHaveAttribute("viewBox", beforeDouble ?? "");
});

test("touch gestures pan and pinch the network", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}e2e/rail.html`);
  const map = page.getByRole("group", { name: "Bangkok rail map" });
  const session = await context.newCDPSession(page);
  const initial = await map.getAttribute("viewBox");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 100, y: 200, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 150, y: 230, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(map).not.toHaveAttribute("viewBox", initial ?? "");
  const panned = await map.getAttribute("viewBox");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 100, y: 250, id: 1 },
      { x: 250, y: 250, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 60, y: 250, id: 1 },
      { x: 290, y: 250, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(map).not.toHaveAttribute("viewBox", panned ?? "");
  await context.close();
});

test("dragging the mobile sheet up advances one snap point", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("e2e/rail.html");
  await page.getByLabel("Choose a station").selectOption("BL38");
  const handle = page.getByRole("button", { name: "Expand station sheet" });
  const position = await handle.boundingBox();
  if (!position) throw new Error("Sheet handle missing");
  await page.mouse.move(position.x + 80, position.y + 10);
  await page.mouse.down();
  await page.mouse.move(position.x + 80, position.y - 90, { steps: 5 });
  await page.mouse.up();
  const panel = page.getByRole("complementary", { name: "Station details" });
  await expect
    .poll(async () => (await panel.boundingBox())?.height)
    .toBeCloseTo(388.234, 0);
});
