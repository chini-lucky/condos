export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-reservation-id, x-cleanup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function preflightResponse(request: Request): Response | null {
  return request.method === "OPTIONS"
    ? new Response(null, { headers: cors })
    : null;
}
