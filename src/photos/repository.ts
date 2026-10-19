import type { SupabaseClient } from "@supabase/supabase-js";
export interface Photo {
  id: string;
  offerId: string;
  objectKey: string;
  position: number;
  state: "uploading" | "ready" | "deleting";
}
export interface PhotoCollection {
  photos: Photo[];
  revision: number;
  coverId: string | null;
}
export class PhotoFailure extends Error {
  constructor(
    public readonly kind: "conflict" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}
function decodeCollection(value: unknown): PhotoCollection {
  if (typeof value !== "object" || value === null)
    throw new Error("Photos are unavailable.");
  const field = (key: string): unknown =>
    Object.getOwnPropertyDescriptor(value, key)?.value;
  const revision = field("revision"),
    coverId = field("cover_id");
  if (
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    (coverId !== null && typeof coverId !== "string")
  )
    throw new Error("Invalid photo collection");
  return { photos: decodeList(field("photos")), revision, coverId };
}
function mutationResult(
  data: unknown,
  error: { code: string } | null,
): PhotoCollection {
  if (error)
    throw new PhotoFailure(
      error.code === "40001" ? "conflict" : "unavailable",
      error.code === "40001"
        ? "Photos changed on another device or this offer is unavailable. Your order is kept. Review the latest photos before retrying."
        : "Photo changes were not saved. Check your connection and retry.",
    );
  return decodeCollection(data);
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
    async snapshot(offerId: string) {
      const result = await client.rpc("get_offer_photos", {
        p_offer_id: offerId,
      });
      if (result.error)
        throw new Error("Photos could not be loaded. Please retry.");
      return decodeCollection(result.data);
    },
    async reorder(offerId: string, revision: number, ids: string[]) {
      const result = await client.rpc("reorder_photos", {
        p_offer_id: offerId,
        p_expected_revision: revision,
        p_ids: ids,
      });
      return mutationResult(result.data, result.error);
    },
    async chooseCover(offerId: string, revision: number, photoId: string) {
      const result = await client.rpc("choose_photo_cover", {
        p_offer_id: offerId,
        p_expected_revision: revision,
        p_photo_id: photoId,
      });
      return mutationResult(result.data, result.error);
    },
    async remove(offerId: string, revision: number, photoId: string) {
      const result = await client.rpc("remove_photo", {
        p_offer_id: offerId,
        p_expected_revision: revision,
        p_photo_id: photoId,
      });
      return mutationResult(result.data, result.error);
    },
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
