---
id: T-0008
title: "Bring back a dashboard block with new books she might like that aren't on her shelf"
description: "#186: a dashboard block of new releases by her favourite authors and in her favourite genres, from Open Library, leaving out books already on the shelf; built from the Recommended for you block removed in #123."
status: Doing
depends_on: [T-0001]
decisions: [D-0002, D-0003]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Hanna asked in #186, titled "Releases": "Can you make a block on the dashboard with books that
might be interesting for me to read, but aren't on the bookshelf yet."

The app had exactly such a block, **Recommended for you** (#111, made free of AI in #117): newer
books by her favourite authors (the ones she rates best and reads most) and new books from this
year and last in her favourite genres, from Open Library, each with a reason ("More by …, whose
books you rate ★4½"), skipping books on her shelf, ones she said *Not for me*, box sets, books
without a cover and titles in other scripts, with *+ Want to read* and *Not for me*. It was
removed on 13 November at her request, with *Complete your series* and *Upcoming releases*
(#123, commit `20ea52a`), because she didn't use it then.

Bring it back as a dashboard block, on today's design system (#157, #159), named for what she
asked: e.g. **"New for you"**.

**Assumptions, stated because the request is short:**

- "Releases" plus "might be interesting, not on the shelf yet" means new books picked from her
  own taste, which is what the old block did; restoring it (code from `20ea52a^`: 
  `RecommendCard.tsx`, `src/lib/recommend.ts` with its tests, `browseBooks` in
  `src/server/openLibrary.ts`) is the smallest change and is easy to remove again.
- Only this block comes back, not *Complete your series* or *Upcoming releases*.
- It uses Open Library only (free, no key), through the existing server function, and fails
  quietly: if Open Library is down the block shows a short note and the rest of the dashboard
  works. No AI (#117; Q-002 is about AI).
- *Not for me* choices made before #123, if any are still stored, are respected again.

# Done when

- The restored `src/lib/recommend.ts` has its unit tests back and passing: picks alternate
  between authors and genres, books on the shelf, *Not for me* books, box sets, books without a
  cover and titles in other scripts are left out, and each pick carries its reason.
- A unit test that the block shows its note, and no error, when the Open Library call fails.
- On the pull request's deploy preview (shelf in the browser): with a few rated and read books
  by one author on the shelf, the dashboard has the new block (in the layout's default place;
  existing saved layouts get it added rather than lost), it lists books by that author or in
  that genre that aren't on the shelf, each with its reason; *+ Want to read* puts the book on
  the shelf as want-to-read and it leaves the list; *Not for me* removes it and it stays gone
  after a reload. The block can be hidden and moved like the others.
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has reviewed the block on a phone and a desktop.
- The block is called "New for you" and stands, on a fresh layout, in *Today* right after
  *What next?*. With Open Library blocked (e.g. offline in the browser's developer tools) and
  no earlier suggestions, *Suggest books* shows "Open Library can't be reached right now. Try
  again later." in helper text, and the rest of the dashboard works.
- At 320 × 640 each suggestion's cover, title, reason and both buttons are fully visible.

# Notes

- `git show 20ea52a^:src/components/RecommendCard.tsx`, `…:src/lib/recommend.ts`,
  `…:src/lib/recommend.test.ts`, and the `browseBooks` part of `20ea52a`'s diff of
  `src/server/openLibrary.ts`, `src/components/Dashboard*.tsx`, `src/lib/dashboardLayout.ts`
  and `src/styles.css`.
- `src/lib/dashboardLayout.ts`: add the block id to `BLOCKS` and `DEFAULT_LAYOUT`, and make sure
  `cleanLayout` adds a new block to saved layouts.
- The server call goes through `src/server/openLibrary.ts`, like the existing ones (guardrails:
  free public API, fails quietly; name Open Library in the pull request).
- Close #186 from the pull request.

# Design

UX designer, before it is built: the block's name, where it sits by default, and how it looks on
the current design system. Review after.

## Design (2026-11-21, before the build)

The old *Recommended for you* block comes back as it worked, under the name she asked for and
on today's design system. Only the name, the place and a few states change. English, British
spelling, like the rest of the app.

**Name:** **"New for you"**, as the block's heading and in the Arrange list (`BLOCKS`).

**Where by default:** in *Today*, in the right column straight after *What next?* and before
*Newly added* (that's also where it stood before #123, next to *What next?*). On a phone the
two columns are shown as one, so it comes after *What next?* there too. Saved layouts get it in
that place via `cleanLayout`; she can move, star or hide it like any block.

**Layout** (a normal `dash-card`, with a button in the card's head like other blocks):

```
New for you                              [ Suggest books ]
[cover]  A Court of Silver Flames
         Sarah J. Maas · 2021
         More by Sarah J. Maas, whose books you rate ★4½
         [ + Want to read ]  Not for me
[cover]  The Book of Doors
         Gareth Brown · 2025
         New in Fantasy
         [ + Want to read ]  Not for me
…  (at most 6)
```

- **Cover:** the small dashboard cover (`.dash-cover.small`), loaded lazily. Until it loads,
  or when there is none, a blank cover in the book's stand-in colour (`.dash-cover.blank`).
- **Title** in normal text, bold; **author · year** in helper text; the **reason** in small
  text ("More by …, whose books you rate ★4½", "New in Fantasy"), exactly as `recommend.ts`
  writes them.
- **"+ Want to read"** (`btn small`, secondary): adds the book to the shelf as *Want to read*,
  with its cover and details from Open Library, like adding it through search. While busy:
  "Adding…". Then the line leaves the list, and a helper-text line at the top of the block
  says "“A Court of Silver Flames” is on your shelf." (`role="status"`).
- **"Not for me"** (`btn small quiet`, text only; the old `ghost` class is gone since #157 and
  `quiet` replaces it): the line leaves the list and the book isn't suggested again on this
  device, also after a reload. The old "not for me" list (`hannas-reading-list:not-for-me:…`)
  is read again.
- **The head button:** "Suggest books" when the block has nothing to show, "New suggestions"
  when it has, "Looking…" (disabled) while it searches. The block doesn't search by itself
  every time the dashboard opens: the last suggestions are kept on the device (as before), so
  opening the dashboard is quick and Open Library isn't asked every time.

**States** (all in helper text, `muted small-text`; nothing in the red error colour, because
none of these are her fault):

- *Never asked, or all suggestions used up:* "New books by your favourite authors and in your
  favourite genres. Rate a few books for better picks."
- *Looking:* the button says "Looking…"; suggestions already shown stay; the list has
  `aria-busy="true"`.
- *Too little to go on* (no rated or read books): "Finish and rate a few books first, so there
  is something to go on."
- *Open Library can't be reached* (every request failed): "Open Library can't be reached right
  now. Try again later." Suggestions shown before stay; the rest of the dashboard isn't
  affected. This is the note the unit test in *Done when* checks.
- *Nothing new found:* "Nothing new found just now. Try again later."

**Phone and long text:** at 390 px and at 320 px the cover stays on the left and the text
beside it. The two buttons wrap under each other when they don't fit, each at least 44 px high
on touch screens. Long titles and reasons wrap; they aren't cut off. The head button may drop
under the heading on a narrow card, like other block heads.

**Keyboard and screen reader:** a `section` labelled by its heading, and the suggestions a
list. Because there are up to six of each, the buttons get names that include the book: "Add
“A Court of Silver Flames” as Want to read" and "Not for me: “A Court of Silver Flames”".
After a line leaves the list, focus goes to the next line's "+ Want to read", or to the head
button when the list is empty.

**Easy to revert:** one block, restored from `20ea52a^` with its tests; hiding it or removing
the block id puts the dashboard back as it is today.

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

# Test

# Log

- 2026-11-21 architect: Task written from #186; found the removed block (#111, #117, #123) and
  chose restoring it as the smallest reversible reading of the request.
- 2026-11-21 ux-designer: design written. "New for you" goes in Today after What next?; the
  old block on the design system with "+ Want to read" and "Not for me" (quiet), "Suggest
  books" / "New suggestions", and notes in helper text, including one for Open Library being
  unreachable.
- 2026-11-21 developer: checked the closed #123 (the block removed at her request) and #117
  (AI removed): this brings back only the non-AI version from `20ea52a^` (Open Library's free
  search, no key, no AI, no paid service), not *Complete your series* or *Upcoming releases*.
  Built on branch `t-0008-new-for-you`, **based on T-0006's branch** (#199), because both add a
  block to Today in `DEFAULT_LAYOUT` and the lines conflict. Restored `recommend.ts` with its
  tests and `browseBooks` in `src/server/openLibrary.ts`; new `findSuggestions` tells "Open
  Library can't be reached" (every request failed) apart from "nothing new" and "nothing to go
  on". `NewForYouCard.tsx` ("New for you") follows the Design: right after *What next?*,
  "Suggest books" / "New suggestions" / "Looking…", "+ Want to read" and "Not for me"
  (`quiet`), names with the book's title, notes in helper text, a `role="status"` line after
  adding, focus to the next line or the head button, no search when the dashboard opens (the
  last suggestions are kept on the device; the old *Not for me* list is read again).
  `cleanLayout` now puts a block added later after the block it follows by default, so saved
  layouts get "New for you" right after *What next?*. `npm test`: 51 files, 351 tests passed
  (T-0008's in `recommend.test.ts` and `NewForYouCard.test.tsx`); `npm run build`: built.
  Local dev server with no backend, 320 px and 1280 px: opening the dashboard calls no Open
  Library search (only the existing session and Storytel status calls); with the server
  function blocked, *Suggest books* shows "Open Library can't be reached right now. Try again
  later." and all 25 other blocks stay; with Open Library, six suggestions with reasons ("More
  by Sarah J. Maas, whose books you rate ★4½", "New in Fantasy"), every line fully visible at
  320 px, buttons 44 px on touch; *+ Want to read* put the book on the shelf as want-to-read
  and it left the list; *Not for me* kept it gone after a reload. No code-owned path touched.
  Note for the architect: two timing-based tests (`shelfLayout.test.ts` "is quick enough",
  `library.sync.test.ts` first sign-in, `vite.config.test.ts`) failed once each on this busy
  machine and passed on a rerun.
