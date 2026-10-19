import jpeg from "jpeg-js";
// Reject oversized headers before allocating decoder buffers. Decode actual image data,
// then re-encode pixels: no EXIF/GPS, comments or untrusted trailing bytes survive.
export function normalizeJpeg(bytes: Uint8Array) {
  if (
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    throw new Error("A complete JPEG is required");
  let offset = 2;
  let found = false;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 255) throw new Error("Invalid JPEG header");
    const marker = bytes[offset + 1];
    if (marker === 255) {
      offset++;
      continue;
    }
    if (marker === 218 || marker === 217) break;
    const length = (bytes[offset + 2] ?? 0) * 256 + (bytes[offset + 3] ?? 0);
    if (length < 2 || offset + 2 + length > bytes.length)
      throw new Error("Invalid JPEG segment");
    if (marker === 192 || marker === 193 || marker === 194) {
      const height = (bytes[offset + 5] ?? 0) * 256 + (bytes[offset + 6] ?? 0);
      const width = (bytes[offset + 7] ?? 0) * 256 + (bytes[offset + 8] ?? 0);
      if (width < 1 || height < 1 || width > 1600 || height > 1600)
        throw new Error("JPEG must be at most 1600 pixels per side");
      found = true;
    }
    offset += 2 + length;
  }
  if (!found) throw new Error("Unsupported JPEG header");
  const image = jpeg.decode(bytes, {
    useTArray: true,
    tolerantDecoding: false,
    maxResolutionInMP: 3,
    maxMemoryUsageInMB: 64,
  });
  if (image.width > 1600 || image.height > 1600)
    throw new Error("JPEG exceeds display dimensions");
  const output = jpeg.encode(
    { data: image.data, width: image.width, height: image.height },
    80,
  );
  return { bytes: output.data, width: image.width, height: image.height };
}
