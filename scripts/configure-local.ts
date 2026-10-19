import { writeFileSync } from "node:fs";
import { localConfig } from "./local-config.ts";
const config = localConfig();
writeFileSync(
  ".env.local",
  `VITE_SUPABASE_URL=${config.url}\nVITE_SUPABASE_ANON_KEY=${config.anonKey}\n`,
  { mode: 0o600 },
);
console.log("Configured browser-safe local connection.");
