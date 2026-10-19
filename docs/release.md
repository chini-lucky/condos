# Release verification

The approved scope is [requirements.md](requirements.md), with issue dependencies in [tickets.md](tickets.md). Per-slice integration results are in [progress.md](progress.md). This record separates those results from the final combined release checks.

## Requirement coverage

| Requirement                                                                           | Issues | Observable verification                                                                                                   |
| ------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| One private admin, session persistence, logout, disabled registration                 | #1     | `tests/access.test.ts`, `tests/provision.test.ts`, `e2e/auth.spec.ts`                                                     |
| Complete BTS Sukhumvit/Silom and MRT Blue network                                     | #2     | `tests/rail.test.ts`, `tests/labels.test.ts`, `e2e/rail.spec.ts`; [official-source record](rail-reference.md)             |
| Name-only offers, duplicate names, optional facts, persistence and conflicts          | #3, #6 | `tests/offers.test.ts`, `tests/offer-facts.test.ts`, `e2e/offers.spec.ts`, `e2e/offer-facts.spec.ts`                      |
| Dedicated hosted project and controlled deployment                                    | #4     | `tests/deployment.test.ts`, deployment workflow and hosted smoke; [operations](deployment.md)                             |
| Optional station, distance, bearing and Unassigned offers                             | #5     | `tests/offer-location.test.ts`, `tests/location-domain.test.ts`, `e2e/location.spec.ts`                                   |
| Optional agent contacts and safe source/contact actions                               | #7     | `tests/contacts.test.ts`, `e2e/contacts.spec.ts`                                                                          |
| Free status changes and Bangkok appointments                                          | #8     | `tests/status.test.ts`, `tests/appointments.test.ts`, `e2e/status.spec.ts`                                                |
| Persistent editable notes, timestamps and conflict recovery                           | #9     | `tests/notes.test.ts`, `e2e/notes.spec.ts`                                                                                |
| Private photos, count/size limits, normalization and cleanup                          | #10    | `tests/photos.test.ts`, `e2e/photo-processing.spec.ts`, `e2e/photos.spec.ts`, real cron proof                             |
| Worker-based HEIC conversion and retained failures                                    | #11    | `e2e/heic-processing.spec.ts`, `e2e/heic-upload.spec.ts`; [tested engine limits](photo-formats.md)                        |
| Deterministic photo order, explicit cover and confirmed removal                       | #12    | `tests/photo-management.test.ts`, `e2e/photo-management.spec.ts`                                                          |
| Filter rules, unknowns, facility-miss groups and matching map counts                  | #13    | `tests/filters.test.ts`, `e2e/filters.spec.ts`                                                                            |
| Semantic map navigation, rings, callouts and synchronized cards                       | #14    | `tests/map-navigation.test.ts`, `tests/navigation-routes.test.ts`, `tests/viewport.test.ts`, `e2e/map-navigation.spec.ts` |
| Indefinite Trash retention and restoration                                            | #15    | `tests/trash.test.ts`, `e2e/trash.spec.ts`                                                                                |
| Confirmed permanent deletion, note cascade and durable photo cleanup                  | #16    | `tests/permanent-deletion.test.ts`, `e2e/permanent-deletion.spec.ts`                                                      |
| Responsive approved design, accessibility, integrated checks and final hosted release | #17    | Final verification below                                                                                                  |

Access tests use anonymous, admin and another authenticated identity. Photo and deletion tests exercise real Storage and Edge functions, immutable cleanup jobs, partial failures, leases and late uploads. Browser tests cover failed writes, stale edits, draft preservation, expiring signed images, desktop and phone interaction. No role management, reminders, full audit log, public registration or sample production listings are part of this release.

## Final verification

All 17 implementation slices are integrated. [Deployment run 39322247642](https://github.com/chini-lucky/condos/actions/runs/39322247642) successfully released exact integration commit `258c77eb5caa6590663f0b84b99bca25e57391f7` on 2026-10-20 (Bangkok). All five jobs passed: source authorization, fresh local CI, production build, dedicated Supabase deployment and Pages publication.

The release's fresh database applied ordered migrations through `202610200016`. Type/lint/format checks, all **45 backend/domain tests**, the real local scheduled physical photo-cleanup proof, all **52 Chromium browser journeys**, and production build passed. [Independent Standards/Spec review](release/review.md) is complete: all four initial findings are resolved, and both reviewers found no actionable issue in the final hosted CORS correction. Desktop and phone evidence is in [release screenshots](release/screenshots/README.md).

The real hosted acceptance checks passed private admin sign-in, name-only creation, direct-link reload, editing and logout; anonymous offer/photo access and public registration are denied. Photo checks used actual hosted Edge JPEG ingestion at 1600×1600, private signed-image display, explicit cover/reorder/removal, Trash and restore. The actual Pages file chooser loaded the lazy HEIC codec, uploaded a converted 800×1600 JPEG, displayed it in the carousel and preserved it on reload, with no page errors. JPEG output contains no embedded GPS metadata.

The hosted lifecycle check created a note, permanently deleted the trashed offer through the admin API, verified the note cascade and idempotent deletion receipt, and observed the scheduled worker physically remove all four scoped Storage objects. Receipt counts reached zero pending and zero failed without a browser/admin retry or manual cleanup invocation. Anonymous receipt access returns no data; the admin could read the exact test receipt. Only completed synthetic UUID/name receipts were removed after checking all associated jobs and empty Storage folders. User-facing test offers, notes and images are absent; immutable technical asset/cleanup tombstones remain for safe reconciliation.

Hosted verification caught a missing `x-client-info` preflight header that local gateway behavior masked. A direct regression against the actual shared Edge preflight response reproduced the failure before the fix. The corrected hosted preflight, actual browser upload and original full hosted journey then passed. A separate operator assertion was corrected to accept anonymous empty results as data denial instead of requiring a transport error; no product change was needed for that assertion.

The dedicated cleanup secret is configured in Edge and Vault, with an owner-only local copy outside the repository. The built-asset scan found no private credentials or privileged keys. The temporary integration bootstrap variable and integration environment branch permissions have been removed; main deployment remains enabled. Production contains no seeded prototype listings. Physical iPhone/Safari hardware was unavailable; HEIC processing also passed Firefox and Playwright WebKit engine checks as documented in [photo-formats.md](photo-formats.md).

## Operational references

- [Local setup and test commands](../README.md#local-development)
- [Deployment, credentials and recovery](deployment.md)
- [Private photo processing, Vault/Edge setup and automatic cleanup](photos.md)

Deletion intentionally retains minimal receipts and immutable technical cleanup tombstones. User offers and notes are removed permanently; retained keys allow safe reconciliation if delayed uploads arrive after deletion. Pending cleanup stays visible in Trash and can be retried without restoring the offer.
