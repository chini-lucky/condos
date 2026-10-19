const hevcBrands = new Set(["heic", "heix", "hevc", "hevx"]);
/** Inspect the ISO-BMFF ftyp box, never the filename or a browser-supplied MIME. */
export function isHeicContainer(header: Uint8Array, fileSize: number): boolean {
  if (
    header.length < 16 ||
    new TextDecoder().decode(header.subarray(4, 8)) !== "ftyp"
  )
    return false;
  const size = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  ).getUint32(0);
  if (
    size < 16 ||
    size > fileSize ||
    size > header.length ||
    (size - 16) % 4 !== 0
  )
    return false;
  const brand = (offset: number) =>
    new TextDecoder().decode(header.subarray(offset, offset + 4));
  if (hevcBrands.has(brand(8))) return true;
  for (let offset = 16; offset < size; offset += 4)
    if (hevcBrands.has(brand(offset))) return true;
  return false;
}
export async function decodeHeic(file: File): Promise<ImageBitmap> {
  try {
    const { heicTo } = await import("heic-to");
    // The maintained package decodes in its own Web Worker, including HEIF transforms.
    // Return pixels to the same JPEG encoder used by the other source formats.
    return await heicTo({ blob: file, type: "bitmap" });
  } catch {
    throw new Error(
      "This HEIC photo could not be decoded. It may be damaged or use an unsupported format. Choose another photo or export it as JPEG.",
    );
  }
}
