# Condos — implementation tickets

Approved 2026-10-20. Published in `chini-lucky/condos` with label `ready-for-agent`. GitHub issues are the tracker; each dependency below is also a native GitHub blocking relationship.

The requirements are recorded in [requirements.md](requirements.md). The [design reference](design/README.md) and [interactive prototype](design/prototype.html) define appearance and interaction, not production code. Requirements override prototype shortcuts.

| Ticket | What it delivers | Blocked by |
| --- | --- | --- |
| [#1 — Admin sign-in](https://github.com/chini-lucky/condos/issues/1) | An admin can sign into the React app using the fixed username chini-lucky and a password, stay signed in across reloads, and sign out. Establish the local Supabase and automated-check foundation through this complete flow. | None |
| [#2 — Complete Bangkok rail map](https://github.com/chini-lucky/condos/issues/2) | Browse a responsive schematic map containing all stations on BTS Sukhumvit, BTS Silom and MRT Blue, and select a station using mouse, keyboard or touch. | None |
| [#3 — Create and maintain an offer](https://github.com/chini-lucky/condos/issues/3) | Create an agent offer using only its name, find it in Unassigned, reopen it after reload and rename it in the responsive detail panel. | [#1](https://github.com/chini-lucky/condos/issues/1) |
| [#4 — First production deployment](https://github.com/chini-lucky/condos/issues/4) | Use the hosted Condos app to sign in and create a persistent offer, with repeatable frontend/backend releases. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#5 — Assign offers to stations](https://github.com/chini-lucky/condos/issues/5) | Assign an offer to a station and optionally record walking distance and direction; browse persisted offers from the station list and see positioned offers on the map. | [#2](https://github.com/chini-lucky/condos/issues/2), [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#6 — Edit offer details and facilities](https://github.com/chini-lucky/condos/issues/6) | Save and inspect an offer's optional rental facts and facilities without losing the distinction between unknown and absent. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#7 — Record agents and listing sources](https://github.com/chini-lucky/condos/issues/7) | Record optional agent contacts and the source of an offer, then call, open LINE or copy contact details from the offer. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#8 — Change status and arrange viewings](https://github.com/chini-lucky/condos/issues/8) | Move an offer freely between Pending, Available, Viewing and Rejected, and maintain one optional viewing appointment. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#9 — Maintain the notes timeline](https://github.com/chini-lucky/condos/issues/9) | Read, add, edit and delete an offer's notes in a persistent timeline. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#10 — Upload and display private photos](https://github.com/chini-lucky/condos/issues/10) | Upload JPEG, PNG and WebP photos to an offer and view them in a private persistent carousel with a neutral empty placeholder. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#11 — Upload HEIC photos](https://github.com/chini-lucky/condos/issues/11) | Choose HEIC photos from a phone and view the converted images reliably in the same offer carousel. | [#10](https://github.com/chini-lucky/condos/issues/10) |
| [#12 — Organize and remove photos](https://github.com/chini-lucky/condos/issues/12) | Reorder an offer's photos, choose a cover and delete an individual photo with confirmed persistent results. | [#10](https://github.com/chini-lucky/condos/issues/10) |
| [#13 — Filter and compare offers](https://github.com/chini-lucky/condos/issues/13) | Compare offers by facilities, property type and maximum rent with consistent map counts and station lists. | [#5](https://github.com/chini-lucky/condos/issues/5), [#6](https://github.com/chini-lucky/condos/issues/6) |
| [#14 — Complete map-driven navigation](https://github.com/chini-lucky/condos/issues/14) | Navigate naturally from the rail overview into a station and offer using zoom, rings, map callouts and synchronized panels. | [#5](https://github.com/chini-lucky/condos/issues/5) |
| [#15 — Move offers to Trash and restore them](https://github.com/chini-lucky/condos/issues/15) | Remove an offer from normal browsing without losing it, then find and restore it from Trash. | [#3](https://github.com/chini-lucky/condos/issues/3) |
| [#16 — Permanently delete trashed offers](https://github.com/chini-lucky/condos/issues/16) | Explicitly delete a trashed offer forever, including its notes and stored photos, with reliable failure recovery. | [#9](https://github.com/chini-lucky/condos/issues/9), [#12](https://github.com/chini-lucky/condos/issues/12), [#15](https://github.com/chini-lucky/condos/issues/15) |
| [#17 — Verify the complete app and release](https://github.com/chini-lucky/condos/issues/17) | Release the complete agreed Condos app after verifying that its independently delivered features work together on desktop and mobile. | [#4](https://github.com/chini-lucky/condos/issues/4), [#7](https://github.com/chini-lucky/condos/issues/7), [#8](https://github.com/chini-lucky/condos/issues/8), [#11](https://github.com/chini-lucky/condos/issues/11), [#13](https://github.com/chini-lucky/condos/issues/13), [#14](https://github.com/chini-lucky/condos/issues/14), [#16](https://github.com/chini-lucky/condos/issues/16) |

## Working the tickets

Start only when every blocking issue is complete. Initially #1 and #2 can start. Dependencies express prerequisites, not a requirement to run agents in parallel. Each issue is a working vertical slice with its own acceptance criteria and meaningful validation; #17 verifies the integrated release.

Keep requirements, issue acceptance criteria and implementation evidence aligned. Link each implementation PR to its issue, record relevant tests and outcomes, and keep production changes separate from local testing.
