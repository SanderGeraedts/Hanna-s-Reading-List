---
id: T-0013
title: "Let Make a wish take wishes and grant three books, picked smartly, with series strictly in order"
description: "Step 1: optional wishes for length, genre and language. Step 2: three books from her pile, favouring those that waited longest, authors she loves and series she enjoys; a book only shows if every earlier book of its series is read."
status: Done
depends_on: []
decisions: [D-0013, D-0014]
raised_on: 2026-11-21
done_on: 2026-11-21
result: []
---

# Goal

From a grilling with Hanna (2026-11-21) about the ⭐ Make a wish button (#210). She wanted all
three improvements:

- **Wish for something**, in step 1, all optional and fresh each time:
  - length: any, short (under 300 pages or 8 h) or long (450 pages or 12 h and more);
  - genre: from her pile;
  - language: from her pile.
- **Three to choose from**, in step 2 ("✨ Grant my wish"): three books with a sparkle. Tap one to
  open it, or **Wish again** for others.
- **Smarter picking:** more likely are books that waited long on the shelf (up to three times as
  likely after two years), books by authors she rated 4–5 ★ (twice), and the next book of a
  series she rated 4–5 ★ so far (twice). Each book says why ("✨ An author you love").
- **No match:** "No book matches all your wishes. These come closest:", followed by the books that
  meet the most wishes.
- **Series, strictly in order (her rule):** a book only shows up if it's a standalone, or every
  book before it in its series is read. A book that isn't on the shelf counts as not read, by the
  series number, so a lone "Book 3" isn't offered.
  - A book numbered before it on the shelf, such as a 1.5 novella, must be read too.
  - This is in `readNextChoices`, so the dashboard's "What next?" block follows the same rule.

# Done when

- The series rule is tested in `readNext.test.ts`:
  - Book 2 missing;
  - only Book 3 on the shelf;
  - Book 1 alone;
  - a 1.5 novella;
  - the existing cases.
- Lengths, granting three, closest books, wishing again and the weights are tested in
  `wish.test.ts`.
- Clicked through at phone size on a local dev server with no backend. Book 3 of a series whose
  Book 2 is unread, and a lone Book 3, never show. A short wish grants only short books. The
  reasons show, and picking a book opens it with a sparkle.
- `npm test` and `npm run build` pass.

# Notes

- `src/lib/readNext.ts`: the strict series rule.
- `src/lib/wish.ts`: lengths, wish options, weights and granting.
- `src/components/WishCard.tsx`: the two steps. It reuses the quick update's sheet (a bottom sheet
  on a phone, a corner card on a computer).
- `src/routes/index.tsx`: the ⭐ button opens the card. A genre picked at the top of the shelf
  starts the wish with that genre.

# Log

- 2026-11-21 architect: grilling with Hanna. The plan was agreed, and she added the strict series
  rule.
- 2026-11-21 developer: built and clicked through.
- 2026-11-21 tester: passed locally. Remaining: Hanna tries it on the preview.
