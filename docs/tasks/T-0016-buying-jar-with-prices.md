---
id: T-0016
title: "Make the buying jar spend what a book cost: ask the price of bought books, show the coin count, allow below zero"
description: "The add dialog asks the price of a bought paperback, hardcover or e-book (and the file link for a free e-book), the book panel shows and edits it, and the 📚 buying jar spends €5 per coin exactly, shows just its count and may go below zero."
status: Doing
depends_on: [T-0014]
decisions: [D-0002, D-0009, D-0010, D-0013, D-0014, D-0020, D-0022, D-0024]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-21). It changes the 📚 buying jar that T-0014 (#222) put in
the "Want-to-read pile" block on the dashboard, so it follows what she really spends (D-0024).

1. **The jar shows only its coin count:** "🪙 4.6 coins". No "N of 3", no empty slots, no "Treat
   earned! 🎁" and no gold wash any more.
2. **Earning is unchanged:** one coin per finish from the pile (14-day rule) of a book she owns on
   paper or as an e-book (`owned` in `src/lib/pile.ts`), counting from `JAR_START` (2026-11-01).
3. **Spending is the price:** a new optional `Book.price` in euros (D-0002). An owned book added on
   or after 2026-11-01 spends `price / 5` coins, exactly, with decimals (€12 → 2.4 coins). No price
   spends nothing, also for books added since 2026-11-01 before this change (they used to cost 3).
4. **Below zero is allowed:** "🪙 −1.4 coins" (a real minus sign), the count in `--warning`.
5. **Asking the price when she adds a book she bought.** After a book is added from Search, Scan,
   ISBN or By hand in the add dialog (`src/components/AddBookDialog.tsx`), the dialog asks how she
   has it; for paperback, hardcover or e-book it asks "What did it cost?" in euros. Both can be
   skipped; skipping the price leaves it empty (costs nothing). Never asked for library, borrowed,
   audiobook or other, and never for books the Storytel tab imports.
6. **A free e-book:** when the format is e-book and the price is €0, the dialog asks right away for
   the link to the e-book file (`ebookUrl`, T-0007, checked with `cleanEbookLink`: https/http
   only). It can be skipped. Not for paper books at €0.
7. **The book panel** (`src/components/BookPanel.tsx`) shows the price ("€12.50") and lets her
   edit or clear it, for owned books only.
8. The 🎧 Storytel jar is unchanged (a score only).

Out of scope: sleep reads (the next task).

# Done when

- Unit tests next to the `src/lib` logic pass, covering:
  - the jar walk with prices: an owned book's finish from the pile earns 1; adding a priced owned
    book spends `price / 5` exactly (€12 → 2.4, €7.99 → 1.598, sums of decimals without float
    drift, e.g. three books at €0.10 spend exactly 0.06); the jar goes below zero; an owned book
    with no price spends nothing (also one added after 2026-11-01); a library, borrowed or
    listen-only Storytel book with a price never spends; Storytel imports never spend; nothing
    before 2026-11-01 counts; the Storytel jar is unchanged;
  - the coin text: "🪙 4.6 coins", "🪙 4 coins", "🪙 1 coin", "🪙 0 coins", "🪙 −1.4 coins", and a
    count that rounds to zero shows "🪙 0 coins" (never "−0");
  - the price parsing: "12" → 12, "12,50" → 12.5, "12.50" → 12.5, "€ 7.99" → 7.99, "€7,99" and
    "7.99 €" → 7.99, "0" → 0, empty or spaces → no price; rejected: negatives ("-5", "−5"), text
    ("twelve", "12a"), more than two decimals ("7.999"), and above €9,999.99;
  - who is asked: the price question shows for paperback, hardcover and e-book, never for library,
    borrowed, audiobook, Storytel or other, and never for a Storytel import;
  - the €0 e-book link prompt condition: true for an e-book at exactly €0, false at €0.01 or more,
    with no price, and for a paperback or hardcover at €0;
  - `merge.ts`: merging two copies keeps the kept copy's price, else the other's.
- Clicked through on a local dev server with no backend (`pnpm run dev`, no `POCKETBASE_URL`), the
  shelf seeded in localStorage `hannas-reading-list:v1`, with screenshots at 390×844 and 1280×800
  (lavender and midnight) in `docs/tasks/T-0016-screens/` of:
  - the add dialog asking how she has it and the price, after adding a book;
  - the €0 e-book link prompt (a bad link like `javascript:x` is refused; Skip works);
  - the price in the book panel, edited and cleared;
  - the pile block with the buying jar at a decimal count ("🪙 4.6 coins") and at a negative count
    ("🪙 −1.4 coins", in the warning colour), with the Storytel jar beside it as before.
- What Hanna sees matches *Design*, at 390×844 and 1280×800 on both wallpapers:
  - after Search, Scan, ISBN and Manual (not Storytel) the dialog shows "Added “{title}”.", the
    eight "How I have it" chips (Paperback ticked after Scan) and, only while Paperback, Hardcover
    or E-book is ticked, "What did it cost?" with a € inside the field; on a phone the field opens
    the decimal number pad (`inputMode="decimal"`);
  - a chip tap is on the book at once; closing the dialog with × or Escape mid-way keeps the book,
    its formats and a valid typed price; a wrong price shows "Try 12.50 or 12,50." (or "That's
    more than €9,999.99.") and is not saved;
  - Skip leaves the book without a price; Done saves it; with E-book at €0 the button says Next
    and leads to "E-book link", where `javascript:x` is refused with the panel's error, Skip
    keeps the €0, and Done saves a good link;
  - afterwards the tab she was on is back (search results with "On shelf", Scan's "Scan the next
    one.", ISBN's and Manual's "Added to the shelf.");
  - the book panel shows "Price" under "How I have it" only for paperback, hardcover or e-book,
    reading "€ 12.50" for 12.5; emptying it clears the price; Escape puts the old one back;
  - the buying jar shows one line "🪙 4.6 coins" (no coin row, no "of 3", no gold wash) and
    "🪙 −1.4 coins" with a real minus sign in `--warning`; its `aria-label` is "Buying jar: minus
    1.4 coins";
  - every new chip and button in the follow-up is at least 44 px high on a touch screen, and no
    hint text sits under the price field, the link field in the dialog, or the jar;
  - `colours.test.ts` checks `--warning` on `--surface-sunken` over a card, on both wallpapers.
- An older shelf with no `price` on any book loads, and the jar shows its count with no spending.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- Group 1 (app code only): one new optional `Book` field, nothing for Sander. No change to
  `shelfMerge.ts`, `src/server/shelf.ts` or the load/save/sync parts of `library.ts`: a whole book
  object travels through the sync as it is, like `ebookUrl` (see `ebookLink.sync.test.ts`).
  `merge.ts` (merging two copies, D-0009) needs `price: keep.price ?? other.price`.
- Files:
  - `src/lib/pile.ts`: `pileJars`, `owned`, `storytelOnly`, `JAR_START`, `TREAT_COST` (goes away).
  - `src/components/DashboardExtras.tsx`: `BuyingJar` and `Coins` (the Storytel jar keeps `Coins`).
  - `src/components/AddBookDialog.tsx`: Search, Scan (adds `formats: ['paperback']`), ISBN and By
    hand tabs; `onUpdate` is already a prop, so the follow-up can patch the added book.
  - `src/components/BookPanel.tsx` and `src/components/EbookLink.tsx` (`EbookLinkField`),
    `src/lib/ebookLink.ts` (`cleanEbookLink`, `ebookHref`).
  - `src/lib/library.ts`: `Book`, `formatsOf`, `withFormats`, `FORMAT_LABELS`.
  - `src/lib/colours.test.ts` already checks `--warning` on a card at 4.5:1 on both wallpapers.
- New logic (price parsing, coin text, who is asked, the €0 link condition) goes in `src/lib` with
  a `*.test.ts`; put "today" in as a parameter.
- Choices taken while Hanna was asleep (reversible, recommended; tell her in the PR):
  - **The add dialog asks how she has it.** Today only Scan sets a format (paperback); Search, ISBN
    and By hand add a book with none, so a price question needs the format first. After adding,
    the dialog shows a short follow-up for that book: the formats as choices (Scan pre-selects
    Paperback), then the price for paperback, hardcover or e-book, then the link for a €0 e-book.
    The book is on the shelf as soon as it is added (as today); the answers patch it, so closing
    the dialog midway loses nothing and leaves the book without format or price.
  - **Price format:** stored as a number of euros with at most two decimals (12.5). Shown as
    "€12.50" (two decimals, `en-GB`). Comma or dot as the decimal mark, € before or after, spaces
    allowed; no thousands separators; at most €9,999.99. An empty field clears the price.
  - **Coin text:** one decimal, rounded half away from zero, the `.0` dropped ("4 coins"),
    "1 coin" singular, a real minus sign; a count that rounds to 0 is "0 coins". Coins are summed
    in cents so decimals don't drift (D-0024).
  - **A price on a book that isn't owned** (e.g. she changes its format to library later) is kept
    but spends nothing, and the panel hides the field.
  - **Same-day order** stays as T-0014 (finishes before adds); with no threshold it no longer
    changes the result.
  - The jar's `aria-label`: "Buying jar: 4.6 coins" / "Buying jar: minus 1.4 coins".
- D-0013: the follow-up lives inside the add dialog she opened; nothing opens by itself. D-0014: no
  explanation next to the price field or the jar (no "€5 = 1 coin"); labels and placeholders only.
  D-0020/D-0022: design tokens only, checked on both wallpapers. D-0010: a book with paper and
  Storytel is owned, so it counts for the buying jar only (unchanged).
- Handover: to the UX designer first (the add-dialog follow-up, the panel field and the jar change
  what she sees), then the developer, who opens the draft pull request from this branch.

# Design

## Design (2026-11-21, before the build)

Only tokens from the top of `src/styles.css` (D-0020/D-0022), checked on lavender and midnight.
No helper sentences (D-0014): the only new words are the labels, buttons, the "Added" line and
the error messages below. Nothing opens by itself (D-0013): the follow-up is a step inside the
*Add a book* dialog she opened. Everything new she taps is at least 44 px high on a touch screen
(`min-height: var(--tap)`, not the 36 px that `.btn.small` and `.format-chip` get today). The
follow-up is worked out on the device, so it has no loading, error or offline state of its own:
adding the book works as it does today, and the follow-up appears only once the book is on the
shelf.

### 1. The follow-up in the add dialog

**When it shows.** Straight after a book is added from **Search**, **Scan**, **ISBN** or
**Manual** (the "By hand" tab, called *Manual* in the app). Never after the **Storytel** tab, and
never when nothing was added (a result that's already "On shelf", an unknown ISBN, a lookup
error).

**Where.** The follow-up takes the place of the tab row and the tab's panel. The dialog's header
("Add a book" and ×) and the Open Library line at the bottom stay. There is no new dialog, no
overlay and no animation beyond the swap.

**Step 1: how she has it, and the price.** One card that grows as she answers:

```
Add a book                                   ×
─────────────────────────────────────────────
Added “The Name of the Wind”.

How I have it
( ✓ Paperback ) ( Hardcover ) ( E-book )
( Audiobook ) ( Storytel ) ( From the library )
( Borrowed ) ( Other )

What did it cost?
┌──────────────┐
│ €  12,50     │
└──────────────┘
                              ( Skip ) ( Done )
─────────────────────────────────────────────
Book data and covers from Open Library. …
```

- **"Added “{title}”."** (`.success`, `--fs-body`), `role="status"` so a screen reader announces
  it. A long title wraps; it is never cut off.
- **"How I have it"** (the same label as in the book panel) over the same eight chips, in the same
  order, with the same words as the book panel (`FORMAT_LABELS`): Paperback, Hardcover, E-book,
  Audiobook, Storytel, From the library, Borrowed, Other. Same look (`.format-chip`, "✓ " and the
  gold wash when chosen), but at least 44 px high on touch. Several can be chosen, as in the panel.
  - **Each tap saves at once** (patches the book through `onUpdate`, with `withFormats`, exactly
    like the panel's toggle), so nothing is lost when she closes the dialog.
  - **Pre-selected:** Paperback after **Scan**, and after **Manual** when it came from a scanned
    ISBN (those add `formats: ['paperback']` today). Nothing is pre-selected after Search, ISBN or
    a plain Manual entry.
- **"What did it cost?"** appears under the chips **only while Paperback, Hardcover or E-book is
  chosen** (the owned formats; with Storytel or From the library chosen as well it still shows).
  When she unticks the last of the three, the field hides, and what was typed in it is not saved.
  - A text field (`type="text"`, `inputMode="decimal"` so a phone shows the number pad with a
    decimal mark, `autoComplete="off"`, `enterKeyHint` "done", or "next" when step 2 follows).
    Not `type="number"`: that refuses the comma.
  - A fixed **"€"** sits inside the field at its left edge (`--muted`, not part of the value), so
    the field reads "€ 12,50" while she types and **"€ 12.50"** once it is saved. The field is
    about 9rem wide on both phone and computer, not the full width.
  - Its accessible name is "What did it cost? (euros)": "(euros)" is visually hidden text inside
    the label.
  - No placeholder, no hint under it.
  - She may type "12", "12,50", "12.50", "€7,99", "7.99 €" (the price rules of *Done when*).
    **When she leaves the field or presses Enter,** a valid price is saved on the book and shown
    in the form "12.50" (two decimals, dot); an empty field clears it.
  - **A wrong price** stays in the field with `aria-invalid`, and an error line under it
    (`.error`, linked with `aria-describedby`):
    - not a price (text, a minus, more than two decimals): **"Try 12.50 or 12,50."**
    - more than €9,999.99: **"That's more than €9,999.99."**
- **Buttons**, right-aligned under the card, in this order: **Skip** (secondary `btn`) and
  **Done** (`btn primary`, gold). Both at least 44 px high.
  - **Done** saves a valid price (as on leaving the field) and closes the follow-up. With a wrong
    price it doesn't close: the error shows and focus goes back into the field. With an empty
    field it closes without a price.
  - **Next** replaces **Done** (same place, same gold button) while E-book is chosen **and** the
    field holds a price of exactly €0 ("0", "0,00", "€0"). It saves the €0 and goes to step 2.
    The label changes as she types; the fields themselves don't move.
  - **Skip** closes the follow-up and leaves the book **without a price**: a price saved in this
    follow-up is removed again. The chosen formats stay (they are what she tapped).

**Step 2: the link for a free e-book.** Only after **Next** (E-book at €0). It replaces step 1
in the same place:

```
Added “The Name of the Wind”.

E-book link
┌──────────────────────────────────────────┐
│ https://…                                │
└──────────────────────────────────────────┘
                              ( Skip ) ( Done )
```

- **"E-book link"**, the same label as in the book panel, over a full-width field (`type="url"`,
  `inputMode="url"`, placeholder "https://…", `enterKeyHint` "done"). Focus goes into it.
- **No hint line** under it (D-0014; the panel's "Where the file is, …" line is not repeated
  here). Only the error.
- **Done** (or Enter): an empty field closes like Skip. Otherwise the link goes through
  `cleanEbookLink`; a good one is saved as `ebookUrl` and the follow-up closes. A refused one
  (`javascript:x`, `ftp://…`, plain text) stays in the field with `aria-invalid` and the same
  error as the panel: **"Only links that start with https:// or http:// can be opened here."**
  Focus stays in the field.
- **Skip** closes the follow-up without a link. The €0 price stays.
- Not shown for a paperback or hardcover at €0, nor for an e-book at €0.01 or more, or with no
  price.

**After the follow-up** (Done or Skip), the tab row and the tab she was on come back as she left
them:

| Tab | What she sees | Focus |
| --- | --- | --- |
| Search | Her query and results; the book's button says "On shelf". | The search field |
| Scan | "Added “{title}”. Scan the next one." (as today); the camera runs again. | Stays in the dialog (the scanner area) |
| ISBN | An empty ISBN field and "Added to the shelf." (as today). | The ISBN field |
| Manual | An empty form and "Added to the shelf." (as today). | The Title field |

While the follow-up shows, the Scan camera is paused (as it is today while a find is shown).

**Closing early.** × , Escape and a click on the backdrop close the dialog at any point, as now.
The book is already on the shelf. Formats she tapped are already saved. A **valid** price or link
still in its field is saved as the dialog closes; a wrong one is dropped without a word. There is
no "Are you sure?" and nothing waits on the dashboard afterwards.

**Focus and keyboard in the follow-up**

- When step 1 appears, focus goes into the price field if it already shows (Scan, scanned
  Manual), otherwise to the first chip (Paperback). On step 2, into the link field.
- Tab order: chips (in order), the price field, Skip, Done / Next. The chips are native buttons
  with `aria-pressed`, in a `role="group"` labelled by "How I have it".
- Enter in the price field does what Done / Next does; Enter in the link field does Done.
- The same focus ring as every `.btn` and `.format-chip`.

**Phone (390 px) and computer**

- Phone: the dialog is the width it is today (about 318 px inside). The chips wrap to three rows;
  the price field stays about 9rem; Skip and Done sit side by side at the right. When the number
  pad opens, the dialog scrolls so the field and the buttons stay in view (the browser's own
  scroll-into-view on focus; nothing fixed to the bottom).
- Computer (1280 px): the same card in the 560 px dialog; the chips fit on one or two rows.

### 2. The price in the book panel

- A new field **"Price"** directly under the "How I have it" chips and above the e-book link
  (`+ Add e-book link` / "E-book link"), because the price belongs with how she has it.
- It shows **only while the book has Paperback, Hardcover or E-book** among its formats. When she
  unticks the last of those, it hides; a saved price is kept (it spends nothing) and comes back
  when she ticks one again.
- The same field as in the dialog: the fixed "€" at its left edge, `inputMode="decimal"`, about
  9rem wide, no placeholder, no hint line. With a price it reads **"€ 12.50"** (two decimals, so
  €12.5 shows as "12.50"); without one it is empty.
- **Editing** works like the panel's ISBN field: saved when she leaves the field or presses
  Enter; Escape puts back what was saved. **Clearing:** empty the field and leave it; the price
  is gone. No × button.
- A wrong price stays in the field with `aria-invalid` and the same errors: "Try 12.50 or 12,50."
  or "That's more than €9,999.99." Nothing is saved until it is right.
- The jar on the dashboard follows at once (it is worked out from the books).
- Never shown in the panel's top lines or on the shelf.

### 3. The 📚 buying jar

The jar keeps its well, lid, name and place next to the 🎧 Storytel jar (T-0014). The row of 🪙,
the empty slots, "N of 3", "Treat earned! 🎁" and the gold wash go. What's left:

```
┌─ 📚 Buying jar ───┐ ┌─ 🎧 Storytel jar ─┐
│  🪙 4.6 coins      │ │  🪙 🪙 🪙 🪙        │
│                    │ │  4 coins           │
└────────────────────┘ └────────────────────┘

┌─ 📚 Buying jar ───┐
│  🪙 −1.4 coins     │   ← "−1.4" in --warning, bold
└────────────────────┘
```

- Line 1, the name: "📚 Buying jar", as now.
- Line 2, the count: **"🪙 {n} coins"** in `--fs-large`, weight 600. The words follow the coin
  text rules of *Done when*: one decimal, rounded half away from zero, ".0" dropped ("🪙 4
  coins"), "🪙 1 coin", "🪙 0 coins" (never "−0"), and a real minus sign (U+2212): "🪙 −1.4
  coins". The 🪙 is `aria-hidden`. "🪙" and the number never break apart (a no-break space); a
  very long count may wrap before "coins".
- **Colours:**
  - 0 or more: `--text`.
  - Below zero: the whole line in `--warning`. **It reads without colour** because of the minus
    sign, which is a full-width "−", not a hyphen, at the same large size. The well, lid and
    outline don't change colour.
  - Add the pair "`--warning` on `--surface-sunken` over a card" to `colours.test.ts` for both
    wallpapers (`--warning` on a card is already checked; the sunken well is darker, so it should
    pass with room to spare).
- No explanation ("€5 = 1 coin") anywhere (D-0014).
- `role="group"`, `aria-label` "Buying jar: 4.6 coins", "Buying jar: 1 coin", "Buying jar: 0
  coins", "Buying jar: minus 1.4 coins". No tab stop, nothing to tap.
- The two jars stay in two equal columns at 390 px and 1280 px; the buying jar is now shorter
  in content, and the row keeps both wells the same height (as the grid does today).
- The 🎧 Storytel jar is unchanged.

**States:** a new shelf, an older shelf with no prices, or prices only on books from before
2026-11-01: "🪙 0 coins" or the number of coins earned. No other empty state is needed.

### Keyboard and screen reader (summary)

- Follow-up: native buttons and fields in reading order; "Added “…”." announced as a status;
  errors linked to their field; focus never lost when a step changes (it moves into the new
  step's first field or chip, and back to the tab's field afterwards).
- Panel: "Price" is a labelled field in the panel's reading order, after the format chips.
- Jar: read through its `aria-label`, not a tab stop.

### Choices made while Hanna was asleep

All reversible; each is the recommended option. Tell her in the PR.

1. **One growing card, not a question per screen.** "How I have it" and "What did it cost?" are
   on one card (the price appears as soon as she taps Paperback, Hardcover or E-book), so a usual
   bought book takes two taps and a number. Only the €0 e-book link is a second step.
2. **The same eight format chips and words as the book panel,** several allowed, saved on each
   tap. Scan (and Manual from a scan) start with Paperback ticked.
3. **The words:** "Added “{title}”.", "How I have it", "What did it cost?", "E-book link",
   "Skip", "Done", "Next" (only before the link step). Errors: "Try 12.50 or 12,50.", "That's
   more than €9,999.99." and the panel's existing e-book link error.
4. **The € sits inside the field** and the number pad with a decimal mark opens on a phone; the
   field accepts a comma or a dot, and shows "12.50" once saved.
5. **Skip removes a price typed in this follow-up** but keeps the formats she tapped; **Done
   with an empty field** is the same as Skip for the price.
6. **Closing early saves what is valid** (formats, a good price, a good link) and quietly drops
   what isn't; no "Are you sure?".
7. **The follow-up hides the tabs** while it shows, and afterwards she's back where she was (her
   search results, the camera, an empty ISBN or Manual form).
8. **The e-book link step has no hint line,** only the error (D-0014), though the panel still has
   its old hint.
9. **In the panel, "Price" sits right under "How I have it"**, shown only for paperback,
   hardcover or e-book, cleared by emptying it (no ×).
10. **The jar's count is one large bold line;** below zero the line is in the warning colour and
    starts with a real minus sign, so it reads without colour; the well itself doesn't change.

# Test

To be written by the tester.

# Log

- 2026-11-21 architect: task written from Hanna's feature chat of 2026-11-21; D-0024 records the
  price-based buying jar (replacing T-0014's 3-coin treat rule); choices taken while Hanna was
  asleep are under Notes; handed to the UX designer.
- 2026-11-21 ux-designer: designed (the add dialog follow-up, the panel's Price field and the
  one-line jar; choices made while Hanna was asleep are listed under *Design*); handed to the
  developer.
- 2026-11-21 requester: Hanna asked to go with the recommended options while asleep; the designer's
  choices stand.
- 2026-11-21 developer: built `Book.price` (optional), `src/lib/price.ts` (price parsing, coin
  text and jar label, who is asked, the €0 e-book link condition) with `price.test.ts`;
  `pileJars` sums the buying jar in cents (+500 per owned finish from the pile, − price per owned
  book added since 2026-11-01; no floor, `TREAT_COST` gone); `merge.ts` keeps
  `keep.price ?? other.price`; the add dialog's follow-up (`AddFollowUp.tsx`, with
  `AddFollowUp.test.tsx`) after Search, Scan, ISBN and Manual, the tabs kept mounted and hidden
  meanwhile; "Price" in the book panel (`PriceField.tsx`); the one-line buying jar; the pair
  "warning on a sunken well over a card" for both wallpapers in `colours.test.ts`. Check:
  `pnpm test` 75 files passed, 1 skipped; 534 tests passed, 9 skipped. `pnpm run build` ✓ built.
  `pnpm exec harness check`: tasks, decisions, engineers, generated files ✓. Clicked through on
  `vite dev --port 3124` with no backend, shelf seeded in localStorage, at 390×844 and 1280×800 on
  lavender and midnight (screens in `docs/tasks/T-0016-screens/`): jar "Buying jar: 4.6 coins" /
  "Buying jar: minus 1.4 coins" in rgb(224, 163, 95) (`--warning`), Storytel jar unchanged;
  follow-up "Added “The Name of the Wind”.", focus on Paperback, price field `inputmode=decimal`
  144 px wide, chips/Skip/Done 44 px high on touch; "twelve" → "Try 12.50 or 12,50." not saved;
  "12,50" + Done → 12.5, back on Manual with "Added to the shelf." and focus in Title; E-book at
  "0" → Next → `javascript:x` refused with the panel's error, Skip keeps €0; a good link saved on
  Enter; Escape mid-way kept the book, Hardcover and 24.99; panel shows "€ 12.50", edit to 9.95,
  Escape puts back, emptying clears it, hidden after unticking Paperback; no sideways scroll; no
  page errors. For the architect: `colours.test.ts` checks "warning on a card" on lavender only,
  not on midnight (the task's Notes say both); I added only the pair the design asks for.
