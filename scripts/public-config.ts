import { production } from "./production-target.ts";
export function validatePublicConfig(url: string, key: string): void {
  if (url !== `https://${production.projectRef}.supabase.co`)
    throw new Error("Frontend must target the dedicated Condos project.");
  if (key.startsWith("sb_publishable_")) return;
  const payload = key.split(".")[1];
  if (payload) {
    try {
      const value: unknown = JSON.parse(
        Buffer.from(payload, "base64url").toString(),
      );
      if (
        typeof value === "object" &&
        value !== null &&
        "role" in value &&
        value.role === "anon"
      )
        return;
    } catch {
      /* reject malformed keys below */
    }
  }
  throw new Error(
    "Only a browser-safe publishable or anon key may enter the frontend.",
  );
}
