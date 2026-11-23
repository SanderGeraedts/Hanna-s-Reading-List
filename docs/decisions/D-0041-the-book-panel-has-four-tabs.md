---
id: D-0041
title: "The book panel is four tabs — Reading, Notes, Details, Looks — and always opens on Reading"
description: "Everything in the book panel is split over four tabs under the title; the panel opens on Reading for every book and never remembers the last tab, the merge section sits at the bottom of Details, and the title block, the side picker and Put back / Remove stay outside the tabs so they are there on every tab."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book-panel, navigation]
---

# Context

The book panel (`src/components/BookPanel.tsx`) grew field by field until it was one long
scroll of about thirty controls: status, progress, rating, spice, times read, dates, formats,
price, e-book link, language, genres, Set in, lent, sleep read, journal, series, pages, ISBN,
published, back cover, the cover and colour fields, and the merge section. On a phone it is a
bottom sheet, so the thing she wants ("I'm at page 120") is often four screens down.

Hanna asked for tabs in her feature chat of 22 November 2026, and said which field belongs on
which tab. Two things were left to the team: where the merge section goes, and whether the
panel remembers the last tab. She was explicit about the second: it should **not** remember —
she opens a book to say how far she is, nearly every time.

# Decision

1. **Four tabs, under the title, in this order: Reading · Notes · Details · Looks.**
   - **Reading:** status, "stopped at" for a did-not-finish book, progress, rating, spice,
     times read, Finished on, Started on.
   - **Notes:** journal, tropes, characters (D-0042), lent to a friend, 🌙 sleep read.
   - **Details:** how I have it (formats), price, e-book link, series (with "Part of a
     series?"), pages, length, ISBN, published, language, genres, Set in, back cover and
     Find back text, and at the bottom the **merge section**.
   - **Looks:** Front/Spine/Back, Change cover…, spine colour, page edges.
2. **The panel opens on Reading every time.** The tab is not remembered, not per book, not
   per device, not in a URL.
3. **The merge section goes last on Details.** It is about which book this is, not about her
   reading, and it is the one thing in the panel that changes another book too, so it sits at
   the end of the longest tab rather than beside the everyday fields.
4. **What stays outside the tabs,** visible on every tab: the title with its rename, "Shorten
   to", the "Was …" line, the byline and the facts line, the Open in Storytel / e-book
   buttons, the × close button, and the **Put back** and **Remove** buttons at the bottom.
   The Front/Spine/Back picker moves **into** Looks: it is about the 3D book, and the back
   cover text field already turns the book on its own.
5. **Sleep read stays with the notes**, not with the status. It is a thing she notes about a
   book, and it is what decides whether a finish asks for a rating; grouping it with the
   journal keeps Reading to "where am I now".
6. **Nothing is removed or renamed.** Every control keeps its words, its order within its
   group and its behaviour; only the grouping changes. The fields that only appear in some
   states (progress only while reading or paused, rating/spice/times read/Finished on only
   for a finished book, price only while she owns a copy, Length only with audio) keep
   exactly those conditions inside their tab, so a tab can be short or nearly empty.
7. **A tab that would be empty is still shown.** Reading for a want-to-read book holds only
   the status and Started on; that is fine and expected. Hiding tabs per book would make the
   row jump around between books.

# Guidance for agents

- The tab row is the project's existing `.tabs` / `.tab` pattern (`styles.css`, as in
  `AddBookDialog`), with `role="tablist"`, `role="tab"`, `aria-selected`, and each panel
  `role="tabpanel"` labelled by its tab. Arrow keys move between tabs (roving tabindex);
  Home/End jump to the first and last.
- Keep the fields **mounted only for the open tab**, but make sure the panel's existing
  save-on-unmount (`saveOnClose`) still saves a half-typed series name, lent name or back
  cover when she switches tab: the draft state lives in `BookPanel` itself, so moving fields
  into tab components must not move that state with them, or write the draft out on switch.
- "Opens on Reading every time" means the tab state is keyed on the book and reset whenever
  the panel opens; a test should show that opening book A on Details and then book B shows
  Reading, and that closing and reopening the same book shows Reading.
