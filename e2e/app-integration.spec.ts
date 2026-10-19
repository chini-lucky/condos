import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../scripts/local-config.ts";
const config = localConfig();
for (const viewport of [
  { name: "desktop", size: { width: 1280, height: 720 } },
  { name: "phone", size: { width: 390, height: 844 } },
]) {
  test(`gallery controls retain keyboard access and visible upload failures on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport.size);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const db = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    const signedIn = await db.auth.signInWithPassword({
      email: "chini-lucky@condos.invalid",
      password: "Disposable-local-test-password-9!",
    });
    expect(signedIn.error).toBeNull();
    const result = await db.rpc("create_offer_details", {
      p_name: "Garden residence",
      p_patch: {
        station_id: "E6",
        walking_metres: 400,
        bearing: 95,
        rent: 24500,
        property_type: "condominium",
        size_sqm: 42,
        beds: 1,
        floor: 8,
        washer: true,
        garden: true,
        pool: false,
        microwave: null,
        agent_name: "Local agent",
        agent_company: "Independent",
        agent_phone: "0812345678",
      },
    });
    expect(result.error).toBeNull();
    const service = createClient(config.url, config.serviceKey);
    const fixtureIds: string[] = [result.data.id];
    try {
      for (const fixture of [
        {
          name: "Quiet garden townhouse",
          station: "E6",
          distance: 750,
          bearing: 210,
          rent: 29500,
          status: "Viewing",
        },
        {
          name: "Riverside studio",
          station: "E6",
          distance: 200,
          bearing: 330,
          rent: 18000,
          status: "Rejected",
        },
        {
          name: "Ari corner residence",
          station: "N5",
          distance: 550,
          bearing: 60,
          rent: 21000,
          status: "Available",
        },
      ]) {
        const added = await db.rpc("create_offer_details", {
          p_name: fixture.name,
          p_patch: {
            station_id: fixture.station,
            walking_metres: fixture.distance,
            bearing: fixture.bearing,
            rent: fixture.rent,
            property_type: fixture.name.includes("townhouse")
              ? "townhouse"
              : "condominium",
            beds: fixture.name.includes("studio") ? 0 : 1,
            washer: true,
            garden: null,
            pool: false,
            microwave: true,
          },
        });
        expect(added.error).toBeNull();
        fixtureIds.push(added.data.id);
        const status = await db.rpc("update_offer_status", {
          p_id: added.data.id,
          p_expected_version: added.data.version,
          p_status: fixture.status,
          p_pending_explanation: null,
          p_rejection_reason:
            fixture.status === "Rejected" ? "Road noise" : null,
          p_viewing_at:
            fixture.status === "Viewing" ? "2027-03-02T07:15:00Z" : null,
        });
        expect(status.error).toBeNull();
      }
      await page.goto(`./#offer=${result.data.id}`);
      await page.getByLabel("Username").fill("chini-lucky");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Disposable-local-test-password-9!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Garden residence", exact: true }),
      ).toBeVisible();
      const chooser = page.getByLabel("Choose photos");
      await expect(chooser).toBeHidden();
      await page.getByText("Add photos", { exact: true }).click();
      await expect(chooser).toBeVisible();
      await chooser.setInputFiles([
        "tests/fixtures/photos/oriented-gps.jpg",
        "tests/fixtures/photos/landscape.webp",
      ]);
      await page
        .getByRole("button", { name: "Upload selected photos" })
        .click();
      await expect(
        page.getByRole("img", { name: "Offer photo 1 of 2" }),
      ).toBeVisible();
      const next = page.getByRole("button", {
        name: "Next photo",
        exact: true,
      });
      await next.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("img", { name: "Offer photo 2 of 2" }),
      ).toBeVisible();
      await chooser.setInputFiles({
        name: "broken.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([255, 216, 255, 1]),
      });
      await page
        .getByRole("button", { name: "Upload selected photos" })
        .click();
      await expect(
        page.getByRole("button", { name: "Retry failed photos" }),
      ).toBeVisible();
      await page.getByText("Add photos", { exact: true }).click();
      await expect(chooser).toBeHidden();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Retry failed photos" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Remove selected broken.jpg" })
        .click();
      await page.reload();
      await expect(
        page.getByRole("img", { name: "Offer photo 1 of 2" }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-dossier.png`),
      });
      await page
        .getByRole("button", { name: "Edit offer", exact: true })
        .click();
      await expect(page.getByLabel("Offer name")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-form.png`),
      });
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await expect(
        page.getByRole("link", { name: "Garden residence", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "Garden residence cover photo" }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-station.png`),
      });
      if (viewport.name === "phone") {
        await page
          .getByRole("button", { name: "Expand station sheet", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "Garden residence", exact: true }),
        ).toBeInViewport();
        await page.screenshot({
          path: testInfo.outputPath("phone-station-expanded.png"),
        });
      }
      await page
        .getByRole("button", { name: "All stations", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Browse Thong Lo", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Condos Bangkok", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-overview.png`),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      const photos = await service
        .from("offer_photos")
        .select("object_key")
        .eq("offer_id", result.data.id);
      if (photos.data?.length)
        await service.storage
          .from("offer-photos")
          .remove(photos.data.map((photo) => photo.object_key));
      await service.from("offers").delete().in("id", fixtureIds);
    }
  });
}
