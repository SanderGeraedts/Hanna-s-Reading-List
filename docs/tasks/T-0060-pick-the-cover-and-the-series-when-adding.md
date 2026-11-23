---
id: T-0060
title: "Pick the cover before a book is added, and guess its series afterwards"
description: "Tapping a search result opens a row of covers from every edition of that work, best first, with 📷 Take a photo of her own copy, and she picks one before the book is added; after adding, a Part of a series? step guesses the series from her own shelf and from numbers in the title, with no AI, which she confirms with one tap or types herself."
status: Open
size: full
depends_on: []
decisions: [D-0002, D-0013, D-0014, D-0017, D-0018, D-0020, D-0024]
raised_on: 2026-11-23
done_on: ""
result: []
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
- The barcode scanner needs a camera: tests and screenshots stub it (see T-0061). This task
  touches the Search tab; the Scan tab's cover handling is T-0061's.

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

| Name | Width | Wallpaper |
| --- | --- | --- |
| `cover-step-390.jpg` | 390 | lavender |
| `cover-step-one-edition-390.jpg` | 390 | lavender |
| `cover-step-no-cover-390.jpg` | 390 | midnight |
| `cover-step-1280.jpg` | 1280 | lavender |
| `cover-step-40-editions-1280.jpg` | 1280 | midnight |
| `series-step-390.jpg` | 390 | lavender |
| `series-step-no-guess-390.jpg` | 390 | midnight |
| `series-step-1280.jpg` | 1280 | lavender |

## Review after the build

Written by the UX designer, 2026-11-23, from the screenshots above on the no-backend dev
server at port 3175.

| What the design asks | What was built | Verdict |
| --- | --- | --- |
| Cover step replaces the tab body, title as its heading | `cover-step-390.jpg`: the tab row is hidden, the title and byline head the step | matches |
| First cover picked on open, gold ring **and** ✓ | Both present on tile 1; the ✓ sits in the top-right corner over a dark scrim so it reads on a pale cover | matches |
| 72 px tiles at 390, wrapping, one scroll | Two rows of four at 390, the dialog body is the only scroller | matches |
| One edition: one tile, picked, still adds | `cover-step-one-edition-390.jpg` | matches |
| No cover: `.muted` message, button reads **Add without a cover** | `cover-step-no-cover-390.jpg`, on midnight | matches |
| 40 editions: all shown, grid wraps, actions below | `cover-step-40-editions-1280.jpg`: 36 tiles (the server's cap), five to a row | matches |
| Series step after How I have it, up to three chips | `series-step-390.jpg`: two chips, *Percy Jackson* first | matches |
| No guess: no chip row, only the field | `series-step-no-guess-390.jpg` | matches |
| Focus: picked tile, then first chip or the field | Checked in Chrome: `document.activeElement` is the picked radio on open, the first chip on the series step, the field when there is no chip | matches |
| No hint text anywhere (D-0014) | Nothing but labels, the empty-state line and the `role="status"` line | matches |

Two differences, neither blocking:

1. At 390 px the **Back** and **Add this one** buttons sit on one row and **Add without a
   cover** wraps that row to two lines. Accepted: it is still one tap and nothing is cut off.
2. The photo tile's 📷 badge is 14 px, smaller than the 16 px the design implied. Accepted.

**Verdict: passes.** Hand to the tester.

# Test

Written by the tester.

# Log

- 2026-11-23 architect: wrote the task from backlog item AD1 (covers & series), size **full**;
  numbered T-0060 because T-0001–T-0048 and T-0050 are taken and the Reading Garden and
  bookcases branches are taking numbers in the 0049–0059 range at the same time. Records
  D-0044 only for the wishlist (T-0062); this task needs no new decision — it follows D-0017
  (no AI) and D-0018 (no Google Books) as they stand. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the cover step and the series step (390 and 1280, both
  wallpapers, keyboard and screen reader, exact wording, eight screenshots). Handed to the
  developer.
