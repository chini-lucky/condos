# Implementation progress

Integration branch: `integration/condos-v1`. Baseline main: `cfca225`.

| Issue   | State      | Evidence                                                             |
| ------- | ---------- | -------------------------------------------------------------------- |
| #1      | Integrated | `dffaeca` — admin sign-in; integration verification below            |
| #2      | Integrated | `6084d44` — complete Bangkok rail map; verification below            |
| #3      | Integrated | `732ee8e` — persistent offer management; verification below          |
| #4      | Integrated | `fe249f7` + run `39305725116` — hosted browser acceptance passed     |
| #5      | Integrated | `2622721` — station assignment and offer pins; verification below    |
| #6      | Integrated | `231f633` — optional rental facts and facilities; verification below |
| #7      | Integrated | `9575dce` — agent contacts and source links; verification below      |
| #8      | Integrated | `b387f7d` — statuses and Bangkok viewing appointments                |
| #9      | Integrated | `03b34e4` + `c01d075` — notes and focus-refresh draft preservation   |
| #10–#13 | Pending    | See native GitHub dependencies and tickets.md                        |
| #14     | Integrated | `72f60cb` — semantic map navigation and synchronized offers          |
| #15     | Integrated | `68d7756` — recoverable Trash and restoration; verification below    |
| #16–#17 | Pending    | See native GitHub dependencies and tickets.md                        |

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

## Ticket #6 implementation verification

Merged `ticket/06-offer-details` cleanly in `231f633`, preserving status and notes composition. Merger verification passed check/build, two combined facts/location database tests and both corresponding browser journeys on port 5293 under the shared verification lock. No reset, hosted changes or migration replay occurred.

The implementation branch merges integration through `03b34e4`, including station assignment, status management and notes. Optional rental facts preserve unknown values, studio zero and basement floors; facilities distinguish unknown/present/absent, and named extra facilities are trimmed, deduplicated and removable. Shared add/edit controls and summaries are composed as separate components. Saving name, location and facts uses one expected-version backend mutation; stale-edit review shows the latest saved facts without discarding the draft.

Observed red/green database and browser tests cover numeric validation, nullable round trips and clearing, all facility states, duplicate extras, card/detail summaries and concurrent draft preservation. An additional integration regression creates location and rental facts together and verifies that clearing rental facts preserves station/distance/direction. `npm run check`, `npm run build`, all 20 Node boundary/domain tests and 12 affected Chromium journeys (location, facts, offers, status and notes) pass. Local verification used the shared lock and browser port 5289; no stack reset or hosted changes occurred. Migration `202610200006` extends the typed mutations introduced by `202610200005`; both must execute in order on a fresh environment. GitHub closure remains the final PR's responsibility.

## Ticket #8 integration verification

Merged `ticket/08-status-viewings` cleanly in `b387f7d`. Check/build passed, followed by two date/status database tests and two status browser journeys under the shared verification lock. Verified Bangkok conversion, booking/rescheduling/clearing, optional explanations, freely changed statuses, rejected-offer visibility, stale-write review and offline draft retention. Location RPC/form behavior is preserved. Future Trash must guard status mutations on trashed offers.

## Ticket #9 integration verification

Merged `ticket/09-notes` in `03b34e4`, resolving the workspace import conflict by preserving both status components and the notes timeline. Check/build passed with both features composed. Two notes database tests and three notes browser journeys passed under the shared verification lock: CRUD/server timestamps, authorization/concurrency, offline draft recovery and explicit review after remote deletion.

The initially identified focus-refresh draft-retention gap was fixed and merged in `c01d075`. Check/build and two notes database tests passed. All four notes browser journeys passed under the shared verification lock, including focus refresh after another device deletes the actively edited note, retaining the draft until explicit cancellation. Future Trash must guard note mutations on trashed offers.

Hosted acceptance documentation for #4 was merged in `2e4ed33`; no deployment or hosted mutation was performed during #8/#9 integration.

## Ticket #7 integration verification

Merged `ticket/07-agent-contacts` cleanly in `9575dce`, preserving atomic name/facts/location/contact saves and existing status/notes composition. Check/build, the contacts database boundary test and both contacts browser journeys passed under the shared verification lock on port 5293. Coverage includes per-offer persistence, trim/clear, protected concurrency, safe source/phone/LINE actions, real clipboard readback, clipboard denial and offline draft retention. No local reset or hosted changes occurred; migration `202610200007` must be included in the ordered fresh replay before release.

## Ticket #15 integration verification

Merged `ticket/15-trash` cleanly in `68d7756`. Check/build passed, followed by the Trash database boundary test and both browser journeys under the shared verification lock on port 5293. Confirmed indefinite retention, admin/version guards, active-map/list exclusion, persisted direct-link recovery, notes/status/facts retention, restore, and inability of stale forms or child mutations to edit/resurrect a trashed offer.

The photo implementer independently exercised actual Edge/Storage retention and cancelled-upload cleanup against migration `202610200015`; those photo components are not yet integrated here. Final ordered replay must install photo migration `202610200010` before Trash `202610200015`. Ticket #14's navigation extraction must preserve Trash routes and use active offers for normal map/list rendering. No resets, hosted changes or issue closure occurred.

## Ticket #14 integration verification

Merged `ticket/14-map-navigation` cleanly in `72f60cb`. Check/build passed (Vite reports the existing 500 kB chunk advisory). Four semantic/geometry/navigation domain tests and all three targeted browser journeys passed under the shared verification lock on port 5293. Verified rings/callouts, card/pin synchronization, semantic zoom hysteresis, nearest station selection, free camera preservation, navigation parents and mobile forms.

Trash routes and active-only normal map/list rendering are preserved. Filter integration must keep unfiltered active `stationOccupancy` separate from matching `stationCounts`, and use the additive `opacityByOffer` map adapter. Contacts/status/notes remain composed in offer detail. No schema changes, resets or hosted deployment occurred.

## Ticket #7 implementation verification

The implementation branch is based on integration `1605a5c`. Offers store optional agent name, company, phone, LINE ID and source URL independently, with nullable/clearable values and no invented contact details. Separate shared form fields and a collapsed agent card provide safe Call, LINE and Copy actions. Source links accept HTTP(S) and reject embedded credentials or unsafe schemes. Missing data hides actions; copy denial shows manual-copy guidance; offline failures retain drafts. Contact fields extend the existing atomic name/location/facts save rather than a second request.

LINE's [documented URL schemes](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/) support direct Official Account profiles. The app opens those for @IDs. Personal IDs use a truthful Find in LINE action that opens Add friends, displays the search ID and offers copying; it does not promise unsupported direct personal-profile lookup.

Observed database red/green covers persistence, trimming, clearing, per-offer isolation, unsafe inputs, stale versions and denied anonymous writes. Browser red/green covers shared fields, collapsed/expanded contacts, actual clipboard readback, desktop/mobile persistence and partial contacts. Further regressions cover clipboard failure, invalid source/phone/LINE values and offline draft retention. `npm run check`, `npm run build`, all 21 Node tests and all 23 Chromium journeys pass under the shared verification lock on port 5295. Additive local migration `202610200007` and its explicit local history repair are complete; no hosted migration or deployment was attempted. GitHub closure remains the final PR's responsibility.
