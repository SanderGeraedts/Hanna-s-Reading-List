---
id: T-0008
title: "Bring back a dashboard block with new books she might like that aren't on her shelf"
description: "#186: a dashboard block of new releases by her favourite authors and in her favourite genres, from Open Library, leaving out books already on the shelf; built from the Recommended for you block removed in #123."
status: Open
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

# Test

# Log

- 2026-11-21 architect: Task written from #186; found the removed block (#111, #117, #123) and
  chose restoring it as the smallest reversible reading of the request.
