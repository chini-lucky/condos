import type { SupabaseClient } from "@supabase/supabase-js";
export interface DeletionReceipt {
  offerId: string;
  name: string;
  deletedAt: string;
  pending: number;
  failed: number;
}
function decode(value: unknown): DeletionReceipt {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid deletion receipt");
  const field = (key: string): unknown =>
    Object.getOwnPropertyDescriptor(value, key)?.value;
  const offerId = field("offer_id"),
    name = field("name"),
    deletedAt = field("deleted_at"),
    pending = field("pending"),
    failed = field("failed");
  if (
    typeof offerId !== "string" ||
    typeof name !== "string" ||
    typeof deletedAt !== "string" ||
    !Number.isFinite(Date.parse(deletedAt)) ||
    typeof pending !== "number" ||
    !Number.isSafeInteger(pending) ||
    pending < 0 ||
    typeof failed !== "number" ||
    !Number.isSafeInteger(failed) ||
    failed < 0 ||
    failed > pending
  )
    throw new Error("Invalid deletion receipt");
  return { offerId, name, deletedAt, pending, failed };
}
export function deletionsRepository(client: SupabaseClient) {
  return {
    async list(): Promise<DeletionReceipt[]> {
      const result = await client.rpc("list_offer_deletions");
      if (result.error || !Array.isArray(result.data))
        throw new Error(
          "Deletion cleanup status could not be loaded. Please retry.",
        );
      return result.data.map(decode);
    },
    async permanentlyDelete(
      id: string,
      version: number,
    ): Promise<DeletionReceipt> {
      const result = await client.rpc("permanently_delete_offer", {
        p_id: id,
        p_expected_version: version,
      });
      if (result.error)
        throw new Error(
          result.error.code === "40001"
            ? "This offer changed or is no longer in Trash. Reload before deleting."
            : "Deletion was not confirmed. Check your connection and retry safely.",
        );
      return decode(result.data);
    },
    async retryCleanup(id: string): Promise<void> {
      const queued = await client.rpc("retry_offer_deletion_cleanup", {
        p_id: id,
      });
      if (queued.error)
        throw new Error("Cleanup could not be queued. Please retry.");
      const result = await client.functions.invoke("photo-cleanup", {
        body: {},
      });
      if (result.error)
        throw new Error(
          "Cleanup retry failed. The scheduled worker will keep retrying; the offer remains deleted.",
        );
    },
  };
}
export type DeletionsRepository = ReturnType<typeof deletionsRepository>;
