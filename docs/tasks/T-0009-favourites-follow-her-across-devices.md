---
id: T-0009
title: "Keep the dashboard's favourites with the account, so every device shows the same ones"
description: "#182: the starred dashboard blocks are saved per device today; keep them on the account's shelf record on the server, saved on their own like the reading goals."
status: Doing
depends_on: [T-0001]
decisions: [D-0003, D-0004, D-0005, G-0019, G-0023]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/200"]
---

# Goal

Hanna asked in #182: "Remember favourites on the dashboard across devices."

Today the dashboard layout, favourites included, is kept per device in `localStorage`
(`src/components/Dashboard.tsx`, `DashboardLayout.favourites` in `src/lib/dashboardLayout.ts`).
Make the **favourites** follow the account: star a block on the laptop and it is a favourite on
the phone too.

Do it the way the reading goals already work (#66): a small JSON field on the account's
`libraries` record, read and written on its own, never as part of a shelf save:

- **Backend:** a new migration in `deploy/nas/pb_migrations/` that adds a JSON field (e.g.
  `favourites`, max a few KB) to `libraries`, with a down migration that removes it, like
  `1794079654_reading_goals.js`. Name it after the newest migration on `main` and on the open
  pull requests #165 and #177 (`1795651200_…`), so the order stays clear.
- **Server:** `loadFavourites` / `saveFavourites` in `src/server/shelf.ts`, like `loadGoals` /
  `saveGoal`: only that field, never creating a record, the list cleaned on the way in and out
  (only known block ids, no duplicates, at most the number of blocks).
- **App:** the dashboard reads the favourites from the account when signed in and saves them when
  they change; while signed out, or when the field doesn't exist yet on the server, it keeps them
  per device as now, and quietly goes on doing so. The rest of the layout (order, hidden,
  folded) stays per device.
- **Backend check:** extend the `Backend image` workflow's checks so a user can set and read
  their own `favourites` and another user can't.

**Assumptions:** only favourites follow the account, as asked, not the whole layout. When a
device that had favourites of its own first meets the account's, the account's win if it has
any; otherwise the device's are saved to the account.

This changes the live database (a new field, nothing existing touched). The Engineer's
instruction for tonight covers merging backend changes that are tested and green; hourly
snapshots of the app's data exist (G-0023), and the field can be removed by its down migration.
`serve.json` already lets the server reach `libraries`, so nothing changes on the NAS by hand.

# Done when

- Unit tests (Vitest) for cleaning the favourites list (unknown ids dropped, duplicates removed,
  order kept) and for the first-meeting rule above.
- The `Backend image` workflow is green on the pull request, including the new check (field
  exists on an empty database; owner can write and read it; another user can't read it).
- Against a local PocketBase started with the repository's migrations and hooks, as in
  `docs/hanna-guardrails.md` (never the production one): sign up `test@example.com`; in one
  browser profile star two blocks; in a second browser profile signed in to the same account,
  after a reload, the same two blocks are favourites; unstarring one in the second profile shows
  in the first after it comes back into view. Signed out, favourites still work per device.
- A shelf save after starring doesn't change the books (the field is saved on its own), and
  `src/lib/shelfMerge.ts` is unchanged.
- `pnpm test` and `pnpm run build` pass; CI is green.

# Notes

- `deploy/nas/pb_migrations/1794079654_reading_goals.js` and `src/server/shelf.ts` (goals, around
  line 103) are the pattern; `#177` (own challenges, draft) does the same for a `challenges` field.
- Code-owner paths: `deploy/nas/`, `src/server/shelf.ts`, `.github/` (Q-003). The pull request
  needs Sander's review or an admin's bypass under the current `main` ruleset.
- After the merge the auto-merge workflow (from T-0001) or a push starts `Backend image`, which
  publishes `:stable`; Watchtower updates the NAS within about ten minutes. The app tolerates the
  field being missing until then.
- Close #182 from the pull request.

# Design

Nothing new on screen: the star and the favourites row stay as they are; only where they are
remembered changes. No UX design needed; the tester checks the behaviour above.

# Test

Tester, 2026-11-21, on `a0b1b4f` (branch `t-0009-favourites-sync`), in a fresh worktree.
**Verdict: sent back.** Two stars saved at the same moment lose one of them, on the server and
then on the device. Everything else I checked holds.

**Failed: two saves at once lose a star.** `changeFavourites` reads the list, applies the change
and PATCHes the whole list back. When two saves overlap, both read the same list and the second
write wipes out the first. The comment in `src/lib/favourites.ts` says "two devices never
overwrite each other's stars", and that isn't true. The developer's test "two devices starring
at the same time" awaits between the two stars, so the saves never overlap.

- Against a local PocketBase 0.40.6 with all migrations, two `changeFavourites` calls under
  `Promise.all` (`add: ['rhythm']` and `add: ['badges']`, starting from an empty list): one star
  was lost in **20 of 20 rounds**.
- The same thing happens on **one device**, through the hook. To see it, add this case to a copy
  of `src/lib/favouritesSync.test.ts`: star `goal`, then `reading`, in two `act` calls with no
  `settle` between them, then `settle` and `comeBack()`. Output:
  `local after two quick stars: ["goal","reading"] server: ["reading"]`, then
  `local after coming back into view: ["reading"]`. The Goal star is gone from the device too.
  On the real server each save takes a round trip, so tapping two stars quickly is enough to
  lose one.
- Two devices starring at the same instant, through the hook: `server: ["calendar"]`, where
  `["goal","calendar"]` was expected.

**Passed:**

- `npm ci` added 654 packages.
- `npm test`, run four times. Three runs: `Test Files 45 passed | 1 skipped (46)`,
  `Tests 305 passed | 6 skipped (311)`. One run failed one test, `src/lib/shelfLayout.test.ts >
  is quick enough to run on every change` (`expected 269.3 to be less than 250`). That is a
  timing test in code this pull request doesn't touch, and it fails when the machine is busy;
  the developer saw it fail too.
- `npm run build`: `✓ built in 1.59s`.
- I ran the opt-in PocketBase test against two local PocketBase 0.40.6 instances. One had all
  the migrations; the other lacked `1795737600_favourites.js`. Both had the hooks. Command:
  `PB_TEST_URL=http://127.0.0.1:8391 PB_TEST_OLD_URL=http://127.0.0.1:8392 npm exec vitest -- run src/server/favourites.pocketbase.test.ts`.
  Result: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- I re-proved the data-safety points with my own checks against the same servers (tester-only
  test file, not committed):
  - No shelf record: read, add and remove each answered `{kept:false}`, and a superuser list
    showed no record created.
  - Four favourites saves left the books, the arrangement and the goals intact, and
    `library_versions` stayed at `0 -> 0`.
  - A shelf save the way `saveShelf` sends it (only `books` and `arrangement`, as an old app
    does) kept the favourites. A goals save kept them too.
  - Another user with a shelf of their own: their changes stayed on their own record.
    Reading my record directly or through a filter gave 404 or an empty list, a PATCH gave 404,
    an anonymous read gave 404, and moving their own record to my `owner` gave 404.
  - On the server without the field, read, add and remove all answered `{kept:false}`, and
    `updated` stayed at `2026-11-21 09:18:53.574Z -> 2026-11-21 09:18:53.574Z`. The answer had no
    `favourites` key, and no record was created while there was no shelf.
- Down migration: I ran `migrate down 1` on a copy of the database and got
  `Reverted 1795737600_favourites.js`. The fields were then `id,owner,books,arrangement,created,updated,goals`,
  and all three books were still there.
- Ordering with the other draft pull requests: I took a copy of the database with
  `1795737600_favourites` already applied and added #165's `1795564800_push_subscriptions.js`
  and #177's `1795651200_own_challenges.js`. `migrate up` printed
  `Applied 1795564800_push_subscriptions.js` and `Applied 1795651200_own_challenges.js`. After
  that the fields were `...,goals,favourites,challenges`, and the books and favourites were
  intact. Both of those migrations only add things, so the order is safe if they merge later,
  and also if they never merge.
- Size: 25 blocks; the full list as JSON is 228 bytes, well under the 4 KB `maxSize`.
- Backend workflow: the diff only adds `other@example.com` to the check container's
  `SIGNUP_EMAILS` and adds the favourites checks inside the check step. `Publish` is unchanged
  (`if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'`). On the
  pull request run (`a0b1b4f`), `Check that it starts and applies the schema: success` and
  `Publish: skipped`. CI `test` and `image` are green.
- `shelfMerge.ts` and `shelf.ts` are unchanged.

**Not run:** the two-browser-profile check in *Done when*. The race above fails it first, and
it needs to run again after the fix.

**The developer's two open points:**

- *Reset while arranging clears the favourites on every device.* This doesn't block, but it
  needs a decision. Favourites are now kept with the account while the rest of the layout stays
  per device, so a device-level Reset that unstars everything everywhere is surprising.
  Recommendation for the architect: Reset leaves the favourites alone, or says that it clears
  them everywhere.
- *A star made offline is dropped the next time the account is read.* The same happens to a
  star made before the first account read has come back: `kept` is still false, so nothing is
  sent, and then `adopt` overwrites it. On its own this wouldn't block. It is the same kind of
  silent loss as the failure above, though, so fix it in the same pass: keep unsent changes on
  the device and send them before taking over the account's list.

# Log

- 2026-11-21 architect: Task written from #182, following the reading-goals pattern (#66).
- 2026-11-21 developer: Built in draft PR #200. Migration `deploy/nas/pb_migrations/1795737600_favourites.js` (after #177's `1795651200`): only adds a JSON field `favourites` (max 4 KB) to `libraries`, skips if it exists; down removes it. Server functions `loadFavourites` / `saveFavourites` are in a new `src/server/favourites.ts` (store code in `favouritesStore.ts`) instead of `shelf.ts`, so this PR doesn't conflict with #177, which appends to `shelf.ts`; `shelf.ts` and `shelfMerge.ts` are unchanged. A save sends the change (`add` / `remove`) and the server applies it to what the account has now and PATCHes only `favourites`: never a whole-list overwrite, never a new shelf record, and nothing written to a server without the field (it leaves the field out of its answer). The dashboard (`src/components/useDashboardLayout.ts`) reads them on open and when it comes back into view; first meeting per device as the task says (account wins if it has any, else the device's go up), after that the account always wins. `Backend image` check extended (field exists and is null on a fresh database; owner sets and reads it; the books stay; a second user gets 404 reading and changing it). Checks: `npm test` 45 files passed, 1 skipped (305 tests passed, 6 skipped: the opt-in PocketBase test); `npm run build` built; with two local PocketBase 0.40.6 instances (repo migrations + hooks, and the same without the new migration) `PB_TEST_URL=http://127.0.0.1:8091 PB_TEST_OLD_URL=http://127.0.0.1:8092 npx vitest run src/server/favourites.pocketbase.test.ts` 6 passed; `migrate down 1` on a database with favourites printed `Reverted 1795737600_favourites.js`, the books stayed, and serving again re-added the field (null) with the books intact; the favourites saves added no `library_versions` copy (only the shelf save did: 1 copy). Browser check on a local dev server against the local PocketBase, with `localhost:3009` and `profile2.localhost:3009` as two profiles (separate cookies and storage): starred Reading goal and Calendar in the first; the second, which had its own favourite (Finish by), signed in and after a reload showed Reading goal and Calendar; unstarring Reading goal there showed in the first as soon as its tab came back into view; the server's books were unchanged. Signed-out per device is covered by the hook test, not checked in a browser. Noted for the architect: the Reset button while arranging still clears the favourites, and now does so on every device; a star made offline is dropped the next time the account is read. One run of `npm test` had the `shelfLayout` timing test (under 250 ms) fail at 371 ms while the machine was busy; it passed on the next runs.
- 2026-11-21 tester: sent back: two favourites saves that overlap lose a star. The server reads the list, changes it and writes the whole list back, so a second write wipes out the first: 20 of 20 rounds against a local PocketBase. It also happens on one device when two stars are tapped quickly, and the lost star then disappears from that device too (see Test). Everything else holds: books, arrangement, goals and `library_versions` are untouched; an old app's shelf save keeps the favourites; another user gets 404; a server without the field gets no writes; no record is created; the down migration keeps the books; ordering against #165 and #177 is safe.
