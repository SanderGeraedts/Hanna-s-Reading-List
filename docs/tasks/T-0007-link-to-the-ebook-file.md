---
id: T-0007
title: "Let a book hold a link to its e-book file, shown only when one is added"
description: "#185: an optional link per book to where Hanna keeps the e-book (Google Drive, a server), with an open button in the book panel like \"Open in Storytel\", shown only when the link is set."
status: Doing
depends_on: [T-0001]
decisions: [D-0002, D-0003]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Hanna asked in #185: "As I have some books saved as an e-book on the server and/or Google Drive,
it would be great if I can link that in the book like we have with Storytel, but only make it
visible if the link is added. That comes in handy if I have deleted a book from my e-reader but
want it back to reread, or if it was a download for later."

- **A new optional field on `Book`**, e.g. `ebookUrl?: string`: a link she pastes in the book
  panel. Optional, so every shelf saved before still loads (D-0002).
- **In the book panel:** an "Open e-book" button next to "Open in Storytel", shown **only when the
  link is set**; it opens the link in a new tab. A small way to add, change or remove the link
  (e.g. "Add e-book link…" among the panel's less-used actions), which is all that shows when
  there is no link.
- **Only `https://` and `http://` links are accepted;** anything else (`javascript:`, `data:`,
  `file:`) is refused with a short note. The link opens with `rel="noopener noreferrer"`.

**Assumptions:** one link per book is enough; the app only stores and opens the link (it
doesn't check that the file exists, fetch anything from Google Drive or the server, or sign in
anywhere), so nothing new is needed from Sander. "The server" is whatever address she pastes;
the app doesn't treat it specially.

# Done when

- Unit tests (Vitest) for the link check: `https://drive.google.com/file/d/abc/view` and
  `http://192.168.1.10/books/x.epub` are accepted; `javascript:alert(1)`, `data:text/html,x`,
  `file:///C:/x.epub` and an empty string are refused; surrounding spaces are trimmed.
- A shelf saved before this change loads, and books without the field show no e-book button.
- On the pull request's deploy preview (shelf in the browser): open a book, add
  `https://example.com/book.epub` as its e-book link; an "Open e-book" button appears and opens
  that address in a new tab; remove the link and the button is gone. A book without a link shows
  only the "add" action. Pasting `javascript:alert(1)` is refused.
- The link survives a reload, a Storytel refresh (↻) and, when tested against a local
  PocketBase as in `docs/hanna-guardrails.md`, a save and load through the account (the field
  travels with the book like `storytelId` does; `shelfMerge.ts` needs no change).
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has reviewed the panel with and without a link, on a phone and a desktop.
- The words are exactly: "📖 Open e-book", "+ Add e-book link", "E-book link", "Where the file
  is, e.g. on Google Drive or your server.", "Remove e-book link" (the ×'s name), and the
  refusal "Only links that start with https:// or http:// can be opened here.". A refused link
  stays in the field, isn't saved, and the open button doesn't change.
- At 320 × 640, with a book that has both a Storytel link and an e-book link, both buttons are
  fully visible (wrapped onto two lines if needed).

# Notes

- `src/lib/library.ts` (`Book`, `NewBook`), `src/components/BookPanel.tsx` (where "Open in
  Storytel" is), `src/lib/storytelImport.ts` (a refresh must keep the field, as it keeps renamed
  titles).
- If `src/lib/shelfMerge.ts` or `src/server/shelf.ts` seem to need a change, stop and ask the
  architect (code-owner paths, Q-003).
- Close #185 from the pull request.

# Design

UX designer, before it is built: where the button and the add/change action go, their labels,
and the refusal note. Review after.

## Design (2026-11-21, before the build)

Two parts in the book panel: the **open button** at the top, next to "Open in Storytel", shown
only when there is a link; and the **link field** further down, which is just one small "add"
line when there is no link. Both reuse what the panel already has. The words are English
(British spelling), like the rest of the app.

### The open button (only when the book has a link)

- **Where:** in the panel's top block, on the same line as "▶ Open in Storytel", after it.
  When the book has no Storytel link it stands alone in that place. The two buttons sit in a
  row that wraps: at 320 px, or with a long title, the e-book button goes onto a second line.
- **Looks:** a small secondary button (`btn small`, the outlined one), with the text
  "📖 Open e-book" (the 📖 is `aria-hidden`). It's not orange: orange is Storytel's own
  colour, and this is her own file.
- **Does:** opens the link in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). On a
  phone that's the browser or the app that handles the address (Google Drive opens its app).
- **Tooltip and screen-reader name:** "Open e-book (drive.google.com, opens in a new tab)",
  using the link's host, so she can see where it goes before tapping. For an address like
  `http://192.168.1.10/…` the host is `192.168.1.10`.

### The link field

**Where:** right under the *How I have it* chips, where she already says she has the book as
an e-book. It doesn't depend on those chips: the link shows whether or not "E-book" is ticked.

**No link (most books):** only a small text button (the panel's `link-btn`, like "Shorten
to …"):

> + Add e-book link

Tapping it turns that line into the field below, with the cursor in it.

**The field** (styled like the ISBN and Published fields: label, input, hint):

- Label: "E-book link"
- Input: `type="url"`, `inputMode="url"`, placeholder `https://…`, full width.
- Hint under it, in helper text: "Where the file is, e.g. on Google Drive or your server."
- To its right a small × button (the same as "Remove this date" under *Finished on*),
  labelled "Remove e-book link". It removes the link straight away, without asking: the link
  is easy to paste again. The field then goes back to "+ Add e-book link".

**Saving:** on Enter or when she leaves the field, like ISBN. Spaces around the link are
trimmed. Leaving the field empty removes the link (and shows "+ Add e-book link" again).
Escape puts back what was there. Opening the field and leaving it empty without typing
changes nothing.

**Refused link** (not `https://` or `http://`, e.g. `javascript:…`, `file:///…`, or just
"drive.google.com"):

- It isn't saved. The field keeps what she typed, so she can correct it; it is marked
  `aria-invalid`, and the hint becomes an error in the danger colour:
  "Only links that start with https:// or http:// can be opened here."
- The button at the top keeps showing the last good link, or doesn't show if there was none.
- The hint goes back to normal as soon as she types again (like ISBN and Length).

**With a link:** the field shows the full link and the ×. The "📖 Open e-book" button is at the
top. A long link scrolls inside the field and isn't cut off in the middle.

### States, small screens and accessibility

- **Loading and errors:** none. The app only stores and opens the link; it doesn't check it,
  and a dead link is between her and the browser.
- **Phone (bottom sheet, 390 and 320 px):** the field is full width; the × keeps its 44 px tap
  area on touch screens; the top buttons wrap as described. The sheet doesn't change height
  when the field opens.
- **Desktop (side panel):** the same order; the field is the panel's width.
- **Keyboard:** "+ Add e-book link" is a button; after it, focus is in the field. Tab goes from
  the field to the ×. After the × removes the link, focus goes back to "+ Add e-book link".
  The error is linked to the field with `aria-describedby`, like the ISBN hint, so a screen
  reader reads it.

### Easy to revert

One optional field on the book, one button and one field in the panel; a book without the link
looks exactly as it does today.

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

# Test

# Log

- 2026-11-21 architect: Task written from #185, with the assumptions in the Goal.
- 2026-11-21 ux-designer: design written. "📖 Open e-book" (small outlined button) next to
  "Open in Storytel", only with a link. "+ Add e-book link" under *How I have it* opens an
  "E-book link" field with ×. A refused link stays in the field with "Only links that start
  with https:// or http:// can be opened here."
- 2026-11-21 developer: built on branch `t-0007-ebook-link`. `ebookUrl?: string` on `Book`
  (optional; old shelves load). `src/lib/ebookLink.ts` accepts only https:// and http:// (trimmed)
  and re-checks the stored link on every render, so only a web address ever reaches an `href`.
  `src/components/EbookLink.tsx`: "📖 Open e-book" (`btn small`, `target="_blank"`,
  `rel="noopener noreferrer"`, tooltip/name with the host) beside "Open in Storytel" in a wrapping
  row, and "+ Add e-book link" / the "E-book link" field with × under *How I have it*, saved on
  Enter or blur, Escape restores, refusal kept in the field with `aria-invalid`. The field travels
  with the book: `shelfMerge.ts` and `server/shelf.ts` are unchanged (tests prove a stale device or
  an older app can't drop it). `merge.ts` (merging two copies) now keeps the other copy's link.
  Checks: `npm test` 44 files, 303 tests passed; `npm run build` built; `tsc --noEmit` clean.
  Local dev server, no backend, 320×640 and 1280×800: both open buttons fully visible (the e-book
  button wraps onto a second line at both widths: the panel's title column is narrower than the
  two buttons together, as the design allows); refusal shows the exact note; add, reload, remove
  all work; no page errors.
