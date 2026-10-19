import {
  adminClient,
  boundedBody,
  cors,
  response,
  serviceClient,
} from "../_shared/http.ts";
import { normalizeJpeg } from "../_shared/jpeg.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST") return response({ error: "Use POST" }, 405);
  let client;
  try {
    client = await adminClient(request);
  } catch {
    return response({ error: "Admin sign-in required" }, 403);
  }
  const id = request.headers.get("x-reservation-id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return response({ error: "A photo reservation is required" }, 400);
  try {
    const target = await client.rpc("photo_upload_target", { p_id: id });
    if (target.error || !target.data?.id)
      return response(
        { error: "Upload expired or offer unavailable. Retry this photo." },
        409,
      );
    if (target.data.state === "ready") return response({ photo: target.data });
    if (request.headers.get("Content-Type") !== "image/jpeg")
      throw new Error("Upload a converted JPEG");
    const image = normalizeJpeg(await boundedBody(request, 10 * 1024 * 1024));
    const service = serviceClient();
    const stored = await service.storage
      .from("offer-photos")
      .upload(target.data.object_key, image.bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
    let metadata = {
      byteSize: image.bytes.length,
      width: image.width,
      height: image.height,
    };
    if (stored.error) {
      // A second request may have stored the same immutable reservation. Finalize only
      // that server-validated object; arbitrary browser writes are forbidden by RLS.
      if (stored.error.message !== "The resource already exists")
        throw new Error("Photo could not be stored. Retry this photo.");
      const existing = await service.storage
        .from("offer-photos")
        .download(target.data.object_key);
      if (
        existing.error ||
        !existing.data ||
        existing.data.size > 10 * 1024 * 1024
      )
        throw new Error(
          "The previous upload could not be recovered. Please retry.",
        );
      const pixels = normalizeJpeg(
        new Uint8Array(await existing.data.arrayBuffer()),
      );
      metadata = {
        byteSize: existing.data.size,
        width: pixels.width,
        height: pixels.height,
      };
    }
    const finalized = await service.rpc("finalize_photo", {
      p_id: id,
      p_bytes: metadata.byteSize,
      p_width: metadata.width,
      p_height: metadata.height,
    });
    if (finalized.error || !finalized.data?.id)
      return response(
        {
          error:
            "Photo could not be attached. Cleanup is queued; retry this photo.",
        },
        409,
      );
    return response({ photo: finalized.data });
  } catch (error) {
    // Cancellation is durable even if another in-flight request writes after this response.
    await client.rpc("cancel_photos", { p_ids: [id] });
    return response(
      {
        error:
          error instanceof Error
            ? error.message
            : "Photo upload failed. Retry this photo.",
      },
      400,
    );
  }
});
