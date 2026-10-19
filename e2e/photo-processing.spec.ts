import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public photo processing preserves EXIF orientation, strips GPS, sizes without upscaling and flattens transparency", async ({
  page,
}) => {
  await page.goto("./");
  for (const [name, type, width, height, firstPixel] of [
    ["oriented-gps.jpg", "image/jpeg", 20, 40, "red"],
    ["landscape.webp", "image/webp", 40, 20, "red"],
    ["transparent.png", "image/png", 1600, 800, "white"],
  ] as const) {
    const bytes = [...(await readFile(`tests/fixtures/photos/${name}`))];
    const result = await page.evaluate(
      async ({ bytes, name, type }) => {
        const modulePath = "/condos/src/photos/process.ts";
        const { processPhoto } = await import(/* @vite-ignore */ modulePath);
        const output: Blob = await processPhoto(
          new File([new Uint8Array(bytes)], name, { type }),
        );
        const bitmap = await createImageBitmap(output);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(bitmap, 0, 0);
        return {
          width: bitmap.width,
          height: bitmap.height,
          type: output.type,
          text: new TextDecoder().decode(await output.arrayBuffer()),
          pixel: [...context.getImageData(2, 2, 1, 1).data],
        };
      },
      { bytes, name, type },
    );
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.type).toBe("image/jpeg");
    expect(result.text).not.toContain("Exif");
    if (firstPixel === "white")
      expect(result.pixel.slice(0, 3).every((value) => value > 245)).toBe(true);
    else {
      expect(result.pixel[0]).toBeGreaterThan(220);
      expect(result.pixel[2]).toBeLessThan(30);
    }
  }
  const failures = await page.evaluate(async () => {
    const modulePath = "/condos/src/photos/process.ts";
    const { processPhoto } = await import(/* @vite-ignore */ modulePath);
    const cases = [
      new File(["not a JPEG"], "spoof.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      }),
      new File([new Uint8Array([255, 216, 255, 1])], "broken.jpg", {
        type: "image/jpeg",
      }),
    ];
    return Promise.all(
      cases.map(async (file) => {
        try {
          await processPhoto(file);
          return "accepted";
        } catch (error) {
          return error instanceof Error ? error.message : "failed";
        }
      }),
    );
  });
  expect(failures[0]).toContain("JPEG, PNG, WebP or HEIC");
  expect(failures[1]).toContain("10 MB");
  expect(failures[2]).toContain("decoded");
});
