import { validatePublicConfig } from "./public-config.ts";
validatePublicConfig(
  process.env.VITE_SUPABASE_URL ?? "",
  process.env.VITE_SUPABASE_ANON_KEY ?? "",
);
console.log("Browser configuration targets Condos with a public key.");
