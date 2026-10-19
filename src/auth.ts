import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase =
  typeof url === "string" && typeof key === "string" && url && key
    ? createClient(url, key)
    : null;
export async function signIn(
  username: string,
  password: string,
): Promise<string | null> {
  if (!supabase) return "The application connection has not been configured.";
  if (username.trim() !== "chini-lucky")
    return "Username or password is incorrect.";
  const result = await supabase.auth.signInWithPassword({
    email: "chini-lucky@condos.invalid",
    password,
  });
  if (result.error)
    return result.error.status === 400
      ? "Username or password is incorrect."
      : "Unable to sign in. Check your connection and try again.";
  const access = await supabase.rpc("is_admin");
  if (access.error || access.data !== true) {
    await supabase.auth.signOut();
    return "This account does not have access to Condos.";
  }
  return null;
}
