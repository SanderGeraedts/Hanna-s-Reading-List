---
id: T-0028
title: "Keep her creature choices on the account: a creatures field and an add-only route on the server (needs Sander)"
description: "The server half of D-0034: a JSON field creatures on her libraries record and a route POST /api/collections/libraries/creatures that adds choice events in one transaction and never removes one; a draft needs-sander pull request with only deploy/nas changes, approved by Sander on 2026-11-22 but merged by him."
status: Open
size: small
depends_on: []
decisions: [D-0003, D-0005, D-0006, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

So Hanna's creature choices (purchases, names, outfits, hatches, duplicate choices, the shelf
creature) follow her to every device, the account server needs one new field and one small route
(D-0034). No existing synced store can hold them without losing data (checked in D-0034's
*Context*). This task is **only the server half**, kept apart so every other creature task stays in
group 1. The app side is in T-0029 and works with or without this.

Sander approved it on 2026-11-22, typed in Hanna's chat: "The Harness should allow to do one without
me, but it has my blessing anyway". Because it changes `deploy/nas/` (code owners) and the live
database (D-0005), it is still **his to review and merge**.

1. A migration `deploy/nas/pb_migrations/<timestamp>_creatures.js` that adds a JSON field
   `creatures` (max 2 MB) to `libraries`, and does nothing when it is already there; the down
   migration removes it. Nothing existing changes.
2. A hook `deploy/nas/pb_hooks/creatures.pb.js`, modelled on `favourites.pb.js`:
   `POST /api/collections/libraries/creatures { events: [...] }`, requires a signed-in user, and in
   one transaction on that user's own record:
   - keeps only well-formed events: `id` (`^[A-Za-z0-9:_-]{1,60}$`), `at` (a number), `kind` (one of
     `hatch, choose, release, name, feed, buy, wear, place, habitat, current, shelf`), and only small string /
     number fields (each string ≤ 60 characters), at most 200 events per call;
   - adds each event whose `id` it hasn't got; never changes or removes one, except that for
     setting kinds (`name, wear, place, habitat, current, shelf`, which carry a `key`) an older event with
     the same key is dropped once a newer one is stored;
   - keeps at most 20,000 events (no non-setting event is ever dropped: over the limit it refuses
     with 400 and writes nothing);
   - answers `200 { creatures: [...] }` with the whole log; no shelf record yet or no `creatures`
     field: `404`, nothing written.
   Under `/api/collections/libraries/`, so the path Funnel already passes on reaches it
   (`deploy/nas/serve.json` unchanged).
3. A test against a local throwaway PocketBase, like `src/server/favourites.pocketbase.test.ts`
   (skipped unless `PB_TEST_URL` is set, local addresses only): `src/server/creatures.pocketbase.test.ts`.

## Why it needs the server (looked at again, 2026-11-22)

Hanna and Sander both said it should be possible without a server change ("the harness should allow
to do one without me"). The architect looked again, harder. What is needed: a list that **only ever
grows** (a cookie spent, a name given, a pet released must never vanish), saved with her account,
that **two devices writing at the same moment can't overwrite**, and that **an older copy of the app
(a tab left open on her phone) can't wipe**. Every place her account already keeps things was
checked against that, in plain words:

| Where it could go | Why it doesn't work |
|---|---|
| **Her books** (one fake "book" holding all choices) | Her books are saved book by book, and the newest edit of a book wins whole. Two devices adding choices at the same moment: one device's choices disappear. And the fake book would show up on her shelf, in her counts and in every older copy of the app. |
| **Her books** (one fake "book" per choice) | The only option that really only grows, because books are never dropped by a save. But it means thousands of fake books among her real ones: on the shelf and in her stats in any copy of the app that doesn't know about them, in every save of her shelf and in the server's history of her shelf. Her books are the one thing that can't be rebuilt (guardrails), so the game can't live inside them. |
| **A hidden field on her real books** | Choices aren't about a book, and the same "newest edit wins whole" rule means a rating on one device can wipe a purchase made on the other. |
| **Her reading goals** | The server keeps only "year → number of books" and throws everything else away. |
| **Her own challenges** | The whole list is saved at once, so any copy of the app that doesn't know about the choices drops them the next time she edits a challenge; and it holds only 20 KB, too little for a game that runs for years. |
| **Her dashboard favourites** | Only 50 short names, and the oldest are thrown away when a new one is added: choices would be pushed out. |
| **Her account's name and picture** | A name is one short line and the picture only takes images; both are replaced whole, so two devices overwrite each other. |
| **Her saved Storytel login** | It belongs to Storytel and is removed when she signs out of Storytel; the choices would go with it. |
| **A store on Netlify (where the site runs) instead of the server at Sander's home** | That is a new place to keep her data: not in the server's hourly snapshots, no history, possibly counting toward Netlify's paid usage, and a new data store is the Engineer's decision under the harness rules. It swaps one small ask to Sander for a bigger one. |
| **Only on each device** | Works (and is what happens until this task is live), but it isn't "with her account": a new phone would start over. |
| **What the new harness (v0.9.0) offers** | Nothing that skips Sander here. Its rules let agents do what can be undone (G-0009), and adding a field can be undone, but this repository's main branch requires Sander's code-owner review for anything in `deploy/nas/` (CODEOWNERS, Q-003 still open), and agents never weaken that (G-0029). Its auto-merge even has a `hold-paths` option that holds backend changes for the Engineer on purpose. Its throwaway backend (G-0032) helps to test the change, not to ship it. |

**Conclusion:** there is no safe way without the server. The change is as small as it can be: one
new field and one small route that can only add. Sander has already approved it, so **his part is
one review on GitHub** and a glance at her shelf afterwards: once he approves, the pull request
merges itself and the Backend image workflow deploys it (the auto-merge workflow starts it). The game
doesn't wait for him: until then each device keeps its own choices and sends them once this is live.
If Sander wants this kind of change to need no click at all in future, that is his decision on Q-003
(for example: let new migrations that only add a field merge without his review).

# Done when

1. With a local throwaway PocketBase started with this repo's migrations and hooks
   (docs/hanna-guardrails.md), `PB_TEST_URL=http://127.0.0.1:8090 pnpm exec vitest run
   src/server/creatures.pocketbase.test.ts` passes and covers: two overlapping posts from two
   "devices" both land; posting the same event twice stores it once; a newer setting event replaces
   the older one with the same key, an older one doesn't replace a newer one; a bad event is dropped,
   the good ones in the same call kept; another user's record is never touched; no shelf record →
   404 and no record made; a server started without the migration → 404; a shelf save
   (`saveShelf`) leaves `creatures` unchanged.
2. `pnpm test` and `pnpm exec harness check` pass (the PocketBase test skips there).
3. The pull request is a **draft** labelled **`needs-sander`**, touching only `deploy/nas/` and the
   test file, and its description starts with a **Needs Sander** section: what Hanna asked for,
   that Sander approved on 2026-11-22, and his checklist: review; merge; let the Backend image
   workflow and Watchtower deploy it; check on the NAS that `libraries` has the `creatures` field
   and that her shelf still loads.
4. **Sander** merges it and confirms the checks in item 3. Until then this task stays *Doing* with
   a `Remaining:` line.

# Notes

- Copy the shape of `deploy/nas/pb_hooks/favourites.pb.js` (transaction, `NotFoundError` when the
  field or the record is missing, everything inside the handler) and
  `deploy/nas/pb_migrations/1795737600_favourites.js` (adds the field only when missing).
- The app never PATCHes `creatures` directly (D-0034); the route is the only writer.
- No secrets, host names or NAS addresses in the repository, the PR or this file (G-0026).
- Agents never mark this PR ready and never merge it (docs/hanna-guardrails.md, group 3).
- Nothing in the app depends on this being merged: T-0029 keeps choices on the device until the
  route answers.

# Design

Nothing visible.

# Test

# Log

- 2026-11-22 architect: split the server half of saving creature choices into its own needs-sander
  task (no existing store could hold them, D-0034); Sander approved on 2026-11-22; his review and
  merge needed. Size: small (backend only).
- 2026-11-22 architect: Hanna and Sander asked for a way without a server change; looked again at
  every synced store, per-book fields, the account record, Netlify and harness v0.9.0 (rules,
  G-0031, G-0032, `hold-paths`, the backend workflow). None keeps an add-only list safe from two
  devices and older copies of the app; kept as needs-sander, with the reasons in plain words under
  *Why it needs the server*. Added the `release` kind (Hanna: pets can be released with care).
