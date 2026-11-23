---
id: D-0034
title: "Her creature choices are saved with her account as a log that only grows, through a new field and route on the server, and kept on the device until that is live"
description: "Purchases, names, outfits, hatches, duplicate choices and the shelf creature are a list of choice events in a new creatures field on her libraries record, written only through a new route that adds events in one transaction and never removes one (approved by Sander 2026-11-22, his review needed); until the route exists each device keeps its own choices and sends them once it does."
status: Accepted
date: 2026-11-22
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [creatures, sync, server]
---

# Context

D-0033 saves only Hanna's creature choices, and she wants them on every device. Sander approved
saving them with her account on 2026-11-22, but asked first for a way without a server change.
The architect checked every store that already syncs (2026-11-22):

- **The books** (`libraries.books`, merged by `src/lib/shelfMerge.ts`): a choices record would have
  to be a fake book; every list, count and older device would show it. No.
- **Reading goals** (`goals`): `cleanGoals` in `src/server/shelf.ts` keeps only `yyyy → number`.
  No.
- **Own challenges** (`challenges`, 20 KB): `cleanChallenges` drops anything that isn't a
  challenge, and the whole list is saved at once, so an older device would wipe the choices the
  next time she edits a challenge. No.
- **Favourites** (`favourites`, through `pb_hooks/favourites.pb.js`): only block-id strings, at most
  50, the oldest dropped over the limit. Choices would be lost. No.
- **Per-book fields** (D-0002): choices aren't about one book. No.

Hanna and Sander asked on 2026-11-22 to look again, harder, for a way without a server change,
including what harness v0.9.0 offers. The second look (T-0028, *Why it needs the server*) also
ruled out: one fake book per choice (append-only by nature, but they'd be books), choices inside a
real book's field (two devices overwrite each other), packing them into favourites or challenges
with a client-side encoding (older devices and the size limits lose them), the Storytel login
record, a store on Netlify (a new data store outside the server at Sander's home, which needs him
anyway), and the harness (v0.9.0 has no way around the code-owner review; its `hold-paths` even
holds backend changes for the Engineer on purpose).

So a server change is unavoidable. It touches `deploy/nas/` (code owners: Sander) and changes the
live database, so it is its own needs-sander task (T-0028); everything else stays group 1.

# Decision

1. **A log of choice events.** Each choice is an event `{ id, at, kind, ... }`: hatch an egg (for
   the welcome egg with the creature she chose), duplicate choice (keep / cookies / power-up),
   release a pet, name a pet, feed, buy (with the price paid), wear an
   item, place a home item, pick a habitat, pick the current pet, put a creature on the shelf. Event
   ids are unique, made on the device. "Setting" kinds (name, wear, place, habitat, current, shelf)
   also carry a `key`; for those
   the newest `at` per key wins. Everything else counts once per id.
2. **Stored on her `libraries` record** in a new JSON field `creatures` (migration in
   `deploy/nas/pb_migrations/`), like `favourites`.
3. **Written only through a new route** `POST /api/collections/libraries/creatures { events }`
   (`deploy/nas/pb_hooks/creatures.pb.js`), under the path Funnel already passes on. In one
   transaction it adds the events whose id it hasn't got, never removes or changes one (except that
   an older setting event with the same key may be dropped when a newer one is there), checks shape
   and size, and answers with the whole log. No shelf record yet, or a server without the field:
   404, nothing written. A shelf save never sends the field.
4. **Read** with the existing record list (`fields=id,creatures`) by a new server function in
   `src/server/creatures.ts` (not a code-owner path), answering `kept: false` when the server
   doesn't have the field, like `favouritesStore.ts`.
5. **Until the route is live**, the device keeps its choices in localStorage and works fully on its
   own. Once the account keeps the log, the device sends what the account hasn't got (a union by
   id, so nothing is lost and nothing is doubled), then follows the account.

# Rationale

A log that only grows can't lose a purchase or a name when two devices save at once, and the
transaction on the server makes overlapping saves safe, as the favourites route does. Keeping the
server part to one field and one small route keeps Sander's review short; building the app side so
it works without it means the game ships without waiting for him.

# Consequences

- T-0028 is a draft pull request labelled `needs-sander`; it is never marked ready or merged by an
  agent, and Sander checks the live database after it is deployed.
- The app side (T-0029 on) must work with and without the route, and a test covers both.
- The log grows with every feed; the route caps it (see T-0028), keeping every non-setting event.

# Guidance for agents

- Never put creature choices in the books, goals, challenges or favourites.
- Never write the `creatures` field with a plain PATCH from the app: only through the route.
- Never remove an event on the device or the server, except a superseded setting event.
- A change to the route or the field is a change to the live database: needs Sander.
