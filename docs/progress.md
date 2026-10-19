# Implementation progress

Integration branch: `integration/condos-v1`. Baseline main: `cfca225`.

| Issue   | State      | Evidence                                                          |
| ------- | ---------- | ----------------------------------------------------------------- |
| #1      | Integrated | `dffaeca` — admin sign-in; integration verification below         |
| #2      | Integrated | `6084d44` — complete Bangkok rail map; verification below         |
| #3      | Integrated | `732ee8e` — persistent offer management; verification below       |
| #4      | Integrated | `fe249f7` + run `39305725116` — hosted browser acceptance passed  |
| #5      | Integrated | `2622721` — station assignment and offer pins; verification below |
| #6–#7   | Pending    | See native GitHub dependencies and tickets.md                     |
| #8      | Integrated | `b387f7d` — statuses and Bangkok viewing appointments             |
| #9      | Partial    | `03b34e4` — notes integrated; focus-refresh draft gap below       |
| #10–#17 | Pending    | See native GitHub dependencies and tickets.md                     |

Planning documents and implementation instructions are committed before ticket work begins. Issue completion will be recorded with merge commits and validation evidence; GitHub closes the work through the final PR.

## Ticket #1 integration verification

Merged `ticket/01-admin-sign-in` without conflicts in `dffaeca`. Planning documents are preserved. On the integration branch, `npm ci`, `npm run check`, `npm run build`, `npm test` (3 real database/provisioning tests), and `npm run test:e2e` (4 Chromium authentication journeys) passed. Tests used the existing Condos local stack on 564xx; Lola and hosted projects were untouched. Local Supabase tests required sandbox escalation for Docker/CLI access after the sandboxed invocation failed.

Authentication checks cover admin-only access, denied self-enrolment, secure credential-file provisioning, login/reload/logout, invalid credentials, cross-tab logout, session refresh and revoked refresh handling. Hosted account provisioning, hosted registration settings and release verification remain ticket #4/#17 work. The GitHub issue remains open for closure through the final PR.

## Ticket #2 integration verification

Merged `ticket/02-rail-map` without conflicts in `6084d44`. On integration, `npm run check`, `npm run build`, and the three rail-network/viewport/label domain tests passed. All nine Chromium journeys passed together: five rail navigation/responsive/touch journeys and all four existing authentication journeys. The rail fixture is excluded from the production build. Local Condos and Lola stacks were not reset or stopped.

Offer pins, walking rings, semantic offer navigation and map/card synchronization remain #5/#14 work. RailBrowser extension points are ready for offer UI composition. The GitHub issue remains open for closure through the final PR.

## Ticket #3 integration verification

Merged `ticket/03-offers` without conflicts in `732ee8e`. Integration passed `npm run check`, `npm run build`, all eight Node database/provisioning/domain tests, and all fourteen Chromium journeys on dedicated port 5286. These include the existing authentication and rail journeys plus persistent name-only creation/rename/direct links, concurrent-edit review, offline and in-flight save behavior, missing-link recovery, focus refresh and mobile sheet navigation.

The typed offers repository, shared OfferForm and OffersWorkspace composition are integrated for later features. Tests used the existing local Condos migrations through `202610190005`; no stack reset or deployment occurred. Optional offer facts and feature-specific editing remain later tickets. The GitHub issue remains open for closure through the final PR.

## Ticket #4 integration and hosted verification

Merged `ticket/04-production` without conflicts in `fe249f7`. Integration passed `npm run check`, `npm run build`, and all three deployment-policy/public-configuration/local-target boundary tests. No local database changes or resets were made during this verification.

The deployment implementer verified the dedicated hosted Condos project in Singapore, admin authentication, disabled registration, migrations through `202610190005`, private access and real create/read/rename smoke. Workflow code and secret configuration are integrated. The orchestrator deployed exact integration SHA `19192e326e1c73d9af955a14717df0abc113929d` in [run 39305725116](https://github.com/chini-lucky/condos/actions/runs/39305725116). All five jobs passed: source authorization, local CI, frontend build, hosted backend deployment and Pages publication.

On 2026-10-20 (Bangkok), the real hosted browser smoke at https://chini-lucky.github.io/condos/ passed admin sign-in, name-only creation, direct-link reload with persisted data, renaming and logout. The same operator script verified anonymous offer access is denied and public registration is disabled. It loaded the existing private password in memory, recorded no credential-bearing traces or screenshots, and removed only its uniquely named smoke fixtures through trusted cleanup. No main merge or issue closure occurred. Ticket #4 acceptance is complete; newer feature migrations remain undeployed until a later controlled release.

## Ticket #5 integration verification

Merged `ticket/05-station-offers` without conflicts in `2622721`. Integration passed `npm run check`, `npm run build`, and six location/domain/existing-offer database tests. The first browser run passed 10/11 journeys but create/reload/rename unexpectedly reached a concurrent-edit conflict. Its isolated rerun passed; the complete 11-journey location/offer/rail block then passed under the shared-stack verification lock on port 5293.

The existing offer suite creates fixed-name fixtures and deletes those names during cleanup, so concurrent copies can delete another run's active offer. This is a concrete local test-isolation risk; the exact interfering request in the first failure was not captured. Shared local verification now uses `flock /tmp/condos-verification.lock`, documented in the implementation workflow; CI has its own isolated stack.

Location persistence/reassignment/clearing, real pin activation, station lists/counts, unknown positioning and nearest-station browsing are verified. Shared APIs use explicit typed patches through `create_offer_details` and `save_offer`, with additive RailBrowser station/count/overlay controls. No reset, hosted migration push or deployment occurred. Ticket #6 must reconcile its form/repository extensions against this integration tip; deeper map behavior remains #14.

## Ticket #8 integration verification

Merged `ticket/08-status-viewings` cleanly in `b387f7d`. Check/build passed, followed by two date/status database tests and two status browser journeys under the shared verification lock. Verified Bangkok conversion, booking/rescheduling/clearing, optional explanations, freely changed statuses, rejected-offer visibility, stale-write review and offline draft retention. Location RPC/form behavior is preserved. Future Trash must guard status mutations on trashed offers.

## Ticket #9 provisional integration verification

Merged `ticket/09-notes` in `03b34e4`, resolving the workspace import conflict by preserving both status components and the notes timeline. Check/build passed with both features composed. Two notes database tests and three notes browser journeys passed under the shared verification lock: CRUD/server timestamps, authorization/concurrency, offline draft recovery and explicit review after remote deletion.

An unresolved draft-retention gap remains: focus refresh replaces the note list, so a remotely deleted note can unmount its active editor before the user saves or copies the draft. The explicit deleted-note review test does not exercise this focus-refresh path. Ticket #9 is not fully accepted until a regression demonstrates preservation through focus refresh and the behavior is fixed. Future Trash must also guard note mutations on trashed offers.

Hosted acceptance documentation for #4 was merged in `2e4ed33`; no deployment or hosted mutation was performed during #8/#9 integration.
