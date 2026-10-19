import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
for (const context of [
  {
    status: "Pending",
    field: "Waiting on",
    draft:
      "The agent has not confirmed whether pets are allowed in this building or when it will become available.",
    text: "The agent has not confirmed whether pets are allowed in this building or when it will become available.",
    summary: "The agent has not confirmed whether",
  },
  {
    status: "Pending",
    field: "Waiting on",
    draft: "Waiting for agent's availability",
    text: "Waiting for agent's availability",
  },
  {
    status: "Rejected",
    field: "Rejection reason",
    draft: "Bedroom faces a noisy main road",
    text: "Bedroom faces a noisy main road",
  },
  {
    status: "Viewing",
    field: "Viewing time (Bangkok)",
    draft: "2027-03-02T00:15",
    text: "2 Mar 2027, 00:15 (Bangkok)",
  },
]) {
  test(`${context.status} ${context.summary ? "long " : ""}context persists in the dossier, station card and visible callout`, async ({
    page,
  }) => {
    const name = `${context.status} visible context fixture`;
    try {
      await page.goto("./");
      await page.getByLabel("Username").fill("chini-lucky");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Disposable-local-test-password-9!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page
        .getByRole("button", { name: "Add offer", exact: true })
        .click();
      await page.getByLabel("Offer name").fill(name);
      await page.getByLabel("Station", { exact: true }).selectOption("E6");
      await page.getByLabel("Walking distance (metres)").fill("400");
      await page
        .getByLabel("Direction (degrees clockwise from north)")
        .fill("90");
      await page
        .getByRole("button", { name: "Save offer", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Change status or viewing", exact: true })
        .click();
      await page.getByLabel("Offer status").selectOption(context.status);
      await page.getByLabel(context.field, { exact: true }).fill(context.draft);
      await page
        .getByRole("button", { name: "Save status and viewing", exact: true })
        .click();
      await page.reload();
      const details = page.getByRole("complementary", {
        name: "Offer details",
      });
      await expect(
        details.getByText(context.text, { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Back", exact: true }).click();
      const card = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name, exact: true }) });
      const visible = context.summary ?? context.text;
      await expect(
        card.getByText(visible, { exact: !context.summary }),
      ).toBeVisible();
      const callout = page.getByRole("button", {
        name: `Details for ${name}`,
        exact: true,
      });
      await expect(
        callout.getByText(visible, { exact: !context.summary }),
      ).toBeVisible();
      const textBounds = await callout
        .getByText(visible, { exact: !context.summary })
        .boundingBox();
      const boxBounds = await callout.locator("..").boundingBox();
      if (!textBounds || !boxBounds)
        throw new Error("Missing visible callout context");
      expect(textBounds.y + textBounds.height).toBeLessThanOrEqual(
        boxBounds.y + boxBounds.height,
      );
    } finally {
      const config = localConfig();
      await createClient(config.url, config.serviceKey)
        .from("offers")
        .delete()
        .eq("name", name);
    }
  });
}
