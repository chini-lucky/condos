import type { SupabaseClient } from "@supabase/supabase-js";

/** Process a leased, durable batch through the real Storage boundary. */
export async function runPhotoCleanup(service: SupabaseClient) {
  const jobs = await service.rpc("claim_photo_cleanup", { p_limit: 20 });
  if (jobs.error || !Array.isArray(jobs.data))
    throw new Error("Cleanup queue unavailable");
  let completed = 0;
  for (const job of jobs.data) {
    let failure: string | null = null;
    try {
      const removed = await service.storage
        .from("offer-photos")
        .remove([job.object_key]);
      if (removed.error) throw new Error("Storage deletion failed");
      const slash = job.object_key.lastIndexOf("/");
      const folder = slash < 0 ? "" : job.object_key.slice(0, slash);
      const name = job.object_key.slice(slash + 1);
      // Storage versions differ in HEAD/exists support. A successful bounded
      // folder listing verifies absence without treating a permission error as deletion.
      const remaining = await service.storage
        .from("offer-photos")
        .list(folder, { search: name, limit: 1000 });
      if (
        remaining.error ||
        remaining.data.some((object) => object.name === name)
      )
        throw new Error("Could not verify photo removal");
      completed++;
    } catch (error) {
      failure =
        error instanceof Error ? error.message : "Storage cleanup failed";
    }
    const saved = await service.rpc("finish_photo_cleanup", {
      p_key: job.object_key,
      p_lease: job.lease_id,
      p_error: failure,
    });
    if (saved.error)
      throw new Error(
        "Cleanup progress could not be saved; the lease will retry",
      );
  }
  return { processed: jobs.data.length, completed };
}
