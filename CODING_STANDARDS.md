# Coding standards

- Strict TypeScript. Keep types honest; validate untrusted data at boundaries. Avoid `any`, non-null assertions and unchecked casts; isolate unavoidable SDK casts at the Supabase boundary with justification.
- Use plain, readable functions and React components with one clear responsibility. Keep domain logic independent of browser/Supabase plumbing and UI rendering. Use composition and the simplest code that meets the current requirement.
- Keep storage/database operations behind a clear boundary. React should not construct ad hoc SQL or duplicate access rules. Enforce permissions and concurrency in the backend.
- Represent unknown facts explicitly. Handle loading, failure, empty and success states deliberately. Exhaustively handle domain variants.
- Await promises or explicitly handle their asynchronous lifetime. Return actionable errors; retain user drafts on failure. Make cleanup durable and idempotent.
- Store instants unambiguously and format appointments/timestamps in Asia/Bangkok. Keep money numeric in THB and distinguish absent from zero.
- Add dependencies only for a concrete need and document the reason. Favor maintained official APIs, accessible HTML and responsive CSS.
- Test observable behavior through the agreed public seams. Mock only external boundaries, time or randomness. Expected values come from worked examples/specification, not the same algorithm under test.
- Run the applicable checks and record evidence in the PR. Review refactors belong after the red/green implementation cycle.
