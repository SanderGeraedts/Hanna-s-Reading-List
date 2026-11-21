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

## Second run (tester, 2026-11-21, on `02de8e4`)

**Verdict: sent back, for one reason only.** `npm test`, a *Done when* item, failed in 6 of 7
full runs on this machine. Each time the failures were in the new `src/lib/favouritesSync.test.ts`.
Everything about the feature itself passed: the fix works, the data is safe, and the
two-profile check passed.

**Failed: `npm test` is flaky because of the new hook tests.**

- Full runs 1 to 5 and 6 to 7, from a fresh `npm ci`:
  - `Tests 4 failed | 336 passed`
  - `2 failed | 338 passed`, five times
  - `340 passed`, once
- What failed:
  - `a star made before the first account read returns is kept`: `expected [ 'reading' ] to deeply equal [ 'reading', 'goal' ]`
  - `signed out, favourites stay on the device and the server is never asked`: one stray `GET .../libraries/records?...fields=id,favourites`, left over from the previous test's device
  - Once each: `shows blocks starred on one device...`, `the first time, ...`, `ignores junk...`
- The file run alone failed 1 of 5 times.
- The cause is in the test, not the app:
  - `settle()` waits a fixed 60 ms. The stand-in server takes 3 ms per call, and a device now chains several calls.
  - On a busy machine (CPU 24–61% from other work) 60 ms isn't enough. The chain of the previous test is then still running when the next test starts.
  - Lengthening the wait didn't make it reliable: 250 ms still failed once in three runs.
  - My own cases wait for a condition instead of a fixed time, and passed 3 of 3 runs on the same machine (below).
- The fix: wait for the condition (`vi.waitFor`, or poll until the server or the device has the expected list), and let each device's queue drain or unmount before the next test.
- CI `test` was green on `02de8e4`, but a required check on `main` that depends on timing will fail other pull requests at random.

**Passed:**

- `npm ci`: `added 654 packages`. `npm run build`: `✓ built in 1.34s`.
- Developer's real-PocketBase test, on two local PocketBase 0.40.6 instances:
  - The new one had all the migrations and hooks. The old one had neither `1795737600_favourites.js` nor `favourites.pb.js`.
  - Command: `PB_TEST_URL=http://127.0.0.1:8611 PB_TEST_OLD_URL=http://127.0.0.1:8612 npm exec vitest -- run src/server/favourites.pocketbase.test.ts`
  - Result: `Tests 7 passed (7)`.
- My race and data-safety test from the first run, unchanged except the ports:
  - `simultaneous star from two devices: lost one star in 0 of 20 rounds` (it was 20 of 20).
  - `no-shelf: nothing created OK`.
  - Favourites saves: books, arrangement and goals intact, `library_versions 0 -> 0`.
  - An old app's shelf save keeps the favourites.
  - Other user: isolated, and re-owning their record onto mine gave `404`.
  - Old server: `updated 09:56:43.894Z -> 09:56:43.894Z`, with no `favourites` key.
- My sync test, adapted to the new route:
  - The developer's stand-in, plus a whole-record PATCH (what the old store sent) and a switch that turns the route into read, wait, write, without a transaction.
  - It waits for conditions, not fixed times.
  - New code, 3 of 3 runs passed:
    - Quick taps: server `["goal","reading"]`, and the device still has them after coming back.
    - Two devices at once: server `["goal","calendar"]`.
    - Route without a transaction, one device: `["goal","reading"]`, with at most 1 save in flight. So the device queue alone protects quick taps.
  - The old hook and store from `054e69e`, swapped in: **3 of 3 cases failed** (`["reading"]`, `["calendar"]`, `["reading"]`). So the test still catches the old bug.
- The hook's security, probed with curl against the local server:
  - Who can call it:
    - Signed out: `401`. A made-up token: `401`.
    - A superuser token: `403`, because the route is limited to `requireAuth('users')`.
    - GET on the route: `404`.
  - Whose record it writes:
    - It only finds the record by `owner = {:owner}`, taken from the signed-in user, with the value bound.
    - Another user starring, while passing `owner` and `id` for my record in the body, changed only their own list. Mine stayed `[]`.
    - `books` and `favourites` sent in the body were ignored.
  - Input checks:
    - A body that isn't JSON: `400`.
    - Non-list `add` and `remove`: ignored.
    - Ids that aren't lowercase letters, longer than 30 characters, non-strings or duplicates were dropped.
    - A 1.4 MB body with 200,000 ids was answered quickly, and the list stays capped at 50.
  - Size: 50 ids of 30 characters take 1,606 bytes, under the field's 4 KB `maxSize`. The app's read cleans unknown ids (`constructor` was stored, but the app drops it).
- Funnel: `serve.json` is unchanged. The route `/api/collections/libraries/favourites` falls under the existing `/api/collections/libraries/` handler, and no new path opens.
- Old server, without the hook: the route answers `404 The requested resource wasn't found.`, which the app takes as "keep them on this device".
- Down migration with the new hook still present:
  - `Reverted 1795737600_favourites.js`.
  - The route then answers `404`, because the field is gone. All three books are intact.
- Two-profile check, scripted, with Playwright. It ran on a local dev server (`localhost:3611`, `POCKETBASE_URL` pointed at the local 8611, no Netlify site link). Each profile is a separate browser context. I signed up `test@example.com`. The app didn't make the shelf record itself, so I made it the way `saveShelf` does.
  - Profile 1 starred Reading goal and Calendar; the server had `["goal","calendar"]`.
  - Profile 2 already had its own favourite for the account (Finish by). After signing in and reloading it showed `["Reading goal","Calendar"]`, so the account wins.
  - Profile 2 unstarred Reading goal. Profile 1 showed `["Calendar"]` after `visibilitychange`.
  - Two quick taps in profile 1 (both clicks at once): server `["calendar","heatmap","pace"]`, also after coming back. Profile 2 showed them after a reload.
  - A star in each profile at the same moment: server `[...,"badges","authors"]`, both kept.
  - Offline: an unstar of Calendar stayed on the device while offline, also after coming back into view. Back online, the server had `["heatmap","pace","badges","authors"]`.
  - Reset while arranging kept the favourites on the device and on the server.
  - Writes after the app opened, from the server log:
    - Only the app's two initial shelf saves, which filled in my hand-made books (`editedAt`, `language`, `genres`) and made the one `library_versions` copy.
    - After that, only `POST /api/collections/libraries/favourites`. The book ids, titles and statuses never changed.
- Signed out: on a local dev server with no backend (`localhost:3612`), a star stayed after a reload, under `hannas-reading-list:dashboard:local`. No favourites server function was called; the only calls were to `auth.ts` and `storytel.ts`.

**Not blocking, for the developer or the architect:**

- The hook keeps ids it doesn't know (up to 50) and adds new stars at the end. So if something other than the app filled the list with 50 junk ids, a real star would be cut off. I tried it: with 50 stored, `add: ["calendar"]` answered 50 entries without Calendar. The app never writes junk.
- The hook only accepts lowercase letters for block ids. All 25 block ids are like that today, but a new id such as `finishBy` would be dropped without a word.
- Two tabs on one device share the unsent list. If both send it at the same moment, one tab's newer change can be removed from the list by the other. This needs two open tabs with near-simultaneous taps, so it is unlikely.

# Log

- 2026-11-21 architect: Task written from #182, following the reading-goals pattern (#66).
- 2026-11-21 developer: Built in draft PR #200. Migration `deploy/nas/pb_migrations/1795737600_favourites.js` (after #177's `1795651200`): only adds a JSON field `favourites` (max 4 KB) to `libraries`, skips if it exists; down removes it. Server functions `loadFavourites` / `saveFavourites` are in a new `src/server/favourites.ts` (store code in `favouritesStore.ts`) instead of `shelf.ts`, so this PR doesn't conflict with #177, which appends to `shelf.ts`; `shelf.ts` and `shelfMerge.ts` are unchanged. A save sends the change (`add` / `remove`) and the server applies it to what the account has now and PATCHes only `favourites`: never a whole-list overwrite, never a new shelf record, and nothing written to a server without the field (it leaves the field out of its answer). The dashboard (`src/components/useDashboardLayout.ts`) reads them on open and when it comes back into view; first meeting per device as the task says (account wins if it has any, else the device's go up), after that the account always wins. `Backend image` check extended (field exists and is null on a fresh database; owner sets and reads it; the books stay; a second user gets 404 reading and changing it). Checks: `npm test` 45 files passed, 1 skipped (305 tests passed, 6 skipped: the opt-in PocketBase test); `npm run build` built; with two local PocketBase 0.40.6 instances (repo migrations + hooks, and the same without the new migration) `PB_TEST_URL=http://127.0.0.1:8091 PB_TEST_OLD_URL=http://127.0.0.1:8092 npx vitest run src/server/favourites.pocketbase.test.ts` 6 passed; `migrate down 1` on a database with favourites printed `Reverted 1795737600_favourites.js`, the books stayed, and serving again re-added the field (null) with the books intact; the favourites saves added no `library_versions` copy (only the shelf save did: 1 copy). Browser check on a local dev server against the local PocketBase, with `localhost:3009` and `profile2.localhost:3009` as two profiles (separate cookies and storage): starred Reading goal and Calendar in the first; the second, which had its own favourite (Finish by), signed in and after a reload showed Reading goal and Calendar; unstarring Reading goal there showed in the first as soon as its tab came back into view; the server's books were unchanged. Signed-out per device is covered by the hook test, not checked in a browser. Noted for the architect: the Reset button while arranging still clears the favourites, and now does so on every device; a star made offline is dropped the next time the account is read. One run of `npm test` had the `shelfLayout` timing test (under 250 ms) fail at 371 ms while the machine was busy; it passed on the next runs.
- 2026-11-21 tester: sent back: two favourites saves that overlap lose a star. The server reads the list, changes it and writes the whole list back, so a second write wipes out the first: 20 of 20 rounds against a local PocketBase. It also happens on one device when two stars are tapped quickly, and the lost star then disappears from that device too (see Test). Everything else holds: books, arrangement, goals and `library_versions` are untouched; an old app's shelf save keeps the favourites; another user gets 404; a server without the field gets no writes; no record is created; the down migration keeps the books; ordering against #165 and #177 is safe.
- 2026-11-21 developer: fixed what the tester sent back.
  - Overlapping saves:
    - On the server, a new hook `deploy/nas/pb_hooks/favourites.pb.js` adds `POST /api/collections/libraries/favourites` `{add, remove}`. Signed-in users only. It reads the person's shelf, applies the change and saves only `favourites` inside one `runInTransaction`, so writes to the list happen one after another. It answers 404 when there is no shelf or no field.
    - It lives under `/api/collections/libraries/` because `serve.json` already passes that path on, so nothing changes on the NAS.
    - PocketBase's `field+` / `field-` modifiers only exist for select, relation, file and number fields, not JSON. Compare-after-write can't rule out a lost star: the other save can land after the check.
    - `changeFavourites` now calls this route instead of PATCHing the whole list.
    - On the device, `useDashboardLayout.ts` keeps every star and unstar in an unsent list in browser storage. It sends them one at a time, oldest first, and runs every server step in one queue. When the account is read, unsent changes go up first.
  - Offline stars: a star made offline, before the first account read, or before the app is closed is now sent later instead of dropped.
  - Reset: decided by the orchestrator in the architect's place. Reset while arranging resets the layout only and leaves the favourites alone on every device (`resetLayout` in `dashboardLayout.ts`), with tests.
  - Tests that start saves without awaiting:
    - Hook test: two quick taps on one device, with at most one save in flight; two devices at the same instant.
    - Real PocketBase test: six `Promise.all` saves × 20 rounds lost 0 stars, plus a star and an unstar at once.
    - New hook tests: offline star then back, offline star then the app closed, star before the first read, star by a device that never reached the server, Reset.
    - The tester's `zz-tester-sync.test.ts` cases are in `favouritesSync.test.ts`. Its stand-in server only handled PATCH, so the file can't run as written against the new route.
    - The tester's `zz-tester.pocketbase.test.ts`, on ports 8473/8474, printed `lost one star in 0 of 20 rounds`, plus `library_versions 0 -> 0` for favourites saves and old server `updated` unchanged.
    - The `Backend image` check also tests the route: 401 signed out; 404 for a user without a shelf; ten stars sent in parallel with `&` all kept; the books unchanged.
  - Check output:
    - `npm test`: `Test Files 45 passed | 1 skipped (46)`, `Tests 311 passed | 7 skipped (318)`.
    - `npm run build`: `✓ built in 1.89s`.
    - `tsc --noEmit`: clean.
    - `PB_TEST_URL=http://127.0.0.1:8471 PB_TEST_OLD_URL=http://127.0.0.1:8472 npx vitest run src/server/favourites.pocketbase.test.ts`: `Tests 7 passed (7)`.
  - Two-profile check, on a local dev server and local PocketBase, with `localhost:3019` and `profile2.localhost:3019`:
    - Three stars tapped with no wait in profile 1 all reached the server: `["goal","calendar","pace"]`.
    - Profile 2 showed all three on load.
    - Unstarring Calendar there showed in profile 1.
    - Reset in profile 2 cleared its hidden block and kept `["goal","pace"]`, on the server too.
    - A star of Records in profile 2 reached profile 1 when its `visibilitychange` handler ran. I fired that event in the page, because the browser tool doesn't switch tabs.
    - The books stayed `b1, b2` throughout.
- 2026-11-21 tester: sent back: `npm test` failed in 6 of 7 full runs on this machine. The new hook tests in `favouritesSync.test.ts` wait a fixed 60 ms (`settle`), and one test's leftover queue leaks into the next. They need to wait for a condition instead. Everything else passed on `02de8e4`: 0 of 20 races lost on a real PocketBase; my adapted sync test passes on the new code and fails on the old; the hook is owner-only, cleans its input and is capped; the route is reachable through the existing Funnel path and opens no new one; data safety holds; and the two-profile, offline, Reset and signed-out checks pass (see Second run).
- 2026-11-21 developer: fixed what the tester sent back the second time.
  - `src/lib/favouritesSync.test.ts` has no fixed sleeps any more.
    - `settle()` waits until the stand-in server has had no call in progress for three timer turns in a row, with a 10 s limit. A device starts its next call before any timer runs, so a quiet turn means its queue is empty.
    - After each test, every device is unmounted and the test waits for quiet before the stand-in server is reset, so nothing leaks into the next test.
    - The tester's condition-based `zz-tester-sync.test.ts` passed 3 of 3 against this code.
  - Hook (`pb_hooks/favourites.pb.js`):
    - Stored values that aren't block ids are dropped.
    - Over the limit of 50, the oldest go, so a new star always lands.
    - Ids may be camelCase (`^[A-Za-z][A-Za-z0-9_-]{0,39}$`); the app still keeps only the ids it knows.
    - New PocketBase tests: 60 junk ids, then a real star lands last; `finishBy` is kept and malformed ids are dropped.
  - Noted, not changed: two tabs of the app on one device share the unsent list in browser storage. Both may send the same change, which is harmless because a change is idempotent. A change can also be sent while the other tab is removing it from the list.
  - Check output:
    - `npm test` ×10 in full:
      - runs 1, 3, 4, 5, 6, 8, 9 and 10: `Test Files 49 passed | 1 skipped (50)`, `Tests 340 passed | 9 skipped (349)`;
      - runs 2 and 7 failed only the existing `shelfLayout` timing test, `is quick enough to run on every change` (430 ms and 358 ms against a 250 ms limit), in code this task doesn't touch. For the architect: that test fails on a busy machine.
      - `favouritesSync.test.ts` passed in every run.
    - `npx vitest run src/lib/favouritesSync.test.ts` ×10: `Tests 17 passed (17)` every time.
    - `npm run build`: built.
    - `tsc --noEmit`: clean.
    - `PB_TEST_URL=http://127.0.0.1:8771 PB_TEST_OLD_URL=http://127.0.0.1:8772 npx vitest run src/server/favourites.pocketbase.test.ts`: `Tests 9 passed (9)`.

