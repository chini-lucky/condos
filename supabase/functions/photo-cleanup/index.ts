import { adminClient, cors, response, serviceClient } from "../_shared/http.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST") return response({ error: "Use POST" }, 405);
  const expected = Deno.env.get("PHOTO_CLEANUP_SECRET");
  const scheduled =
    expected && request.headers.get("x-cleanup-secret") === expected;
  if (!scheduled) {
    try {
      await adminClient(request);
    } catch {
      return response({ error: "Admin sign-in required" }, 403);
    }
  }
  const service = serviceClient();
  const jobs = await service.rpc("claim_photo_cleanup", { p_limit: 20 });
  if (jobs.error || !Array.isArray(jobs.data))
    return response({ error: "Cleanup queue unavailable" }, 503);
  let completed = 0;
  for (const job of jobs.data) {
    let failure: string | null = null;
    try {
      const removed = await service.storage
        .from("offer-photos")
        .remove([job.object_key]);
      if (removed.error) throw new Error("Storage deletion failed");
      const remaining = await service.storage
        .from("offer-photos")
        .exists(job.object_key);
      if (remaining.error || remaining.data)
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
      return response(
        { error: "Cleanup progress could not be saved; the lease will retry" },
        503,
      );
  }
  return response({ processed: jobs.data.length, completed });
});
