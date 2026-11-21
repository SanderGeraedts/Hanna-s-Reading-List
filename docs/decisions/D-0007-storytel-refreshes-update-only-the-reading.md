---
id: D-0007
title: "Storytel refreshes update only the reading; titles, page counts, merges and other details Hanna set stay hers"
description: "The ↻ refresh and the nightly Storytel sync bring status, progress, the reading log and the listening time up to date, but never change a title, page count of a paper book, merge or other detail she set herself; the nightly sync never adds books."
status: Accepted
date: 2026-11-06
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [storytel, data]
---

# Context

Most of Hanna's books come from her Storytel shelf: first by import, then with ↻ (#5, 2026-11-04)
and, since #77/#80 (2026-11-08), a nightly sync at 23:00 Amsterdam time. Each time she asked for a
way to correct a book, she asked for the correction to survive the next refresh:

- #12 (2026-11-06): shorter titles, "but this would be needed to be remembered upon refreshing
  from Storytel". Built so that a refresh never changes a title.
- #14 (2026-11-07): merged duplicates must stay merged "upon refreshing" (#30, D-0009).
- #35 (2026-11-07): her own page count; Storytel refreshes keep it (#37).
- #48 and #51 (2026-11-07): she asked for the listening time to come from Storytel (#49, #54),
  and for a listen-only book's pages to follow it (D-0008).
- #53 (#55): re-listening to a finished book and finishing it again counts once more.
- #77 (#80): the nightly sync only updates books already on the shelf (status, progress, reading
  log), never adds new ones, and leaves a shelf alone when a device has unsent changes.
- #91 (#95): a paused book goes back to *Reading* when its progress moves on, also from Storytel.

Recorded from the issues and from `src/lib/storytelImport.ts` as it is on `main`. No global
decision covers this.

# Decision

- **A refresh touches only the reading:** for a book that is on Storytel, ↻ and the nightly sync
  update its status, progress, reading log, times read and listening time, and add Storytel to its
  formats the first time it is matched. Nothing else on an existing book changes.
- **What she corrected stays:** titles she renamed, page counts of books she also has on paper or
  as an e-book, merges, series, genres, covers, back texts and every other detail are never
  overwritten by Storytel.
- **The listening time comes from Storytel,** and for a book she only listens to, its pages follow
  from it (D-0008).
- **Another Storytel edition of a merged book can only move it forward** (status or progress),
  never back.
- **New Storytel books are added by ↻,** not by the nightly sync.

# Rationale

She corrects books because Storytel's data is wrong or untidy for her (edition notes in titles,
duplicate editions, page counts that don't match her copy). A refresh that undid those
corrections would make them pointless and bring the same work back every night. Her progress, on
the other hand, lives in Storytel, so that part follows Storytel.

# Consequences

- A new detail she can edit stays safe as long as the import doesn't write it for matched books;
  any change to `importStorytelBooks` or `syncedShelf` has to keep that.
- Merged ids are remembered on the shelf, so an extra Storytel edition can't bring a copy back.

# Guidance for agents

- Don't widen what a Storytel refresh writes to an existing book beyond the reading fields above.
- When a refresh needs to touch a new field, ask Hanna first whether Storytel or she should win.
- Keep the nightly sync update-only, and keep it skipping a shelf with unsent changes.
