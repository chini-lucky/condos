import { execFileSync } from "node:child_process";
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
  return {
    url: field("API_URL"),
    anonKey: field("ANON_KEY"),
    serviceKey: field("SERVICE_ROLE_KEY"),
  };
}
