import { isHeicContainer, decodeHeic } from "./heic";
export const maximumPhotoBytes = 10 * 1024 * 1024;
/** Decode supported sources to oriented pixels, then use one metadata-free JPEG pipeline. */
export async function processPhoto(file: File): Promise<Blob> {
  if (file.size > maximumPhotoBytes)
    throw new Error("Each source photo must be 10 MB or smaller.");
  const header = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const heic = isHeicContainer(header, file.size);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => header[index] === value,
  );
  const webp =
    new TextDecoder().decode(header.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
  if (!jpeg && !png && !webp && !heic)
    throw new Error("Choose a JPEG, PNG, WebP or HEIC photo.");
  if (
    !heic &&
    file.type &&
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP or HEIC photo.");
  let bitmap: ImageBitmap;
  try {
    bitmap = heic
      ? await decodeHeic(file)
      : await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (heic && error instanceof Error) throw error;
    throw new Error(
      "This photo could not be decoded. Choose another file or retry.",
      { cause: error },
    );
  }
  try {
    return await encodePhoto(bitmap);
  } finally {
    bitmap.close();
  }
}
/** Rasterize decoded, already-oriented pixels. Never fall back to source bytes. */
export async function encodePhoto(image: ImageBitmap): Promise<Blob> {
  if (image.width < 1 || image.height < 1)
    throw new Error("This photo has no displayable pixels.");
  const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Photo conversion is unavailable in this browser.");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const output = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8),
  );
  canvas.width = 0;
  canvas.height = 0;
  if (
    !output ||
    output.type !== "image/jpeg" ||
    output.size > maximumPhotoBytes
  )
    throw new Error(
      "Photo conversion failed. Please retry with another image.",
    );
  return output;
}
