# Condos

Read `docs/requirements.md`, your GitHub issue in `chini-lucky/condos`, `CODING_STANDARDS.md`, and `docs/implementation.md` before implementing. Use `docs/design/README.md` and `docs/design/prototype.html` when changing presentation or map behavior. Requirements override prototype shortcuts.

- Work in your assigned ticket worktree, based on `integration/condos-v1`. Merge the latest integration tip before reporting completion. The orchestrator merges ticket branches; implementers do not merge into integration/main or close issues.
- Apply the `tdd` skill. Record red then green at the agreed seams; commit each passing test with its implementation in one small, concise commit.
- Keep responsibilities separate: domain rules, Supabase boundary, React presentation. Plain code and meaningful names; introduce abstractions when current behavior needs them.
- Use only your worktree's documented local/test configuration. Production provisioning and release belong to ticket #4/#17 and the orchestrator. Lola resources are independent.
- Git identity: `lakinduboteju`, `6054685+lakinduboteju@users.noreply.github.com`. Verify before commits. Secrets stay outside version control and logs.
- Report commit SHA, tested commands/results, acceptance gaps, and environment problems. Passing a partial test suite does not establish full issue completion.
