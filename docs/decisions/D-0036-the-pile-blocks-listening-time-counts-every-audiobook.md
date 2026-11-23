---
id: D-0036
title: "The Want-to-read pile block's grey line counts every audiobook's listening time, by the same rule as the 🎧 line"
description: "In the Want-to-read pile block the grey “… pages · … to listen” line takes its listening time from every want-to-read book with Audiobook or Storytel (minutes, else pages × 2, else 560, as the 🎧 Audiobook line, D-0030), so both show the same hours; its pages stay the real page counts of the want-to-read books she doesn't only listen to, without estimates, so a paper book she also has on Storytel adds its pages and its minutes."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, pile, audiobooks]
---

# Context

The **Want-to-read pile** block shows two listening times that disagree, e.g. a grey line
"3,900 pages · 31 h to listen" and, with 🎧 Audiobook picked, "Your audiobooks are 41 h: …".

- The grey line (`wantPile` in `src/lib/insights.ts`, T-0014) follows D-0008's split: a book she
  **only listens to** adds its `minutes` (and nothing if it has none); every other book adds its
  `pages`. A paperback she also has on Storytel adds only its pages, and an audiobook without a
  length adds nothing.
- The 🎧 line (`pileHeights(...).audioMinutes`, D-0030) and the 🎧 pace line (D-0031) count **every**
  want-to-read book with Audiobook or Storytel, listen-only or not, with `audioMinutes`: its
  `minutes`, else `pages × 2`, else 560.

On 2026-11-22 Hanna agreed: **both count every audiobook on the pile**, so they show the same hours.
She left the pages part of the grey line to the team, as long as it stays sensible: pages for the
books with paper or an e-book. D-0008 says treating audiobooks differently in one feature is
Hanna's choice; this is that choice, for this line.

# Decision

**The grey line's listening time** is the 🎧 line's total: the sum of `audioMinutes(book)` over
every want-to-read book whose formats (`formatsOf`, so an old Storytel import with only
`storytelId` counts) include Audiobook or Storytel, listen-only or not:

- its `minutes` when above 0;
- otherwise `pages × 2` when `pages` is above 0;
- otherwise 560.

It is the same number as `pileHeights(books).audioMinutes`, worked out by the same function, and
written with `formatDuration` as now.

**The grey line's pages** stay as they are (the architect's pick, T-0036): the sum of `pages` over
the want-to-read books she does **not** only listen to (`!listenOnly`: any paper format, E-book,
Other or no format), counting only real page counts, with no estimate for a book without pages.

- A book she only listens to adds no pages (its `pages` is a copy of its minutes, D-0008).
- A paper book or e-book she also has as an audiobook adds **both** its pages and its minutes:
  she could read it or listen to it, and each half of the line answers its own question.
- The line still shows each half only when it is above 0, and still shows the whole pile whatever
  the switch shows (T-0023).

**D-0030 governs this line's listening time** from now on; D-0008's split no longer applies to it.
D-0008 still holds for the shelf, bingo, badges, records and the reading statistics of finished
books (`periodStats`, the calendar's "listened").

# Rationale

- One listening total in one block: the grey line, the 🎧 line and the 🎧 pace line now speak about
  the same hours, so nothing on the block contradicts anything else.
- The pages stay a plain count of real pages: adding 280-page estimates or `minutes ÷ 2` would turn
  "pages" into a guess, and the height line already does the estimating. Keeping the current pages
  rule means the pages number she knows doesn't change.
- Counting a paper-and-Storytel book in both halves matches the switch, where such a book counts in
  📖 Paper and in 🎧 Audiobook (D-0030).

# Consequences

- The grey line's hours go up when she has audiobooks without a length, or paper books she also
  has on Storytel; the pages don't change.
- The pages and the hours can no longer be added up into "the whole pile": a book can be in both.
- A future change to `audioMinutes` changes the grey line too.
- Built and tested in T-0036.

# Guidance for agents

- Take the grey line's minutes from `audioMinutes` in `src/lib/pileHeight.ts` (or from
  `pileHeights`), never from a second rule.
- Don't apply this to the statistics of finished books: there a book she reads on paper and also has
  on Storytel counts its pages only (D-0008), so one read isn't counted twice.
- Counting estimates in the pages, or splitting a book between the halves, is Hanna's choice: ask
  her first.
