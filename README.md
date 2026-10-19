# Condos

A private Bangkok rental-offer shortlist built with React, TypeScript and Supabase. The application is hosted at [chini-lucky.github.io/condos](https://chini-lucky.github.io/condos/).

The single admin signs in as `chini-lucky`. The production password is stored outside this repository in an owner-only file for transfer to a password manager. Registration is disabled. Missing rental facts remain unknown; an offer needs only a name.

## Local development

Use Node 24+, npm, Docker and Supabase CLI 2.121.0. The local project is `condos-local`, with API port 56421 and database port 56422. Lola uses a separate stack; leave it running independently.

From this repository:

```sh
npm ci
supabase start
npm run local:env
node scripts/configure-local-photos.ts
supabase functions serve --no-verify-jwt --env-file /tmp/condos-photo-functions.env
```

The last command stays running in its terminal. In another terminal, wait for the functions and run the backend tests to provision the disposable local identities:

```sh
node scripts/wait-local-functions.ts
flock /tmp/condos-verification.lock npm test
npm run dev
```

Open the Vite URL ending in `/condos/`. The local-only admin password used by the tests is `Disposable-local-test-password-9!`. These tools obtain credentials from the isolated local stack and reject a hosted backend. `.env.local` contains only browser-safe local configuration and is ignored by Git.

## Verification

Keep the local stack and function server running. Database, authentication, Storage and browser checks share one verification lock:

```sh
npm run check
flock /tmp/condos-verification.lock npm test
flock /tmp/condos-verification.lock node scripts/verify-local-photo-scheduler.ts
npx playwright install --with-deps chromium
flock /tmp/condos-verification.lock npm run test:e2e
npm run build
```

`CONDOS_E2E_PORT` selects a dedicated browser-test port, default 5283. The scheduler proof enables the local cron job temporarily and disables it afterward. Local photo setup deliberately leaves that job disabled between tests. CI starts a fresh isolated database, applies the ordered migrations, serves the real Edge functions and runs these same checks.

## Release and operations

The dedicated hosted Supabase project is `sthwmiesffowystewspf` (`Condos`), under the Chini Lucky organization in Singapore. Production uses its own admin account, database and private photo bucket. Test accounts and fixtures belong only to local/CI stacks.

The deployment workflow checks and builds the exact source revision, applies versioned database migrations and configuration, deploys Edge functions, then publishes GitHub Pages. A backend failure prevents frontend publication. Pushes to `main` use this pipeline. The initial integration release is separately limited to an exact authorized commit through `CONDOS_BOOTSTRAP_SHA`; see [deployment policy](scripts/deployment-policy.ts).

Photo cleanup also needs matching Edge and Vault secrets before release. Follow [private photo operations](docs/photos.md), including the physical-deletion verification. Never reset or seed the hosted database. Database migrations remain in place when rolling back a frontend release; deploy a compatible correction for backend changes.

For password recovery, a trusted Supabase organization owner can update the existing user's password through Auth administration, then update the private credential file and password manager. Verify the existing admin UUID; preserve its `admin_identity` association. The synthetic `chini-lucky@condos.invalid` address cannot receive recovery email. There is no in-app recovery or registration flow.

## Project references

- [Agreed requirements](docs/requirements.md), [design](docs/design/README.md) and [prototype](docs/design/prototype.html)
- [Tickets and dependencies](docs/tickets.md), [implementation workflow](docs/implementation.md) and [integration evidence](docs/progress.md)
- [Photo processing, organization and cleanup](docs/photos.md), [HEIC browser support](docs/photo-formats.md)
