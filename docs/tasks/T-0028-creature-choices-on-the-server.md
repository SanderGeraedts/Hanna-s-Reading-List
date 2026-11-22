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
     `hatch, choose, name, feed, buy, wear, place, habitat, current, shelf`), and only small string /
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
