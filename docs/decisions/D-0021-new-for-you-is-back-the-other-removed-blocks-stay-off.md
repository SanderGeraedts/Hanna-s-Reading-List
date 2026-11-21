---
id: D-0021
title: "New for you (suggested books not on the shelf) is on the dashboard again; Complete your series, Upcoming releases and Listening and reading stay off; books not out yet go on the shelf"
description: "At Hanna's request in #186 a block of suggested books from Open Library that aren't on her shelf is back as New for you; the other three blocks removed in #123 stay off, a book whose publication date is still to come goes on the shelf as want-to-read, and What next? leaves it out."
status: Accepted
date: 2026-11-21
decided_by: requester
overrules: []
replaces: [D-0016]
replaced_by: []
resolves: []
tags: [dashboard]
---

# Context

All four blocks removed in #123 were added on 2026-11-12:

- **Upcoming releases** (#103, #109): a book with a future release day waited in a dashboard block
  instead of on the shelf, and went onto the shelf on release day; #115 made it follow the
  publication date instead of a tick box.
- **Recommended for you** (#111) and **Complete your series** (#114), first with AI and, after
  #117 (D-0017), from Open Library.
- **Listening and reading** (#112): pages and hours per month.

On 2026-11-13 Hanna asked to remove the dashboard blocks she doesn't use; it was talked through
with her and done in #123 (opened from her own instance), recorded as D-0016. Books that were
waiting in Upcoming releases appeared on the shelf.

On 2026-11-20 she asked in #186 ("Releases"): "Can you make a block on the dashboard with books
that might be interesting for me to read, but aren't on the bookshelf yet." For that one block
she changed her mind. T-0008 brings Recommended for you back, without AI (D-0017) and from Open
Library only (D-0018), named **New for you**. This decision replaces D-0016 with the same content
except for that block.

# Decision

- The dashboard has a **New for you** block again: newer books by her favourite authors and new
  books in her favourite genres from Open Library, leaving out books on her shelf and ones she
  said *Not for me*, with *+ Want to read* and *Not for me*. It looks only when she presses its
  button, not each time the dashboard opens. She can move or hide it like any block.
- The dashboard has **no** Complete your series, Upcoming releases or Listening and reading block;
  their code stays gone.
- **A book that isn't out yet goes straight onto the shelf** as want-to-read. *What next?* leaves
  out books whose publication date (or Storytel release day) is still to come. The Calendar page
  still shows release days (#162).

# Rationale

Her choice about her own dashboard: blocks she doesn't use are clutter, and she has now asked for
the suggestions again.

# Consequences

- Saved dashboard layouts drop removed blocks by themselves (`cleanLayout`); New for you is added
  to saved layouts after *What next?*, as new and returning blocks must be.

# Guidance for agents

- Keep New for you free of AI (D-0017) and of keyed services such as Google Books (D-0018): Open
  Library only, failing quietly with a short note.
- Don't bring Complete your series, Upcoming releases or Listening and reading back without a
  request from Hanna; when one comes, a decision replaces this one for that block.
- Keep *What next?* from suggesting a book she can't read yet.
