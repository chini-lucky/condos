import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("real HEIC decodes without native support, preserves rotation/mirroring, strips metadata and uses the existing JPEG size pipeline", async ({
  page,
  browserName,
}) => {
  await page.goto("./");
  for (const [name, width, height, first] of [
    ["basic.heic", 64, 32, "red"],
    ["rotated-gps.heic", 800, 1600, "red"],
    ["mirrored.heic", 80, 40, "blue"],
  ] as const) {
    const bytes = [...(await readFile(`tests/fixtures/heic/${name}`))];
    const result = await page.evaluate(
      async ({ bytes, name }) => {
        const file = new File([new Uint8Array(bytes)], name, { type: "" });
        let native = false;
        try {
          const bitmap = await createImageBitmap(file);
          bitmap.close();
          native = true;
        } catch {
          /* native unavailable is expected in Chromium */
        }
        const modulePath = "/condos/src/photos/process.ts";
        const { processPhoto } = await import(/* @vite-ignore */ modulePath);
        const output: Blob = await processPhoto(file);
        const bitmap = await createImageBitmap(output);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw Error("Canvas missing");
        context.drawImage(bitmap, 0, 0);
        const pixel = [...context.getImageData(2, 2, 1, 1).data];
        const last = [
          ...context.getImageData(bitmap.width - 3, bitmap.height - 3, 1, 1)
            .data,
        ];
        const data = new Uint8Array(await output.arrayBuffer());
        return {
          native,
          width: bitmap.width,
          height: bitmap.height,
          pixel,
          last,
          type: output.type,
          text: new TextDecoder().decode(data),
          bytes: output.size,
        };
      },
      { bytes, name },
    );
    if (browserName === "chromium") expect(result.native).toBe(false);
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.type).toBe("image/jpeg");
    expect(result.bytes).toBeLessThan(10 * 1024 * 1024);
    expect(result.text).not.toContain("Exif");
    expect(result.text).not.toContain("SYNTHETIC-GPS-METADATA");
    expect(result.pixel[first === "red" ? 0 : 2]).toBeGreaterThan(220);
    expect(result.pixel[first === "red" ? 2 : 0]).toBeLessThan(30);
    expect(result.last[first === "red" ? 2 : 0]).toBeGreaterThan(220);
  }
});

test("a browser without workers gets an actionable HEIC error without loading the codec", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "Worker", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("./");
  const bytes = [...(await readFile("tests/fixtures/heic/basic.heic"))];
  const error = await page.evaluate(async (bytes) => {
    const path = "/condos/src/photos/process.ts";
    const { processPhoto } = await import(/* @vite-ignore */ path);
    try {
      await processPhoto(new File([new Uint8Array(bytes)], "phone.heic"));
      return "accepted";
    } catch (error) {
      return error instanceof Error ? error.message : "failed";
    }
  }, bytes);
  expect(error).toContain("browser");
  expect(error).toContain("JPEG");
  expect(requests.some((url) => url.includes("heic-to"))).toBe(false);
});
