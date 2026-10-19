import { runPhotoCleanup } from "../_shared/cleanup.ts";
import { adminClient, cors, response, serviceClient } from "../_shared/http.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST") return response({ error: "Use POST" }, 405);
  const expected = Deno.env.get("PHOTO_CLEANUP_SECRET");
  const actual = request.headers.get("x-cleanup-secret") ?? "";
  let difference = (expected?.length ?? 0) ^ actual.length;
  for (let index = 0; index < (expected?.length ?? 0); index++) {
    difference |=
      (expected?.charCodeAt(index) ?? 0) ^ (actual.charCodeAt(index) || 0);
  }
  const scheduled = Boolean(expected && difference === 0);
  if (!scheduled) {
    try {
      await adminClient(request);
    } catch {
      return response({ error: "Admin sign-in required" }, 403);
    }
  }
  try {
    return response(await runPhotoCleanup(serviceClient()));
  } catch (error) {
    return response(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cleanup failed; queued jobs will retry",
      },
      503,
    );
  }
});
