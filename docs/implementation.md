# Implementation workflow

## Tracker and integration

GitHub Issues in `chini-lucky/condos` are authoritative for acceptance and blocking edges; `docs/tickets.md` is the local index. Label: `ready-for-agent`.

The approved spec is `docs/requirements.md`. Implement all 17 issues on `integration/condos-v1`; one final PR targets main and closes the issues after merge. Track completion in `docs/progress.md`. A merged ticket branch is integrated work, not a closed GitHub issue while the final PR is still open.

Each implementer uses a separate branch/worktree from the current integration tip. Confirm ancestry before work, merge integration changes before reporting, and keep the worktree clean with all intended changes committed. A merger agent integrates completed work and runs relevant checks. Preserve other agents' work during conflicts.

Use concise commits containing the red test's final passing form plus the implementation that makes it pass. Capture observed red/green output in task notes; do not commit deliberately failing states. Bootstrap infrastructure/documentation may use an ordinary setup commit.

## Agreed test seams

The user approved these boundaries through the ticket acceptance criteria and TDD instructions:

1. Browser journeys through React against local Supabase: login/session/logout, offer CRUD/conflicts, navigation/forms, notes, appointments, photos, filters and Trash. Catches UI/data integration and responsive behavior; does not prove arbitrary backend requests are forbidden.
2. Database and Storage interfaces under anon, provisioned admin and another authenticated identity: RLS, invariants, concurrency, photo limits and cleanup. Catches bypasses of the UI; does not establish visual fidelity.
3. Public domain functions: map geometry/dataset connectivity, filter rules/unknowns, date conversion and image processing with fixtures. Catches worked edge cases and format behavior; does not substitute for real persistence/browser tests.

Use one red → green behavior at a time. Test pure-domain behavior only when the ticket introduces a meaningful rule. Avoid implementation-mirroring tests, isolated component snapshots and mocking our own modules. Later tickets add their tests at these seams without repeatedly seeking permission already granted for them.

## Environments and release

Local stacks must use distinct project IDs/ports from Lola (its active base uses 554xx; Vite commonly 5173). Plan a Condos base in 564xx and separate Vite/e2e ports, with explicit per-worktree slot configuration when parallel database work begins. Keep one local Condos stack running at a time initially due to limited free disk; serialize DB/browser checks or stop a finished Condos stack before starting another. Never stop/reset Lola.

Production: dedicated Condos project, Chini Lucky organization, Singapore as the existing Lola-region default. Only deployment work provisions/links or mutates the hosted project. Keep service keys, database passwords and access tokens outside files tracked by Git and frontend bundles. Publish only browser-safe Supabase configuration.

The orchestrator owns the final PR and release decision. Implementers report evidence; they do not merge main, change account permissions or claim checks they have not run. Use the PR skill template, accurate authorship and `Closes #N` references. Do not copy Lola-specific Claude attribution.

## Review

After all tickets are integrated, use the code-review skill against the original main commit `cfca225`. Run independent Standards and Spec reviewers, fix actionable findings in an implementer worktree, rerun relevant checks and verify production. Mark the draft PR ready only when complete, with actual test/release evidence and any unresolved blockers plainly stated.
