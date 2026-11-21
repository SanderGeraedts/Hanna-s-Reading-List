---
id: T-0007
title: "Let a book hold a link to its e-book file, shown only when one is added"
description: "#185: an optional link per book to where Hanna keeps the e-book (Google Drive, a server), with an open button in the book panel like \"Open in Storytel\", shown only when the link is set."
status: Open
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

# Test

# Log

- 2026-11-21 architect: Task written from #185, with the assumptions in the Goal.
