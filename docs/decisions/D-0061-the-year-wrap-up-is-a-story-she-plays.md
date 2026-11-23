---
id: D-0061
title: "The year wrap-up is a full-screen story she plays whenever she likes, for any year, ending in a shareable picture"
description: "Year in review becomes a ▶ Play block on the dashboard and the Stats page that opens a full-screen tap-through story for the chosen year — top book, author, genre, longest book, busiest month, pages, hours, new authors, her map — ending in a summary slide shared through the existing shareImage; the monthly wrap-up is unchanged."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, stats, sharing]
---

# Context

- On 22 November 2026 Hanna agreed the backlog item *Year wrap-up story (ST2)*: a wrap-up she can
  play any time, for this year so far or a past year, as full-screen slides she taps through,
  ending in a picture she can share.
- The dashboard already had a *Year in review* block (`WrappedCard`): one card with a year select,
  the numbers, book of the year and a list of facts. The monthly wrap-up (`WrapUpCard`) is a sheet
  that waits in *Waiting for you* in the first week of a month.
- D-0013 forbids anything that opens by itself to ask her something.

# Decision

- **The *Year in review* block becomes a `▶ Play` block,** on the dashboard and on the Stats page:
  the year, the headline numbers and one button. The card version with its fact list is gone.
- **The story is full screen and tap-through.** Each slide is one thing: how many books, top book,
  top author, top genre, longest book, busiest month, pages, hours listened, new authors, her map,
  and a final summary slide. A slide with nothing to say is left out.
- **It plays for any year** the picker offers, including this year so far ("… and the story
  continues") and a past year ("… and she read happily ever after").
- **It opens only on her tap** (D-0013): nothing starts a story on its own, and the story is not a
  question, so it never goes in *Waiting for you*.
- **The last slide shares a picture** drawn by the existing `shareImage` code, the same way the
  monthly wrap-up and the challenges do: no new sharing code, no new service.
- **The monthly wrap-up stays exactly as it is.**

# Rationale

A story is what she asked for and what the numbers deserve; a one-card summary cannot hold ten
facts without becoming the cluttered block the dashboard is trying to lose. Reusing `shareImage`
keeps sharing on the one path that already works on her phone and falls back to a download
elsewhere.

# Consequences

- A new file computes the slides from the shelf (`yearStory.ts`); the story screen is its own
  component, closed by Escape, the × and the backdrop, and walked with the arrow keys, Space and
  Enter as well as taps.
- The block id `wrapped` stays, so a layout or a star that names it keeps working.
- Nothing is saved: where she is in the story lives only while it is open.

# Guidance for agents

- Don't make the story open by itself, on a schedule or after finishing a book (D-0013).
- A new fact becomes one more slide, left out when the year has no data for it; don't crowd an
  existing slide.
- Keep sharing on `shareImage`; don't add a second way to make a picture.
