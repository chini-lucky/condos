import { createClient } from "@supabase/supabase-js";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-reservation-id, x-cleanup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function adminClient(request: Request) {
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const user = await client.auth.getUser();
  if (
    user.error ||
    !user.data.user ||
    (await client.rpc("is_admin")).data !== true
  )
    throw new Error("Admin sign-in required");
  return client;
}
export async function boundedBody(
  request: Request,
  maximum: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get("Content-Length")) > maximum)
    throw new Error("Photo exceeds 10 MB");
  if (!request.body) throw new Error("Empty photo");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new Error("Photo exceeds 10 MB");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
