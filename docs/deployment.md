# Production deployment

Condos runs at https://chini-lucky.github.io/condos/ with Supabase project `sthwmiesffowystewspf` (Condos), organization `uwqbnztfghduyuqacdnj` (chini-lucky), Singapore `ap-southeast-1`. The organization was verified Free during setup. Lola is a separate project. Unused vector storage is disabled because it requires a paid plan; no upgrade was made.

## Configuration and secrets

The repository stores only public target metadata in `scripts/production-target.ts` and versioned production overrides in Supabase configuration. Browser builds receive repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; validation rejects another project or privileged keys. The production GitHub environment holds `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. None is a browser variable. Set secrets using `gh secret set NAME --env production --repo chini-lucky/condos` and provide values through stdin, never shell literals or command-line arguments. Do not expose CLI API-key/status output in shared logs.

The admin credential is the existing owner-only file outside the repository; the separate database password is also outside it. Copy the admin password to a password manager. Trusted provisioning is `node scripts/create-admin.ts sthwmiesffowystewspf /absolute/private/password-file`. This explicitly sets the account password; run only for initial provisioning or a deliberate administrative recovery, never as an automatic deployment step. Registration is disabled. There are no roles or in-app recovery. Reset the confirmed internal identity `chini-lucky@condos.invalid` through Supabase administration and update the password manager/private copy afterward.

For recovery/recreation, `scripts/create-project.ts` accepts an outside-repository database password file and a trusted `SUPABASE_ACCESS_TOKEN` environment value. It checks the expected organization is Free, reuses the existing exact Condos project if present, and otherwise creates it with default compute settings in Singapore. It neither upgrades billing nor overwrites an existing private password file. Treat errors as a stop, not permission to select a paid tier.

## Release order

The workflow authorizes the source, runs local CI, builds the static artifact, applies backend migrations/configuration/functions, then publishes Pages. Checks run disposable local Supabase only. The local tooling rejects any API URL other than `http://127.0.0.1:56421`, preventing tests from seeding/resetting production. Production deployment never runs test seed commands.

Automatic releases run only after pushes to main. The production job independently verifies the repository, source branch and dedicated Supabase project before linking. Checkout uses the exact event SHA. Database migrations must be compatible with the currently deployed frontend because the backend changes first. Hosted configuration uses `[remotes.production]`, avoiding local redirect URLs. Newly added Edge Functions are deployed when present.

## Controlled integration bootstrap for this implementation PR

The project uses one integration PR before main. A manually dispatched integration release is permitted only when all these match: repository `chini-lucky/condos`, branch `integration/condos-v1`, event `workflow_dispatch`, and the actual event SHA equal to repository variable `CONDOS_BOOTSTRAP_SHA`. No arbitrary ref or workflow input can bypass this guard. The production and github-pages environments temporarily allow that integration branch as well as main; environment access alone does not pass the workflow's exact-SHA guard.

The orchestrator pushes and tests the intended integration commit, sets `CONDOS_BOOTSTRAP_SHA` to that exact 40-character SHA, verifies remote integration still resolves to it, then runs `gh workflow run deploy.yml --ref integration/condos-v1 --repo chini-lucky/condos`. The merge commit SHA, rather than the ticket branch tip, must be pinned. Inspect the run's head SHA before accepting the release. This bootstrap is an explicit operator action, not automatic integration deployment. Remove the bootstrap variable and integration deployment-branch rules after the approved bootstrap/final integration verification. Keep main allowed. Do not merge main merely to trigger a deployment.

## Verification

With authenticated trusted CLI access and the existing private admin file:

`CONDOS_ADMIN_PASSWORD_FILE=/absolute/private/password-file node scripts/smoke-production.ts`

This checks hosted sign-in, creation, direct-link reload, renaming and logout using Chromium, plus real anonymous denial and disabled public registration. `--api-only` checks hosted Auth and persistence without Pages. The script suppresses credential-bearing error details, creates uniquely named smoke offers and removes only those fixtures in a finally block. It records no traces/screenshots/passwords/keys. If fixture cleanup fails, inspect only uniquely named Deployment smoke records in trusted administration.

Production contains no seeded prototype offers, fabricated agents or sample images. Smoke fixtures must be removed before handoff.

## Failed deployment and rollback

A failed authorization/check/build makes no hosted changes. Backend failure prevents Pages publication; completed migrations or config steps may already be applied. Inspect the failing phase in a trusted environment, fix through a new compatible migration/configuration change and rerun the same controlled pipeline. Do not reset the production database, edit migration history or replay local test setup. Admin provisioning is separate and is not retried by release automation.

If Pages publication fails after the backend succeeds, the old frontend remains while backend changes persist. Fix Pages and rerun after verifying the backend remains backward compatible. To restore a previous frontend, rebuild the known compatible commit through an explicitly authorized release; do not blindly roll back schema or delete real offers. Rotate compromised deployment credentials through Supabase and replace GitHub environment secrets without committing them.

## Verified initial release

On 2026-10-20 (Bangkok), [deployment run 39305725116](https://github.com/chini-lucky/condos/actions/runs/39305725116) successfully released exact integration commit `19192e326e1c73d9af955a14717df0abc113929d`. Source authorization, local CI, build, backend and Pages jobs all succeeded. Production schema at this initial release includes migrations through `202610190005` only.

The hosted Chromium smoke passed sign-in, name-only offer creation, persisted direct-link reload, edit and logout. Real anonymous denial and disabled public registration also passed. The original admin credential stayed in memory, no credential traces/screenshots were recorded, and the uniquely named smoke offers were removed by scoped trusted cleanup. Later features require a separately controlled release; this record verifies the initial authentication/offer slice.
