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

## Final verification status

Feature slices #1–#16 are integrated. [CI run 39314510146](https://github.com/chini-lucky/condos/actions/runs/39314510146) passed for integration commit `2f837c6d028c37b0e6eb72559ee8e3b0ac441b89`: type/lint/format checks, fresh database startup and ordered migrations through `202610200016`, all 44 backend/domain tests, real scheduled physical photo removal, all 43 Chromium journeys and production build.

The dedicated hosted photo-cleanup secret has been configured in Edge and Vault using trusted operator tooling, with an owner-only private local copy. Hosted feature migrations and final frontend publication remain pending the final release. No secret values are stored in this repository.

Final visual alignment and [independent Standards/Spec review](release/review.md) are complete. All four review findings were corrected and independently verified. The final corrected candidate passed all 44 backend/domain tests and all 52 browser journeys, with check/build passing. Desktop and phone evidence is in [release screenshots](release/screenshots/README.md).

Final hosted release verification remains pending. The controlled workflow reruns exact-commit fresh-database CI before deployment; local or earlier CI results alone do not establish hosted completion.

The final record will identify the tested integration commit, full check counts, fresh migration run, desktop/phone captures, review disposition, exact deployment run and hosted cleanup proof. Physical iPhone/Safari testing is not available; HEIC processing has passed Chromium, Firefox and Playwright WebKit engine checks as documented separately.

## Operational references

- [Local setup and test commands](../README.md#local-development)
- [Deployment, credentials and recovery](deployment.md)
- [Private photo processing, Vault/Edge setup and automatic cleanup](photos.md)

Deletion intentionally retains minimal receipts and immutable technical cleanup tombstones. User offers and notes are removed permanently; retained keys allow safe reconciliation if delayed uploads arrive after deletion. Pending cleanup stays visible in Trash and can be retried without restoring the offer.
