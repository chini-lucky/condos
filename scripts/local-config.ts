import { execFileSync } from "node:child_process";
export function validateLocalUrl(value: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "56421"
  )
    throw new Error(
      "Disposable tooling must use the isolated local Condos API on 127.0.0.1:56421.",
    );
}
export function localConfig() {
  const value: unknown = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  function field(key: string): string {
    if (typeof value !== "object" || value === null)
      throw new Error("Invalid Supabase status");
    const found: unknown = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (typeof found !== "string")
      throw new Error(`Missing local Supabase ${key}`);
    return found;
  }
  const url = field("API_URL");
  validateLocalUrl(url);
  return {
    url,
    anonKey: field("ANON_KEY"),
    serviceKey: field("SERVICE_ROLE_KEY"),
  };
}
