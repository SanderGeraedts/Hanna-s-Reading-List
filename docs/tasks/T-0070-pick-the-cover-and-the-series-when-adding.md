---
id: T-0070
title: "Pick the cover before a book is added, and guess its series afterwards"
description: "Tapping a search result opens a row of covers from every edition of that work, best first, with 📷 Take a photo of her own copy, and she picks one before the book is added; after adding, a Part of a series? step guesses the series from her own shelf and from numbers in the title, with no AI, which she confirms with one tap or types herself."
status: Doing
size: full
depends_on: []
decisions: [D-0002, D-0013, D-0014, D-0017, D-0018, D-0020, D-0024]
raised_on: 2026-11-23
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/PRNUM"]
---

# Goal

Adding a book from **Search** takes whatever cover Open Library happens to put first. Hanna
often owns a different edition, with a different cover, and the 3D shelf takes its spine
colour and its shape from that picture — so a wrong cover means a wrong-looking book on the
shelf, which she then has to fix in the book panel afterwards.

Two changes to the add flow (backlog item AD1, agreed 22 November 2026):

1. **The cover, before the book is added.** Tapping a search result no longer adds it. It
   opens a step showing the covers of **all** the editions of that work, best first, plus
   **📷 Take a photo** of her own copy. She picks one, and *then* the book is added with that
   cover.
2. **The series, after the book is added.** A new step in the after-adding follow-up:
   **Part of a series?**, with a **rule-based** guess — the title matched against the series
   already on her shelf, and numbers in the title. One tap confirms it; otherwise she types
   the name herself, or skips.

The guess is rules only. **No AI, anywhere** (D-0017), and no second book API (D-0018): the
covers come from Open Library, which the app already uses, and the series guess comes from
her own shelf and from the title she already has.

# Done when

1. `pnpm test` and `pnpm run build` pass, and `pnpm exec tsc --noEmit` is clean.
2. `pnpm exec harness check` passes.
3. New tests in `src/lib/seriesGuess.test.ts` show the rule-based guess:
   - a title that carries its own series and number ("Dune Messiah (Dune Chronicles, #2)")
     gives that series with its number, ranked first;
   - a title that begins with the name of a series already on her shelf ("Percy Jackson and
     the Titan's Curse" with a *Percy Jackson* series on the shelf) gives that series;
   - a book whose author already has a series on the shelf gives that series as a candidate,
     after the two above;
   - a book with no signal at all gives **no** candidates, and the step then shows only the
     text field;
   - the same series is never offered twice, however many rules find it;
   - nothing in the module imports an AI client or reaches any network (asserted by reading
     the file for `fetch`, `anthropic` and `openai`).
4. New tests in `src/components/CoverStep.test.tsx` show:
   - tapping a search result shows the cover step and does **not** add the book
     (`onAdd` not called);
   - the step lists the cover ids the server function returned, the first one preselected;
   - picking a cover and pressing **Add this one** adds the book exactly once, with that
     cover's URL and with the colour and aspect read from it;
   - a work with **one** edition shows that one cover and still adds;
   - a work with **no** cover at all shows **Add without a cover** and adds a book with no
     `coverUrl`, which keeps its colour from the title (`colorFromString`);
   - Open Library failing shows the step with no covers and the book can still be added;
   - **Back** returns to the results with nothing added.
5. New tests in `src/components/AddFollowUp.series.test.tsx` show:
   - a book with a guess shows **Part of a series?** after **How I have it**, with the guess
     as a chip;
   - tapping the chip saves `series` (and `seriesIndex` when the title gave a number) and
     `seriesAsked: true`, so the dashboard's *Waiting for you* never asks again;
   - typing a name and pressing **Done** saves that name and `seriesAsked: true`;
   - **Skip** saves `seriesAsked: true` and nothing else;
   - a book with no guess and no typed name saves nothing but `seriesAsked: true`;
   - the price step still comes first for a bought copy, and the free-e-book link step still
     comes after the series step (D-0024's order is not disturbed).
6. Keyboard and screen reader: the cover row is a single `radiogroup` (arrow keys move, Space
   picks); the series chips are `aria-pressed` buttons in the tab order; every step keeps the
   `role="status"` line that names the book. A test asserts the roles and the arrow-key move.
7. The UX designer has reviewed the built flow at 390 px and 1280 px on both wallpapers and
   written the review in *Design*.

# Notes

- Files: `src/components/AddBookDialog.tsx` (the Search tab and `buildBook`),
  `src/components/AddFollowUp.tsx`, a new `src/components/CoverStep.tsx`, a new
  `src/lib/seriesGuess.ts`.
- **The server function already exists:** `getCoverChoices` in `src/server/openLibrary.ts`
  returns up to 36 cover ids for a work key plus a title search. The cover step uses it as
  it is; do not add a new endpoint. Open Library is named in the PR description (guardrails,
  group 1), and the step must fail quietly: no covers is a state, not an error.
- `CoverPicker.tsx` is the *existing* "Change cover" dialog for a book already on the shelf.
  It stays. The new step is a step **inside** the add dialog, not a dialog on top of a
  dialog; share the shrink-and-re-encode helper rather than copying it.
- 📷 Take a photo is `<input type="file" accept="image/*" capture="environment">`, the same
  shrink-to-560px JPEG that `CoverPicker` already does, so the shelf's 5.5 MB sync limit is
  respected. A photo may be taken for a work with no covers at all.
- The series guess must **not** reuse `seriesQuestions` from `sleepSeries.ts`: that one only
  fires for books by an author who already has a series, and only from the dashboard. Keep
  it; the new guess is a superset used at add time. A book answered here sets `seriesAsked`,
  which is exactly what `seriesQuestions` already honours, so the two never ask twice.
- No hint text under either step (D-0014). The empty state ("Open Library has no covers for
  this book") is an empty-block message, which D-0014 keeps.
- The barcode scanner needs a camera: tests and screenshots stub it (see T-0071). This task
  touches the Search tab; the Scan tab's cover handling is T-0071's.

# Choices made while Hanna was at work

Hanna was at work on 23 November 2026 and could not be asked. Each of these took the
recommended option where there was one, and otherwise the one that is easiest to undo. She can
change any of them; none needs more than a small change.

1. **The series step is asked for every book added from Search, ISBN or Manual**, even when
   there is nothing to guess — then it is just the **Series name** field with **Skip**. The
   alternative was to show it only when there is a guess, which would have made the feature
   invisible for most books. *To change:* one condition in `AddBookDialog.tsx` (`askSeries`).
2. **The step is not asked for a scanned batch or a Storytel import.** Twenty questions after
   one batch would be worse than the dashboard's *Waiting for you* asking one at a time
   (D-0013). *To change:* add `'scan'` to `ASKS_SERIES`.
3. **At most three guesses are offered**, best first, and a guess read from the title wins over
   one read from her shelf, which wins over one read from her author. *To change:*
   `MAX_GUESSES` and the order of the three rules in `seriesGuess.ts`.
4. **The "…" is taken off a guessed name.** Her shelf calls a shared opening *Harry Potter and
   the …*; the chip offers **Harry Potter**, because that is a name she would confirm.
5. **The tab row wraps to two lines at 390 px** now that there are six tabs, rather than
   shortening any label. *To change:* shorter labels, which D-0041 §6 would have to allow.
6. **The extra "cover by ISBN" tile was dropped** during the UX review: it guessed at a picture
   that often does not exist.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. Where the step sits

The add dialog keeps its five tabs and its one body. The cover step **replaces** the tab body
(like the follow-up already does), so there is never a dialog on top of a dialog and the
phone never scrolls two layers. Order of what she sees, from tapping a result:

```
Search results  →  Pick the cover  →  (book is added)  →  How I have it [+ price]
                                                       →  Part of a series?
                                                       →  (E-book link, only for a free e-book)
```

**Back** on the cover step returns to the results with her query and scroll intact and
nothing added. Closing the dialog on the cover step adds nothing at all.

## 2. Pick the cover — 390 px

```
┌──────────────────────────────────────┐
│ Add a book                        ×  │
├──────────────────────────────────────┤
│ Percy Jackson and the Titan's Curse  │   ← h3, the result she tapped
│ Rick Riordan                         │   ← .muted
│                                      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │   ← scrolls sideways, 2 rows at 390
│ │ ✓  │ │    │ │    │ │    │          │
│ └────┘ └────┘ └────┘ └────┘          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │    │ │    │ │ 📷 │ │    │          │
│ └────┘ └────┘ └────┘ └────┘          │
│                                      │
│ [ 📷 Take a photo ]                  │
│                                      │
│ [ Back ]            [ Add this one ] │
└──────────────────────────────────────┘
```

- Each cover is 72 × 108 px at 390 px, 88 × 132 px at 1280 px, in a wrapping grid
  (`.cover-grid`, which exists). The picked one has the gold ring the design system already
  uses for `.cover-choice.current`, plus a **✓** in its top-right corner so the choice does
  not rely on colour alone.
- **The first cover is picked when the step opens**, so **Add this one** is never dead. It is
  the one Open Library put first for the work she tapped — the same cover the app would have
  taken before this task, so the quickest path is unchanged.
- A photo she takes appears as the **first** tile, picked, with a 📷 badge; taking another
  replaces it. The 📷 tile in the grid is the same action as the button under it, for a thumb
  that is already in the grid.
- Exact words: heading **Pick the cover** is *not* shown — the book's title is the heading, as
  in the follow-up, so the step reads as "this book, these covers". Buttons: **Back**,
  **Add this one**, **📷 Take a photo**.

## 3. The three thin states

| State | What she sees |
| --- | --- |
| Loading | The title, then `Looking for covers…` in `.muted`, and **Add this one** disabled. **Back** works. |
| No covers at all | The title, then `Open Library has no covers for this book.` in `.muted`, the 📷 button, and the primary button reads **Add without a cover**. |
| Open Library unreachable | Exactly the "no covers" state. No error colour, no retry: it fails quietly (guardrails). |

A work with **one** edition is not a special state: one tile, picked.

A work with **40** editions shows all of them (the server caps at 36), the grid wraps and the
dialog body scrolls — the row never scrolls sideways on its own at 1280 px, and at 390 px it
wraps to as many rows as it needs, inside the dialog's existing scroll. The 📷 button and the
actions stay below the grid, not stuck to the viewport, so there is one scroll, not two.

## 4. Part of a series? — 390 px

It is the second card of the follow-up, after **How I have it** (and its price field) are
answered with **Next**.

```
┌──────────────────────────────────────┐
│ Added "Percy Jackson and the         │   ← role="status", as today
│ Titan's Curse".                      │
│                                      │
│ Part of a series?                    │   ← the group's label
│ [ Percy Jackson ]  [ Camp Half-Blood]│   ← chips, aria-pressed
│                                      │
│ Series name                          │
│ [______________________________]     │
│                                      │
│ [ Skip ]                  [ Done ]   │
└──────────────────────────────────────┘
```

- Up to **three** chips, best guess first. Tapping one fills the text field with its name and
  presses it (`aria-pressed="true"`); tapping it again empties the field. Only one chip is
  ever pressed.
- Typing in the field un-presses every chip. So one tap *or* typing, never a conflict.
- When there are no chips, the chip row is not rendered at all and only the field shows.
- **Done** saves whatever is in the field (empty = no series) and marks it answered.
  **Skip** marks it answered and saves nothing. Both move on.
- Exact words: group label **Part of a series?**, field label **Series name**, buttons
  **Skip** and **Done**. No hint text (D-0014). The word "guess" is never shown.

## 5. 1280 px

The dialog is 560 px wide as it is now. The cover grid gets 88 px tiles, five to a row. The
series chips sit on one line. Nothing else changes; the add dialog is not a 3D view and does
not use the room's wallpaper except through the page behind it, which both wallpapers already
handle for `.dialog`.

## 6. Keyboard and screen reader

- The cover grid is one `role="radiogroup"` with `aria-label="Cover"`; each tile is a
  `role="radio"` with `aria-checked`. ← → ↑ ↓ move between tiles and pick as they move (a
  one-choice group, the usual pattern); Tab leaves the group. Each tile's accessible name is
  `Cover 3 of 12`, and the photo's is `Your photo`.
- Focus on opening the step goes to the **picked** tile. Focus on **Back** returns to the
  result's row.
- The series chips are ordinary buttons with `aria-pressed`, in source order, each named by
  the series. Focus when the series step appears goes to the **first chip** when there is one,
  otherwise the **Series name** field — the same rule the follow-up already uses for the price
  field and the first format chip.
- Everything the step adds is announced through the follow-up's existing `role="status"`
  line; nothing new is `aria-live`.

## 7. Screenshots the designer will review

In `docs/tasks/T-0070-screens/`. A dialog is opaque (`--surface-solid`), so the wallpaper
cannot be seen in a shot cropped to the dialog: the two wallpapers are covered by one
full-page shot each instead.

| Name | Width | Wallpaper |
| --- | --- | --- |
| `cover-step-390.jpg` | 390 | lavender |
| `cover-step-1280.jpg` | 1280 | lavender |
| `cover-step-many-editions-1280.jpg` | 1280 | — (33 tiles) |
| `cover-step-in-the-room-midnight-390.jpg` | 390 | midnight, full page |
| `cover-step-in-the-room-lavender-1280.jpg` | 1280 | lavender, full page |
| `series-step-390.jpg` | 390 | lavender |
| `series-step-no-guess-390.jpg` | 390 | midnight |
| `series-step-1280.jpg` | 1280 | lavender |

## Review after the build

Written by the UX designer, 2026-11-23, from the built app on the no-backend dev server at
port 3175 (real Open Library, the camera never asked for), the screenshots above, and
measurements taken in the page.

| What the design asks | What is there | Verdict |
| --- | --- | --- |
| The step replaces the tab **body**, with the book's title as its heading | `cover-step-390.jpg`: `<h3>The Night Circus</h3>` and the byline head the step; the tab **row** stays above it | difference, accepted (below) |
| First cover picked when the step opens, marked by a ring **and** a ✓ | Tile 1 has the gold ring and a ✓ in its top-right corner over a dark disc, so it reads on a pale cover too | matches |
| Tiles wrap, one scroll, no sideways scroll | Measured: grid `scrollWidth` 310 = `clientWidth` 310, page `scrollWidth` 390 = the viewport. 3 columns at 390, 6 at 1280. The grid's own `max-height` is removed in the step, so the dialog body is the only scroller | matches |
| Many editions: all shown, grid wraps, the actions below it | `cover-step-many-editions-1280.jpg`: 33 covers for *The Night Circus*, six to a row | matches |
| Series step after **How I have it**, up to three chips, best first | `series-step-390.jpg`: one chip, *Percy Jackson*, for a shelf with two Percy Jackson books | matches |
| No guess: no chip row at all, only the field | `series-step-no-guess-390.jpg` | matches |
| Focus: the picked tile, then the first chip, else the field | **Checked in Chrome, not only in happy-dom** (docs/lessons.md): on the cover step `document.activeElement` is `button[role=radio] "Cover 1 of 36" aria-checked=true`; ArrowRight moves it to `"Cover 2 of 36"`; on *How I have it* it is `Paperback`; on the series step it is the `Percy Jackson` chip; after **Done** it is back in the search box | matches |
| No hint text (D-0014) | Only labels, the empty-state line and the `role="status"` line | matches |

**One thing was sent back to the developer during this review and fixed:**

- **The tab row did not fit.** With the sixth tab (*Wishlist*, T-0072) the row overflowed at
  390 px and *Storytel* and *Wishlist* were cut off — the design says it wraps. Fixed with
  `flex-wrap: wrap` on `.tabs`; measured again at 79 px high (two lines) at 390 and 38 px
  (one line) at 1280. `wishlist-tab-390.jpg` in T-0072's screens shows the wrapped row.

**Differences that stay, none of them blocking:**

1. **The tab row stays visible** over the cover step, where the design said the step replaces
   the whole tab area as the follow-up does. Accepted, and better: the tabs are how she leaves
   for *Scan* or *Manual* without first pressing **Back**, and now that the row wraps nothing
   is cut off.
2. **Tiles are about 99 px at 390 and 80 px at 1280**, not the 72/88 the design named: the
   grid is `auto-fill` with `minmax(72px, 1fr)`, so the columns share the width that is left.
   Accepted — nothing overflows and the covers are easier to tell apart.
3. **"Open Library has no covers" is rarer than the design assumed.** A search result that
   carries its own cover always has at least that one tile, so the empty state (and
   **Add without a cover**) only appears for a result with no cover of its own *and* no
   editions with one. That is the better behaviour and it is what the step does; the design's
   wording is the thing that was wrong. During the review the extra "cover by ISBN" tile was
   **removed** from the step: it guessed at a picture that often does not exist, and the guess
   was what hid the honest empty state.
4. **Two states are not in the screenshots:** a work with exactly one edition, and a work with
   no cover anywhere. Open Library cannot be asked to produce either on demand, and faking its
   reply did not survive decoding, so both are covered by `CoverStep.test.tsx` only (one tile,
   picked, still adds; and the empty state with **Add without a cover**). Written down here so
   the tester checks them in the tests rather than looking for a picture.

**Verdict: passes.** Hand to the tester.

# Test

Written by the tester, 2026-11-23, on `better-adding` after
`pnpm install --frozen-lockfile`.

## The checks, as written

```
$ pnpm exec tsc --noEmit
(no output, exit 0)

$ pnpm test
 Test Files  155 passed | 2 skipped (157)
      Tests  2007 passed | 22 skipped (2029)

$ pnpm run build
✓ built in 879ms     (client)
✓ built in 899ms     (server)

$ pnpm exec harness check
✓ tasks: 58 tasks, index in step
✓ decisions: 50 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

These numbers are from the branch **after** it was rebased onto `main` with the Reading
Garden on it (which is why the three tasks are T-0070 … T-0072 and not T-0060 … T-0062).

The new and affected tests, run three times over (17 files, 187 tests: `wishlist`,
`wishlist.break`, `wishlist.exclusion`, `seriesGuess`, `batchScan`, `batchScan.break`,
`CoverStep`, `CoverStep.break`, `BatchScan`, `AddFollowUp`, `AddFollowUp.series`, `AddWish`,
`WishlistCard`, `Wishlist.bought`, `dashboardLayout`, `recommend`, `merge`):

```
 Test Files  17 passed (17)      Tests  187 passed (187)
 Test Files  17 passed (17)      Tests  187 passed (187)
 Test Files  17 passed (17)      Tests  187 passed (187)
```

No test needed a retry.

## Trying to break it

| What I tried | What happened |
| --- | --- |
| **A work with one edition** | One tile, picked, **Add this one** live, adds once (`CoverStep.test.tsx`). Not screenshotted: Open Library cannot be asked for a one-edition work, which the UX review records. |
| **A work with forty editions** | The server caps at 36; the real *The Night Circus* gives 33 and every one is shown, the grid wrapping inside the dialog's one scroll (`cover-step-many-editions-1280.jpg`, and 36 tiles in `CoverStep.test.tsx`). |
| **No cover at all** | The `.muted` line and **Add without a cover**; the book is added with no `coverUrl` and takes its colour from its title (`colorFromString`). A result that has a cover of its own always shows at least that one — the UX review records this as the design's wording being wrong, not the build. |
| **Open Library unreachable** | The same quiet state, no error colour, and the book can still be added. `getCoverChoices` rejecting is caught. |
| **A cover that will not load** | `That picture could not be loaded. Try another one.` and nothing added. |
| **A photo she takes** | Goes first, picked, with its 📷 badge, and is the cover the book is added with (`CoverStep.break.test.tsx`). A second photo replaces the first. A text file gives `Choose an image file.`; a picture that cannot be read gives `That picture could not be read. Try a JPEG or PNG.`; neither changes the list or adds anything. The input is `accept="image/*" capture="environment"` — the **back** camera, and never a request for real hardware anywhere in the tests. |
| **Add pressed twice in a row** | The button is `disabled` while the cover is being read, so the book is added once. |
| **A very long title and three authors** | The heading and byline wrap (`overflow-wrap: anywhere`); nothing is cut off. |
| **Back, and closing the dialog on the cover step** | Nothing is added either way; **Back** returns to the results with her query still there. |
| **A series guess that is wrong** | Typing over it un-presses every chip and saves what she typed (`AddFollowUp.series.test.tsx`). Tapping the pressed chip again empties the field. |
| **A series step with nothing to guess** | No chip row at all, only **Series name**; **Done** with it empty saves `seriesAsked: true` and nothing else, so *Waiting for you* never asks about that book again. |
| **The order D-0024 fixes** | Price → series → the free e-book's link, in that order, with each answer saved: asserted end to end. |
| **No AI, no second book API** | `seriesGuess.ts` is read as text and must contain no `fetch(`, `anthropic`, `openai`, `API_KEY`, `googleapis` or `books/v1`, and no `#/server` import (D-0017, D-0018). |
| **Nothing in the repo reaches a new service** | `getCoverChoices` is the server function the "Change cover" dialog already had; no new endpoint, no key, nothing in `deploy/nas/`, `.github/` or `netlify/`. |

## What still works

`AddFollowUp.test.tsx` (T-0016's price and e-book-link steps), `price.test.ts`,
`merge.test.ts`, `NewForYouCard.test.tsx` (which mocks `buildBook` from `AddBookDialog`, still
re-exported from there) and `recommend.test.ts` all pass unchanged.

**Verdict: passed.**

# Log

- 2026-11-23 architect: wrote the task from backlog item AD1 (covers & series), size **full**;
  numbered T-0070 because T-0001–T-0048 and T-0050 are taken and the Reading Garden and
  bookcases branches are taking numbers in the 0049–0059 range at the same time. Records
  D-0044 only for the wishlist (T-0072); this task needs no new decision — it follows D-0017
  (no AI) and D-0018 (no Google Books) as they stand. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the cover step and the series step (390 and 1280, both
  wallpapers, keyboard and screen reader, exact wording, eight screenshots). Handed to the
  developer.
- 2026-11-23 developer: built the cover step (`CoverStep.tsx`, reusing the existing
  `getCoverChoices` server function and a shared `coverPhoto.ts`), the rule-based guess
  (`seriesGuess.ts`) and the series step in `AddFollowUp.tsx`; `buildBook` moved to
  `lib/buildBook.ts` and is re-exported from `AddBookDialog` so "New for you" is untouched.
  Check output: `pnpm exec tsc --noEmit` clean, `pnpm test`, `pnpm run build` and
  `pnpm exec harness check` all green; the exact output is in *Test* above.
  Handed to the UX designer.
- 2026-11-23 ux-designer: reviewed the built flow at 390 and 1280 and in real Chrome. Sent one
  thing back (the six-tab row overflowed at 390 instead of wrapping), which the developer fixed
  with `flex-wrap: wrap` on `.tabs`; also had the speculative "cover by ISBN" tile removed.
  Three wording-level differences recorded and accepted. **Passed.** Handed to the tester.
- 2026-11-23 tester: ran the checks and the new tests independently (output in *Test*), three
  repeated runs with no retry, and spent the rest trying to break the cover step: one edition,
  thirty-three editions, no cover, Open Library unreachable, a cover that will not load, the
  photo she takes (and a text file, and an unreadable picture), Add pressed twice, a very long
  title, Back and closing the dialog, and a wrong series guess typed over. Added
  `CoverStep.break.test.tsx` for the photo path, which nothing covered. **Passed.**
  Remaining: Hanna reads *Choices made while Hanna was at work* above and says which of the six
  she wants changed — nothing is blocked while she does.
