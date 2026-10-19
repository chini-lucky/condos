import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { preflightResponse } from "../supabase/functions/_shared/cors.ts";

test("Edge preflight permits the installed SDK upload and cleanup headers without a gateway rewriting the response", async () => {
  const requests: Request[] = [];
  const client = createClient(
    "https://condos-preflight.invalid",
    "public-test-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input, init) => {
          requests.push(new Request(input, init));
          return Response.json({ ok: true });
        },
      },
    },
  );
  await client.functions.invoke("upload-photo", {
    headers: {
      "Content-Type": "image/jpeg",
      "x-reservation-id": "00000000-0000-4000-8000-000000000001",
    },
    body: new Uint8Array([255, 216, 255, 217]),
  });
  await client.functions.invoke("photo-cleanup", { body: {} });
  assert.equal(requests.length, 2);
  for (const request of requests) {
    const requestedHeaders = [...request.headers.keys()];
    assert.ok(
      requestedHeaders.includes("x-client-info"),
      "SDK request must include its client metadata header",
    );
    const origin = "https://chini-lucky.github.io";
    const options = new Request(request.url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": request.method,
        "Access-Control-Request-Headers": requestedHeaders.join(", "),
      },
    });
    // This is exactly the response returned by both Edge OPTIONS branches;
    // no local Kong/Functions proxy can inject a permissive header here.
    const response = preflightResponse(options);
    assert.ok(response);
    assert.equal(response.status, 200);
    const allowedOrigin = response.headers.get("access-control-allow-origin");
    assert.ok(allowedOrigin === "*" || allowedOrigin === origin);
    const allowedMethods =
      response.headers
        .get("access-control-allow-methods")
        ?.split(",")
        .map((value) => value.trim().toUpperCase()) ?? [];
    assert.ok(allowedMethods.includes("POST"));
    const allowedHeaders = new Set(
      response.headers
        .get("access-control-allow-headers")
        ?.split(",")
        .map((value) => value.trim().toLowerCase()),
    );
    const missing = requestedHeaders.filter(
      (header) => !allowedHeaders.has(header.toLowerCase()),
    );
    assert.deepEqual(
      missing,
      [],
      `${new URL(request.url).pathname} preflight must allow every actual SDK header`,
    );
    assert.equal(
      preflightResponse(request),
      null,
      "POST must continue to the authenticated endpoint handler",
    );
  }
});
