# Local development

Use Node 24+, npm, Docker and Supabase CLI (2.121.0 was verified). This project uses an independent `condos-local` stack on 564xx, separate from Lola. Keep only one Condos stack running at a time. Run all commands from your assigned Condos worktree. Never link or reset production during development.

Follow the complete [setup and verification commands in the README](../README.md#local-development), including starting the photo Edge functions before running tests. The CLI prints disposable local keys during startup; keep its output private. `npm run local:env` writes only the browser-safe URL/anon key to ignored `.env.local`.

`npm test` provisions disposable local test accounts and resets the local admin password to the test password. It exercises domain, database, authorization, real Storage and Edge behavior. Never run it against production. `npm run test:e2e` starts Vite on 5283, or `CONDOS_E2E_PORT`, and tests against real local Supabase.

`npm run check` runs TypeScript, ESLint and Prettier; `npm run build` verifies the production bundle. CI starts a fresh isolated stack and runs backend, automatic cleanup and browser checks. Hold `flock /tmp/condos-verification.lock` across each local database/authentication/Storage/browser verification block. Coordinate migration changes and function-server restarts with other users of the stack.

`supabase stop` stops only this configured stack. `supabase db reset --local` destroys this local project's data and reapplies migrations; do this only when nobody else uses the stack, then rerun setup. Keep production and Lola independent.

## Admin provisioning

Registration is disabled globally, while the email/password provider remains enabled. There are no roles or registration UI. The visible username maps to `chini-lucky@condos.invalid`. The `admin_identity` singleton is written only by trusted service-role tooling; RLS and the `is_admin()` helper identify the specific provisioned UUID. Private tables and Storage policies use that identity rather than permitting every authenticated account.

For a real local admin password instead of disposable tests:

`node scripts/create-admin.ts local /absolute/path/outside/repo/password.txt`

For authorized hosted provisioning, use the project reference instead of `local`, after migrations and disabling public registration in that project. The CLI must already be authenticated. The script reads the service key in memory, reuses an existing owner-only password file, or creates a 43-character random password file with mode 600 and exclusive creation. It never prints passwords or service keys. Reruns reconcile the same identity and allowlist after partial failure. Use the pre-existing private Condos password file for production; do not generate a replacement unless needed. Do not place any password file inside a repository or shared folder. Supabase administration handles password recovery; update the password manager/local file after a reset.

The browser uses Supabase's persisted, auto-refreshed sessions and subscribes to auth changes. Expired sessions return to login when refresh fails; logout propagates to other tabs. A valid Supabase account that is not the provisioned admin cannot open the private app. Never expose service-role keys through `VITE_` variables.

## Dependencies

Supabase's official JavaScript SDK supplies Auth and PostgREST access. Playwright tests real browser journeys; Node's built-in test runner tests domain and database interfaces. ESLint, typescript-eslint and React Hooks lint enforce TypeScript/React correctness, and Prettier provides consistent formatting. These tools are scoped to their concrete runtime/checking needs.

## Photos and local Edge functions

Photos require the local Edge endpoints as well as the database/Storage. After migrations and the disposable admin setup, run `node scripts/configure-local-photos.ts` under the shared verification lock. This writes the disposable worker environment to owner-only `/tmp/condos-photo-functions.env`, stores matching local Vault values, and disables the scheduled job while ordinary tests manipulate fixtures. Serve with `supabase functions serve --no-verify-jwt --env-file /tmp/condos-photo-functions.env`, then `node scripts/wait-local-functions.ts`. Keep this process running for photo integration/browser checks. The endpoints authenticate requests themselves; bypassing gateway JWT verification does not grant access.

`flock /tmp/condos-verification.lock node scripts/verify-local-photo-scheduler.ts` temporarily enables the actual one-minute pg_cron/pg_net job, writes a cancelled-upload fixture, waits at most 70 seconds for physical removal without a browser request, and disables the job afterward. Never run this local tooling against a hosted project. CI starts the endpoints, runs the ordinary tests, then separately verifies the scheduler.
