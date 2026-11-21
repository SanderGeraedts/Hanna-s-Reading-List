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

# Log

- 2026-11-21 architect: Task written from #182, following the reading-goals pattern (#66).
- 2026-11-21 developer: Built in draft PR #200. Migration `deploy/nas/pb_migrations/1795737600_favourites.js` (after #177's `1795651200`): only adds a JSON field `favourites` (max 4 KB) to `libraries`, skips if it exists; down removes it. Server functions `loadFavourites` / `saveFavourites` are in a new `src/server/favourites.ts` (store code in `favouritesStore.ts`) instead of `shelf.ts`, so this PR doesn't conflict with #177, which appends to `shelf.ts`; `shelf.ts` and `shelfMerge.ts` are unchanged. A save sends the change (`add` / `remove`) and the server applies it to what the account has now and PATCHes only `favourites`: never a whole-list overwrite, never a new shelf record, and nothing written to a server without the field (it leaves the field out of its answer). The dashboard (`src/components/useDashboardLayout.ts`) reads them on open and when it comes back into view; first meeting per device as the task says (account wins if it has any, else the device's go up), after that the account always wins. `Backend image` check extended (field exists and is null on a fresh database; owner sets and reads it; the books stay; a second user gets 404 reading and changing it). Checks: `npm test` 45 files passed, 1 skipped (305 tests passed, 6 skipped: the opt-in PocketBase test); `npm run build` built; with two local PocketBase 0.40.6 instances (repo migrations + hooks, and the same without the new migration) `PB_TEST_URL=http://127.0.0.1:8091 PB_TEST_OLD_URL=http://127.0.0.1:8092 npx vitest run src/server/favourites.pocketbase.test.ts` 6 passed; `migrate down 1` on a database with favourites printed `Reverted 1795737600_favourites.js`, the books stayed, and serving again re-added the field (null) with the books intact; the favourites saves added no `library_versions` copy (only the shelf save did: 1 copy). Browser check on a local dev server against the local PocketBase, with `localhost:3009` and `profile2.localhost:3009` as two profiles (separate cookies and storage): starred Reading goal and Calendar in the first; the second, which had its own favourite (Finish by), signed in and after a reload showed Reading goal and Calendar; unstarring Reading goal there showed in the first as soon as its tab came back into view; the server's books were unchanged. Signed-out per device is covered by the hook test, not checked in a browser. Noted for the architect: the Reset button while arranging still clears the favourites, and now does so on every device; a star made offline is dropped the next time the account is read. One run of `npm test` had the `shelfLayout` timing test (under 250 ms) fail at 371 ms while the machine was busy; it passed on the next runs.
