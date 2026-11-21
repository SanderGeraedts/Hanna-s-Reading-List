---
id: D-0010
title: "A book can have several formats, and when the shelf is grouped by format the physical copy wins"
description: "How I have it is a list (e.g. Paperback and Storytel), stored as Book.formats; search finds a book under any of them, and a book stands in one group only, physical first."
status: Accepted
date: 2026-11-07
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [data, books]
---

# Context

#9 (2026-11-06) gave each book one *How I have it*. In #16 (2026-11-06) Hanna asked for more than
one, as she has some books on paper and on Storytel. The triage comment (2026-11-07) planned a list
of formats, also as groundwork for merging (D-0009), and asked whether a book should stand in one
group or in each; she answered "Always let physical win". Built in #29: `formats` replaced the
single `format`, old values are still read, no migration.

No global decision covers this.

# Decision

- A book's formats are a list (`Book.formats`); old shelves with a single `format` still load.
- Search finds a book under any of its formats.
- When the shelf is grouped by format, a book stands in **one** group: the physical copy wins
  (physical groups first).

# Rationale

It matches how she owns books, and one place per book keeps the shelf from showing duplicates.

# Consequences

- Merging combines formats (D-0009). *How I have it* is no longer in the Arrange by menu (D-0012),
  but a shelf saved that way still groups by this rule.

# Guidance for agents

- Read and write `formats`, never only `format`; keep old shelves loading.
- Showing a book in several groups would change this decision: ask Hanna first.
