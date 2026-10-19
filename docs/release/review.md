# Independent implementation review

Two independent agents reviewed `cfca225...3f8fc967e2787342431ca24fa0f6b7e344876c5e`. The Standards axis used `AGENTS.md`, `CODING_STANDARDS.md`, `docs/implementation.md` and the code-review skill's smell baseline. The Spec axis used the approved requirements, all 17 issue bodies and the design reference. Neither reviewer changed code or production data.

## Standards

1. **P2 — Nested photo controls.** The Next photo button contains `PhotoImage`, whose error state adds a Retry photo button. This creates nested interactive HTML and lets retry clicks advance the carousel. This violates the documented accessible HTML rule. Separate the controls and verify image-failure recovery and keyboard navigation.
2. **P3 — Domain parsing in presentation.** `OfferLocationFields` defines pure station/distance/bearing parsing. Move that function to existing `location.ts` so the form imports its rules from the domain module, as required by the documented separation of responsibilities.

No additional actionable smell-baseline findings. **Two findings; highest severity P2.**

## Spec

1. **P2 — Drafts lost after remote lifecycle changes.** A focus refresh after another client permanently deletes an offer can unmount its edit form. Remote Trash/delete can also replace note/status editors. This violates “Refresh when returning to the app without erasing drafts.” Keep the active draft visible and copyable, mark the offer unavailable, prevent persistence and require a deliberate exit.
2. **P2 — Missing card/callout status context.** Compact status presentation suppresses saved explanations and appointments. Issue #8 explicitly requires status/explanation/appointment in details, cards and map callouts. Add concise visible context using Bangkok appointment formatting and keep collision bounds accurate.

No additional scope creep or authorization/privacy defect identified in the reviewed boundaries. **Two findings; highest severity P2.**

## Disposition

All four findings were corrected in one implementation branch and integrated in `02e536b`. Both original reviewers independently verified candidate `46616a1b1e2ae1cc8d53a7b3ca374e3df673fafe` and closed their findings with no new actionable issue in the changed areas.

The corrected candidate passed all 44 backend/domain tests, all 52 browser journeys, type/lint/format checks and production build. The merger independently passed three domain tests and all seven focused review regressions after integration. Regressions use actual failed signed-photo requests, keyboard navigation, two-client Trash/permanent deletion, real clipboard copies, disabled persistence and persisted status context with visible callout bounds.

The original reviewed snapshot independently passed [full fresh-database CI](https://github.com/chini-lucky/condos/actions/runs/39316921376). The controlled release reruns exact-commit fresh-database CI before backend deployment and frontend publication.

## Hosted preflight correction

The first full hosted feature smoke exposed a browser-only photo upload failure: the installed Supabase SDK sends `x-client-info`, but the Edge preflight allowlist omitted it. Direct Node uploads bypass browser CORS and the local gateway masked the omission. A credential-free hosted OPTIONS probe confirmed the missing header.

Commit `e9fc23d` adds that header and extracts the existing preflight response into a small shared function used by both photo endpoints. A regression captures the installed SDK's actual upload/cleanup request headers at the external fetch boundary and checks the actual shared response without gateway rewriting. It failed with exactly `x-client-info` missing before the fix, then passed. Both original reviewers independently checked this narrow change: **Standards: zero findings; Spec: zero findings.** Focused verification passed 16 backend tests, six photo/HEIC browser journeys, check and build. Final hosted acceptance is recorded in [the release record](../release.md).
