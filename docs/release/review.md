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

All four findings are being corrected in one implementation branch, with behavior regressions at the agreed public seams. Verification and reviewer confirmation remain pending. The original reviewed snapshot independently passed [full fresh-database CI](https://github.com/chini-lucky/condos/actions/runs/39316921376); a new exact-commit run is required after corrections.
