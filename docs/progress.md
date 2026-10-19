# Implementation progress

Integration branch: `integration/condos-v1`. Baseline main: `cfca225`.

| Issue  | State      | Evidence                                                  |
| ------ | ---------- | --------------------------------------------------------- |
| #1     | Integrated | `dffaeca` — admin sign-in; integration verification below |
| #2     | Integrated | `6084d44` — complete Bangkok rail map; verification below |
| #3–#17 | Blocked    | See native GitHub dependencies and tickets.md             |

Planning documents and implementation instructions are committed before ticket work begins. Issue completion will be recorded with merge commits and validation evidence; GitHub closes the work through the final PR.

## Ticket #1 integration verification

Merged `ticket/01-admin-sign-in` without conflicts in `dffaeca`. Planning documents are preserved. On the integration branch, `npm ci`, `npm run check`, `npm run build`, `npm test` (3 real database/provisioning tests), and `npm run test:e2e` (4 Chromium authentication journeys) passed. Tests used the existing Condos local stack on 564xx; Lola and hosted projects were untouched. Local Supabase tests required sandbox escalation for Docker/CLI access after the sandboxed invocation failed.

Authentication checks cover admin-only access, denied self-enrolment, secure credential-file provisioning, login/reload/logout, invalid credentials, cross-tab logout, session refresh and revoked refresh handling. Hosted account provisioning, hosted registration settings and release verification remain ticket #4/#17 work. The GitHub issue remains open for closure through the final PR.

## Ticket #2 integration verification

Merged `ticket/02-rail-map` without conflicts in `6084d44`. On integration, `npm run check`, `npm run build`, and the three rail-network/viewport/label domain tests passed. All nine Chromium journeys passed together: five rail navigation/responsive/touch journeys and all four existing authentication journeys. The rail fixture is excluded from the production build. Local Condos and Lola stacks were not reset or stopped.

Offer pins, walking rings, semantic offer navigation and map/card synchronization remain #5/#14 work. RailBrowser extension points are ready for offer UI composition. The GitHub issue remains open for closure through the final PR.
