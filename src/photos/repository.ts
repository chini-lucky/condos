import type { SupabaseClient } from "@supabase/supabase-js";
export interface Photo {
  id: string;
  offerId: string;
  objectKey: string;
  position: number;
  state: "uploading" | "ready" | "deleting";
}
function decode(value: unknown): Photo {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid photo response");
  const field = (key: string): unknown =>
    Object.getOwnPropertyDescriptor(value, key)?.value;
  const id = field("id"),
    offerId = field("offer_id"),
    objectKey = field("object_key"),
    position = field("position"),
    state = field("state");
  if (
    typeof id !== "string" ||
    typeof offerId !== "string" ||
    typeof objectKey !== "string" ||
    typeof position !== "number" ||
    !Number.isSafeInteger(position) ||
    (state !== "uploading" && state !== "ready" && state !== "deleting")
  )
    throw new Error("Invalid photo response");
  return { id, offerId, objectKey, position, state };
}
function decodeList(value: unknown): Photo[] {
  if (!Array.isArray(value)) throw new Error("Invalid photo list");
  return value.map(decode);
}
export function photosRepository(client: SupabaseClient) {
  return {
    async list(offerId: string) {
      const result = await client
        .from("photo_assets")
        .select("*")
        .eq("offer_id", offerId)
        .eq("state", "ready")
        .order("position")
        .order("id");
      if (result.error)
        throw new Error("Photos could not be loaded. Please retry.");
      return decodeList(result.data);
    },
    async reserve(offerId: string, count: number, requestId: string) {
      const result = await client.rpc("reserve_photos", {
        p_offer_id: offerId,
        p_count: count,
        p_request_id: requestId,
      });
      if (result.error)
        throw new Error(
          result.error.message.includes("20 photos")
            ? "An offer can have at most 20 photos, including uploads in progress."
            : "Photos could not be reserved. Check your connection and retry.",
        );
      return decodeList(result.data).sort(
        (first, second) => first.position - second.position,
      );
    },
    async upload(photo: Photo, jpeg: Blob) {
      const result = await client.functions.invoke("upload-photo", {
        body: jpeg,
        headers: { "Content-Type": "image/jpeg", "x-reservation-id": photo.id },
      });
      if (result.error)
        throw new Error(
          "This photo could not be saved. Please retry; unfinished uploads will be cleaned up.",
        );
      const value: unknown = result.data;
      if (typeof value !== "object" || value === null)
        throw new Error("Invalid upload response");
      return decode(Object.getOwnPropertyDescriptor(value, "photo")?.value);
    },
    async cancel(ids: string[]) {
      const result = await client.rpc("cancel_photos", { p_ids: ids });
      if (result.error)
        throw new Error(
          "Cleanup could not be queued yet. Unfinished uploads expire automatically.",
        );
    },
    async signedUrl(objectKey: string, lifetime = 300) {
      let result = await client.storage
        .from("offer-photos")
        .createSignedUrl(objectKey, lifetime);
      if (result.error) {
        const refreshed = await client.auth.refreshSession();
        if (!refreshed.error)
          result = await client.storage
            .from("offer-photos")
            .createSignedUrl(objectKey, lifetime);
      }
      if (result.error || !result.data?.signedUrl)
        throw new Error(
          "Photo access could not be renewed. Check your connection and retry.",
        );
      return {
        url: result.data.signedUrl,
        expiresAt: Date.now() + lifetime * 1000,
      };
    },
    async cleanupStatus() {
      const result = await client
        .from("photo_cleanup")
        .select("last_error,attempts,completed_at")
        .is("completed_at", null);
      if (result.error || !Array.isArray(result.data))
        throw new Error("Cleanup status could not be loaded.");
      return {
        pending: result.data.length,
        failed: result.data.filter((row) => typeof row.last_error === "string")
          .length,
      };
    },
    async retryCleanup() {
      const result = await client.functions.invoke("photo-cleanup", {
        body: {},
      });
      if (result.error)
        throw new Error(
          "Cleanup retry failed. The scheduled worker will keep retrying.",
        );
    },
  };
}
export type PhotosRepository = ReturnType<typeof photosRepository>;
