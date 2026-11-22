---
id: D-0030
title: "The want-to-read pile's height uses the thickness of real printed books, and audiobooks and e-books count as the printed book"
description: "Each want-to-read book counts once, as a printed book: a paperback is 0.07 mm a page plus 1 mm of cover, a hardcover 0.07 mm a page plus 5 mm of boards; an e-book counts as a paperback, and a book she only listens to as the printed book, at 30 pages an hour of listening (minutes ÷ 2) when its minutes are known; a book with no length counts as 280 pages. Under the switch the Audiobook kind shows total listening time instead of a height. The 3D shelf keeps its own thickness."
status: Accepted
date: 2026-11-22
decided_by: requester
overrules: []
replaces: [D-0029]
replaced_by: []
resolves: []
tags: [dashboard, pile, audiobooks, shelf]
---

# Context

T-0021 added a line to the Want-to-read pile block: how tall her want-to-read books would stand
stacked up. D-0029 made that the sum of each book's thickness on the 3D shelf (`bookDims(book).t`)
and left out the books she only listens to.

On 2026-11-22 Hanna asked in a feature chat why her pile showed only 24 cm. Two reasons: her
audiobooks were left out, and the shelf's thickness is exaggerated for a real book (about 3.5 cm for
300 pages, with a minimum of 1.8 cm), because the 3D shelf is drawn to look good, not to measure. She
decided:

1. The pile uses the thickness of **real books**; the 3D shelf stays as it is.
2. A book she **only listens to** counts as the printed book: its printed page count when known,
   otherwise about 30 pages per hour of listening.
3. An **e-book** counts as a paperback with the same page count.

D-0008 makes a listen-only book's minutes its page count everywhere, and says treating audiobooks
differently in one feature is Hanna's choice. This is that choice, for the pile's height only.

A listen-only book's `pages` can't be trusted to be printed pages: for those books the app keeps
`pages` equal to `minutes` (`lengthPatch` and `linkOnFormatChange` in `src/lib/listening.ts`,
D-0008), so a 10-hour audiobook usually has `pages: 600`. Taking that as 600 printed pages would
make it twice too thick.

# Decision

**The thickness of one book** (in millimetres, `p` = its page count for the pile, below):

| Kind | Thickness | 300 pages |
|---|---|---|
| Paperback | `0.07 × p + 1` (1 mm of cover) | 22 mm |
| Hardcover | `0.07 × p + 5` (5 mm of boards) | 26 mm |

No minimum and no maximum: a real book of 1 page is about 1 mm, and one of 1,500 pages is about
10.6 cm.

**Its page count for the pile, `p`:**

- A book she **only listens to** (`listenOnly`: only Audiobook and/or Storytel, ignoring Other):
  - `minutes ÷ 2` when it has minutes (30 pages per hour of listening);
  - otherwise its `pages` (an older book with only a page count, taken as printed pages);
  - otherwise 280 pages.
- **Every other book**:
  - its `pages` (real printed or e-book pages);
  - otherwise `minutes ÷ 2` when it has minutes;
  - otherwise 280 pages.
- Only counts above 0 are used, as in `thicknessPages`. `minutes ÷ 2` is not rounded.

**Which thickness a book gets in the whole pile ("All").** Each want-to-read book counts **once**:

- as a **hardcover** when Hardcover is among its formats;
- otherwise as a **paperback**: Paperback, From the library, Borrowed, E-book, Audiobook, Storytel,
  Other, or no format at all.

**The kinds under the switch.** A book counts in **every** kind it has, so the kinds can add up to
more than All:

| Kind | Formats | Thickness |
|---|---|---|
| 📖 Paper | Paperback, Hardcover, From the library, Borrowed (`PHYSICAL_FORMATS`) | hardcover when it has Hardcover, otherwise paperback |
| 📱 E-book | E-book | paperback |
| 🎧 Audiobook | Audiobook, Storytel (also an old Storytel import with only `storytelId`, through `formatsOf`) | no height: listening time (below) |

In Paper and E-book the book uses the same page count `p` as above. A book with only Other or no
format counts in All and in no kind.

**The Audiobook kind shows listening time, not a height** (Hanna, 2026-11-22, the same day). Its
total is the sum, over the want-to-read books with Audiobook or Storytel (listen-only or not), of:

- the book's `minutes` when it has them;
- otherwise `pages × 2` (the same 30 pages an hour, the other way round);
- otherwise 560 minutes (280 pages × 2).

It is compared with everyday durations from a fixed list, not with her own listening pace. All,
Paper and E-book stay heights. T-0023 has the list and the wording.

**The 3D shelf doesn't change.** `bookDims` and `thicknessPages` stay as they are, and stay the
page count for everything else (D-0008). The pile has its own small formula, in one place.

# Rationale

- The pile is meant to answer "how tall would this really be", so it should use a real book's
  thickness. The shelf is a picture and keeps the thickness that looks good there.
- About 0.07 mm a page is a common figure for paperback paper (a sheet is two pages of about
  0.1–0.15 mm together); a paperback's cover adds about 1 mm and a hardcover's two boards and
  binding about 5 mm. This gives Hanna's own figures: 300 pages ≈ 2.2 cm and ≈ 2.6 cm.
- For a listen-only book `minutes` is the reliable number: it comes from Storytel or from what
  she typed as Length, while `pages` is usually a copy of it. Using `pages` only when there are no
  minutes means an audiobook is never counted twice as thick. 30 pages an hour is about 2 minutes a
  page, the estimate already mentioned in D-0008 (#141).
- Counting a book once in All, at its paper thickness when it has paper, follows D-0010 (the
  physical copy wins). Counting it in every kind it has under the switch means each kind shows all
  of her books of that kind.

# Consequences

- The pile looks smaller than the shelf suggests for paper books, and bigger than before with
  audiobooks, since they now count.
- A change to the shelf's thickness no longer changes the pile's height, and the other way round.
- The all-audiobooks line from T-0021 goes away: audiobooks now always have a height.
- Built and tested in T-0023.

# Guidance for agents

- Keep the pile's thickness and page-count rule in one pure function in `src/lib/`; don't use it
  for the 3D shelf, and don't use `bookDims` for the pile.
- For a listen-only book, never take `pages` as printed pages when it has `minutes`.
- Don't take this as leave to stop counting a listen-only book's minutes as pages elsewhere: D-0008
  still holds for the shelf, bingo, badges and every other page figure.
- Changing the constants, the 30 pages an hour, which kinds count, or showing the Audiobook kind
  as a height again or by her own pace, is Hanna's choice: ask her first.
