# Local development

Use Node 24+, npm, Docker and Supabase CLI (2.121.0 was verified). This project uses an independent `condos-local` stack on 564xx, separate from Lola. Keep only one Condos stack running at a time. Run all commands from your assigned Condos worktree. Never link or reset production during development.

1. `npm ci`
2. `supabase start > /tmp/condos-start.log 2>&1` (the CLI prints disposable local keys; do not publish the log).
3. `npm run local:env` writes only the browser-safe URL/anon key to ignored `.env.local`.
4. `npm test` provisions **disposable local test** accounts and verifies admin-only database access. It resets the local admin password to the disposable password in the browser tests; never run against production.
5. `npx playwright install chromium`
6. `npm run test:e2e` starts Vite on 5283 and tests against real local Supabase.
7. `npm run dev -- --port 5183 --strictPort` for interactive development.

`npm run check` runs TypeScript, ESLint and Prettier. `npm run build` verifies the production bundle. `npm test` runs Node behavior/database integration tests; later tickets add domain tests here. CI runs these and browser tests. `supabase stop` stops only this configured stack. `supabase db reset` destroys/recreates this local project's data and reapplies migrations; rerun the setup afterward.

## Admin provisioning

Registration is disabled globally, while the email/password provider remains enabled. There are no roles or registration UI. The visible username maps to `chini-lucky@condos.invalid`. The `admin_identity` singleton is written only by trusted service-role tooling; RLS and the `is_admin()` helper identify the specific provisioned UUID. Later private tables and Storage policies must use that helper, not merely permit all authenticated accounts.

For a real local admin password instead of disposable tests:

`node scripts/create-admin.ts local /absolute/path/outside/repo/password.txt`

For authorized hosted provisioning, use the project reference instead of `local`, after migrations and disabling public registration in that project. The CLI must already be authenticated. The script reads the service key in memory, reuses an existing owner-only password file, or creates a 43-character random password file with mode 600 and exclusive creation. It never prints passwords or service keys. Reruns reconcile the same identity and allowlist after partial failure. Use the pre-existing private Condos password file for production; do not generate a replacement unless needed. Do not place any password file inside a repository or shared folder. Supabase administration handles password recovery; update the password manager/local file after a reset.

The browser uses Supabase's persisted, auto-refreshed sessions and subscribes to auth changes. Expired sessions return to login when refresh fails; logout propagates to other tabs. A valid Supabase account that is not the provisioned admin cannot open the private app. Never expose service-role keys through `VITE_` variables.

## Dependencies

Supabase's official JavaScript SDK supplies Auth and PostgREST access. Playwright tests real browser journeys; Node's built-in test runner tests domain and database interfaces. ESLint, typescript-eslint and React Hooks lint enforce TypeScript/React correctness, and Prettier provides consistent formatting. These tools are scoped to their concrete runtime/checking needs.
