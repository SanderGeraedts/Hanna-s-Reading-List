---
id: T-0007
title: "Let a book hold a link to its e-book file, shown only when one is added"
description: "#185: an optional link per book to where Hanna keeps the e-book (Google Drive, a server), with an open button in the book panel like \"Open in Storytel\", shown only when the link is set."
status: Done
depends_on: [T-0001]
decisions: [D-0002, D-0003]
raised_on: 2026-11-21
done_on: 2026-11-21
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/196"]
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

## Review after building (2026-11-21, head `cea9117`)

Looked at the developer's twelve screenshots (320 × 640 and 1280 × 800: with a link, without,
refused, added) and at my own local dev server with no backend (shelf in the browser), at the
same two sizes, driven by keyboard. The app has one theme (no light/dark), so there was no
second theme to check.

**Matches the design:**

- **Open button:** "📖 Open e-book", small outlined button (not orange), after "▶ Open in
  Storytel" in a wrapping row; absent for a book without a link. Name and tooltip "Open e-book
  (drive.google.com, opens in a new tab)"; for `http://192.168.1.10/…` it reads "Open e-book
  (192.168.1.10, opens in a new tab)". New tab, `rel="noopener noreferrer"`.
- **No link:** only "+ Add e-book link" as a `link-btn`, right under *How I have it*,
  independent of the E-book chip.
- **Field:** label "E-book link", `https://…` placeholder, full width, hint "Where the file is,
  e.g. on Google Drive or your server." linked by `aria-describedby`; × named "Remove e-book
  link". A long link scrolls inside the field.
- **Refused link:** `javascript:alert(1)` and `drive.google.com/x` stay in the field,
  `aria-invalid="true"`, hint becomes "Only links that start with https:// or http:// can be
  opened here." in the danger colour, and the open button keeps the last good link. Typing
  again puts the normal hint back.
- **Keyboard:** "+ Add e-book link" puts focus in the field; Tab goes from the field to the ×;
  after the × focus is back on "+ Add e-book link" and the open button is gone. Escape restores
  the saved link without closing the panel. Opening the field and leaving it empty returns to
  "+ Add e-book link".
- **Phone:** the × is 44 × 44 px at 320 px (touch); field and × fit the sheet width; both top
  buttons are fully visible. No page errors at either size.

**Differs:**

- **Desktop, the e-book button wraps under "Open in Storytel" even with a short title.** The
  design pictured them on one line on desktop, wrapping at 320 px or with a long title. The
  panel's title column (next to the close button) is about 262 px wide and the two buttons need
  about 280 px. Both stay fully visible, left-aligned and evenly spaced, and stacked they read as
  a tidy pair; moving the row out of the title column would change the panel's existing header.
  **Accepted, no fix needed.**
- On desktop the × is 30 px, as the design asked (44 px only on touch screens). Not a
  difference.

**Verdict:** matches the design; passed on to the tester.

# Test

Tester, 2026-11-21, head `fea956b`, in a fresh worktree from `origin/t-0007-ebook-link`. The
repository is still on npm (harness adoption is PR #192), so `pnpm` in *Done when* ran as `npm`.
The deploy-preview item ran on a local dev server instead (no backend, shelf in the browser),
because previews may carry the live account server's address (#193).

**Commands and their output**

- `npm ci`: `added 654 packages, and audited 655 packages in 2m`
- `npm test`: `Test Files  44 passed (44)`, `Tests  303 passed (303)`
- `npm run build`: exit 0, `✓ built in 2.13s` (client) and `✓ built in 1.63s` (server)
- CI on the pull request: `test` SUCCESS.
- `harness check`: tasks and decisions pass; 6 "generated files ... stale" failures for
  `.claude/` and `.githooks/`. `origin/main` shows the same 6. They belong to the harness
  adoption (#192, code-owned paths) and this pull request doesn't touch them.
- Code-owned paths: the diff touches none. The files are `docs/tasks/T-0007…`,
  `docs/tasks/index.md`, `src/components/BookPanel.tsx`, `EbookLink.tsx` and its test,
  `src/lib/ebookLink.ts` and its two tests, `src/lib/library.ts` (one optional field on `Book`,
  no load/save/sync change), `src/lib/merge.ts` and `src/styles.css`. `shelfMerge.ts` and
  `server/shelf.ts` are unchanged.

**UI, local dev server with no backend, Chrome via Playwright, 1280 × 800 and 320 × 640 (touch).**
Results were the same at both sizes:

- Shelf saved before the change (books without `ebookUrl`): it loads. A book with Storytel shows
  "Open in Storytel", no e-book button, only "+ Add e-book link". A book with neither shows no
  button row, only "+ Add e-book link".
- Added `  https://example.com/book.epub  `: it is trimmed. "Open e-book" appears with
  `href=https://example.com/book.epub`, `target=_blank`, `rel=noopener noreferrer`, and the name
  "Open e-book (example.com, opens in a new tab)". Clicking it opens a new tab at that address
  with `window.opener === null`. The stored book keeps isbn, rating, storytelId and progress.
- Enter, then blur again on the same value: saved once, no change.
- `javascript:alert(1)` refused (on Enter) and `file:///C:/x.epub` refused (on blur). The text
  stays in the field with `aria-invalid=true` and the hint reads exactly "Only links that start
  with https:// or http:// can be opened here.". The button and the stored link stay on the last
  good link.
- A 20,020-character link saves and opens. After a reload the link and the button are still
  there.
- × removes it: the button is gone, "+ Add e-book link" is back, the key is gone from storage,
  and Storytel is untouched. Clearing the field to spaces also removes it.
- 320 × 640 with both links: Storytel at y 472 and e-book at y 515, both fully inside the
  viewport (wrapped onto two lines).
- No page errors and no dialogs.

**Security: stored values that are not http(s)** (put straight into localStorage, as if from
another device or an old shelf). The values were `javascript:alert(1)`, `JaVaScRiPt:alert(1)`,
` \njavascript:alert(1)`, `java\nscript:alert(1)`, `data:text/html,<script>…`,
`file:///C:/x.epub`, `//evil.com/x.epub` and `\u0000javascript:alert(1)`. For each one: no
e-book button, and no `<a href>` on the page whose value isn't http(s) or same-origin. The field
shows the value, and saving it is refused.

At unit level (`ebookLink.ts` under Node 26) these were all refused, giving no href and no host:
the same eight, plus tab tricks, a zero-width space, `javascript://example.com/%0aalert(1)`,
`vbscript:`, `blob:`, `\\evil.com\x`, `https://`, `http://`, `https://ex ample.com` and
`xxxhttps://a.b`. `https:evil.com`, `http:/evil.com` and `https:\\evil.com` are accepted.
Their href is the URL parser's normalised `https://evil.com/`, so it is still http(s). Every
accepted href comes from `new URL(...).href` with protocol `https:`/`http:` and a host. A
protocol-relative link (`//evil.com`) is refused, because it isn't an absolute URL. Had it been
let through, it would have taken the page's own scheme, http(s), never `javascript:`.

**Account sync, local throwaway PocketBase 0.40.6** (a copy of the binary, the repo's migrations
and hooks, `SIGNUP_EMAILS=test@example.com`), with `POCKETBASE_URL=http://127.0.0.1:8131` on a
local dev server. Four browser contexts, read back from the server through the PocketBase API:

- A: a shelf from before accounts (3 books, no link). After sign-up the server has b1, b2 and
  b3, and b1 has no link.
- C and C2 sign in now (stale copies without the link) and stay open.
- A adds the link to b1. The server has `ebookUrl: https://example.com/book.epub` on b1.
- B, a fresh browser, signs in: "Open e-book" has that href and the field shows it.
- Stale C adds a link to **another** book (b2) and saves. The server's b1 is byte-identical to
  A's save (the link and every other field kept). b2 has C's link, and b1, b2 and b3 are all
  there. C then shows b1's link (it adopted the server's copy).
- No page errors in any context.

**Observation, not caused by this change:** stale C2 changed **the same book** (b1's language)
without having seen the link. The server took C2's whole b1 (`ebookUrl` missing; rating, isbn
and journal kept). That is the existing rule in `shelfMerge.ts` ("a book both have is taken from
whichever edited it last"). It applies to every field the same way, e.g. a rating set on
another device. The task asked for the link to travel like `storytelId` and for `shelfMerge.ts`
to stay unchanged, and both hold. Field-level merging would be a change to a code-owned file,
for the architect and the Engineer if it is wanted.

**`merge.ts`:** `mergeBooks` already spreads `...other, ...keep`. The new
`ebookUrl: keep.ebookUrl ?? other.ebookUrl` only matters when the kept copy holds an explicit
`undefined` (right after × in the same session). Then the other copy's link is taken, as for
pages, isbn and the rest. When neither copy has a link the result carries `ebookUrl: undefined`,
which JSON drops, the same as for `pages`/`minutes`. No other effect. Covered by
`ebookLink.sync.test.ts`.

**Storytel refresh (↻) and the nightly sync:** not driven in the UI (they need a Storytel
login). `ebookLink.sync.test.ts` covers both and passes. `storytelImport.ts` only patches
progress/status/fields it owns, never `ebookUrl`.

Data-store note: the nightly sync on the account server (`nightly.pb.js`) stores the books as
sent, and the history hook copies them whole, so the field survives both.

**Not checked:** the deploy preview itself (by rule, see above).

**After merging `main` in** (T-0002 and T-0004 had landed, and the conflict was only in the
generated task index, now regenerated): `npm test` gave `Test Files  46 passed (46)`,
`Tests  306 passed (306)`, and `npm run build` exited 0.

**Verdict: passed.**

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
- 2026-11-21 ux-designer: reviewed: matches the design, passed on to the tester. Checked the
  developer's screenshots and a local dev server (no backend) at 320 × 640 and 1280 × 800:
  words, refusal, focus after + and ×, Escape, 44 px × on touch. The e-book button also wraps on
  desktop (title column too narrow for both); both stay fully visible, accepted.
- 2026-11-21 tester: passed. npm ci/test (303)/build green, CI green. UI checked locally at
  1280 and 320. Stored javascript:/data:/file:/`//` values never become an href. Through a
  local PocketBase the link reaches a second browser, and a stale device saving another book
  keeps it. A stale device editing the same book replaces the whole book (existing
  shelfMerge rule, not this change).
