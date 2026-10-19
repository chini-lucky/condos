import { useEffect, useState } from "react";
import { signIn, supabase } from "./auth";
import "./app.css";
import { OffersWorkspace } from "./offers/OffersWorkspace";
export function App() {
  const [state, setState] = useState<"loading" | "signed-out" | "signed-in">(
    "loading",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let revision = 0;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const current = ++revision;
      if (!session) {
        setState("signed-out");
        return;
      }
      // Auth callbacks must finish before invoking another SDK operation.
      setTimeout(() => {
        void client
          .rpc("is_admin")
          .then(({ data: allowed, error: failure }) => {
            if (!active || current !== revision) return;
            setState(allowed === true && !failure ? "signed-in" : "signed-out");
            if (failure)
              setError("Unable to verify access. Please sign in again.");
          });
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const failure = await signIn(username, password);
      if (failure) setError(failure);
      else setPassword("");
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const result = await supabase?.auth.signOut();
      if (result?.error) setError("Unable to sign out. Please try again.");
    } catch {
      setError("Unable to sign out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!supabase)
    return (
      <main className="auth-shell">
        <h1>Condos</h1>
        <p role="alert">The application connection has not been configured.</p>
      </main>
    );
  if (state === "loading")
    return (
      <main className="auth-shell">
        <h1>Condos</h1>
        <p role="status">Checking your session…</p>
      </main>
    );
  if (state === "signed-in")
    return (
      <main>
        <header className="app-header">
          <h1>Condos</h1>
          <button
            disabled={busy}
            onClick={() => {
              void logout();
            }}
          >
            Sign out
          </button>
        </header>
        {error && <p role="alert">{error}</p>}
        <OffersWorkspace />
      </main>
    );
  return (
    <main className="auth-shell">
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <h1>Condos</h1>
        <p>Your Bangkok rental shortlist</p>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
