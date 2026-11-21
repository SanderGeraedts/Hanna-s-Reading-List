---
id: D-0016
title: "Recommended for you, Complete your series, Upcoming releases and Listening and reading are off the dashboard; books not out yet go on the shelf"
description: "At Hanna's request the four blocks she didn't use were removed with their code; a book whose publication date is still to come goes on the shelf as want-to-read, and What next? leaves it out."
status: Accepted
date: 2026-11-13
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard]
---

# Context

All four blocks were added on 2026-11-12:

- **Upcoming releases** (#103, #109): a book with a future release day waited in a dashboard block
  instead of on the shelf, and went onto the shelf on release day; #115 made it follow the
  publication date instead of a tick box.
- **Recommended for you** (#111) and **Complete your series** (#114), first with AI and, after
  #117 (D-0017), from Open Library.
- **Listening and reading** (#112): pages and hours per month.

On 2026-11-13 Hanna asked to remove the dashboard blocks she doesn't use; it was talked through
with her and done in #123 (opened from her own instance). Books that were waiting in Upcoming
releases appeared on the shelf.

On 2026-11-20 she asked in #186 for a block with books she might like that aren't on her shelf
yet; T-0008 plans to bring Recommended for you back for that, as "New for you". When it lands,
that part of this decision is replaced.

# Decision

- The dashboard has **no** Recommended for you, Complete your series, Upcoming releases or Listening
  and reading block; their code is gone.
- **A book that isn't out yet goes straight onto the shelf** as want-to-read. *What next?* leaves
  out books whose publication date (or Storytel release day) is still to come. The Calendar page
  still shows release days (#162).

# Rationale

Her choice about her own dashboard: blocks she doesn't use are clutter.

# Consequences

- Saved dashboard layouts drop removed blocks by themselves (`cleanLayout`); new and returning
  blocks must be added to saved layouts the same way.

# Guidance for agents

- Don't bring these blocks back without a request from Hanna; when one comes (as #186 did), the
  task replaces this decision for that block only.
- Keep *What next?* from suggesting a book she can't read yet.
