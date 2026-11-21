---
id: T-0005
title: "Make the books that match a search stand out much more from the rest"
description: "#184: while searching, the matching books light up and the rest dim; make the difference between the two clearly bigger."
status: Doing
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/197"]
---

# Goal

Hanna asked in #184: "While searching we now have the lighting up of the matching books after
a certain amount of letters. Make that a higher difference between lighted books and
unhighlighted books."

Today (from #170, `bd25ec7`), once the search box has two letters, matching books glow a little
and the others dim: in `src/components/BookMesh.tsx` a match gets an emissive glow of `0.22`,
and a book that doesn't match is shaded to `1 − 0.65` = 35% brightness. Make the matches
clearly brighter and the others clearly darker, so the matches can be found at a glance on a
full shelf, on a phone as well as on a big screen.

**Assumption:** only the contrast changes; when the lighting starts (two letters), which books
match, and the scroll to the first match stay as they are. The UX designer picks the values; a
reasonable start is a glow around twice today's and the rest at about 15–20% brightness, perhaps
with the matches standing out a little further from the shelf.

# Done when

- On the pull request's deploy preview, with at least ten books on the shelf, typing two or more
  letters that match two of them makes those two clearly the brightest things on the shelf, and
  the rest clearly darker than today. The tester attaches before (live site or `main`'s preview)
  and after screenshots of the same search, on a phone size (390 × 844) and on a desktop size.
- Clearing the search puts every book back to its normal look; taking out a matching book still
  shows it lit evenly, without the dimming.
- The glow and dim strengths are named constants, and a unit test pins the new values (or the
  function that computes a book's brightness from `glow`/`dim`), so they don't drift back.
- `pnpm test` and `pnpm run build` pass; CI is green.
- In the after screenshots, the matches stand visibly further forward than the books beside
  them, and a match with a dark spine is still brighter than the books around it that don't
  match.
- The UX designer has reviewed the screenshots.

# Notes

- `src/components/BookMesh.tsx` (`glowing`, `shade`, around the `match` prop),
  `src/components/BookshelfScene.tsx` (`highlight`), `src/components/SearchBox.tsx` (two
  letters).
- Keep the cost per frame the same: materials are only updated when the values change.
- Close #184 from the pull request.

# Design

UX designer: choose the glow and dim values (and whether matches move forward a little) before
it is built; review the screenshots after.

## Design (2026-11-21, before the build)

**What it looks like today** (`main`, local, 12 books, search "the" matching three of them, at
390 × 844 and 1280 × 800): the three matches are only a little lighter than the rest. On the
desktop they can hardly be told apart from their neighbours. The others are darker, but the
shelf still looks evenly lit.

**The new values** (in `BookMesh.tsx`, as named constants, e.g. `MATCH_GLOW`, `MATCH_DIM`,
`MATCH_FORWARD`):

| | Today | New |
|---|---|---|
| Glow of a match (`emissiveIntensity` added) | `0.22` | **`0.5`** |
| Dimming of a book that doesn't match (`1 − x·dim`) | `0.65` (left at 35% brightness) | **`0.82`** (left at 18%) |
| How far a match comes forward off the shelf | `0.03` | **`0.06`** |

- **Matches come forward** twice as far as now. That is a little more than a hover (`0.035`),
  so even at the phone's small scale a match stands proud of the row, and a dimmed book can't
  be taken for one. They don't tilt and don't move up: the row stays tidy.
- **The others at 18%:** dark enough that the matches are what the eye goes to, light enough
  that the shelf, the spines and the decorations are still there and she knows where she is.
- **Decorations, nooks and the bookcase don't change.** Only books dim and glow, as now.
- **The animation doesn't change:** the same easing in and out (damped, about a quarter of a
  second); clearing the search fades everything back.

**When to adjust in the review:** if a match with a very dark spine (navy, black) is still not
clearly brighter than the light books around it, raise the glow up to `0.7`, not higher. Above
that the spine's lettering washes out. If 18% makes the shelf look switched off on a phone,
the dimming may go back to `0.78` (22%). Both stay named constants.

**Unchanged:** the lighting starts at two letters; which books match; the scroll to the first
match; the chip in the header ("“the” · 3 ✕"), which also ends the search; a taken-out book
lit evenly, without glow or dimming.

**Accessibility:** the lighting is extra. The search list and its count (`role="status"`,
"3 books") already tell a screen reader what matched, and that doesn't change. Brightness and
the step forward both show the match, so it doesn't depend on colour alone.

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

## Review after building (2026-11-21)

Looked at the developer's screenshots of #197 (local dev server, no backend, 12 demo books,
search "the" matching The Night Circus, The Hobbit and The Name of the Wind): before (`main`)
and after at 320, 390 and 1280 px. I also read the change in `BookMesh.tsx`.

**What matches the Design:**

- **The values are named constants** at the Design's values (`MATCH_GLOW` 0.5, `MATCH_DIM`
  0.82, `MATCH_FORWARD` 0.06), and the easing and the update-only-on-change are kept.
- **Matches come forward.** At 390 and 1280 px all three matches clearly stand proud of the
  row and cast a shadow on the books next to them. This works well, and it does not depend on
  colour.
- **On a phone (390 px) the difference is clear.** The Night Circus is the brightest thing on
  the shelf, and The Name of the Wind (teal) is clearly brighter than Emma and Dracula beside
  it. The shelf does not look switched off: the spines, the koala, the cat and the bookcase
  are all still there. So the dimming stays at `0.82`; there is no need to go back to `0.78`.
- **The header chip** ("“the” · 3 ✕") is unchanged.

**Differences:**

1. **Must fix: a dark-spined match is not clearly brighter than the light books that don't
   match, on the desktop.** At 1280 px, The Hobbit (purple) is about as bright as Circe and
   Piranesi beside it, which are dimmed but still read as tan and mustard. It mostly stands out
   by its step forward and its crisper letters, not by its light. This is the case the Design
   named for adjusting ("if a match with a very dark spine … is still not clearly brighter than
   the light books around it, raise the glow up to `0.7`"), and *Done when* asks for the
   matches to be "clearly the brightest things on the shelf". The developer saw the same.
   **Change:** set `MATCH_GLOW` to **`0.6`** (from 0.5) and update the unit test that pins it.
   Keep `MATCH_DIM` 0.82 and `MATCH_FORWARD` 0.06. Not higher than 0.6 in this round: The Night
   Circus (cream) is already near white at 0.5, and its lettering must stay readable.
   **Check in the new screenshots** (1280 and 390 px, search "the"): The Hobbit is visibly
   brighter than Circe and Piranesi, and the lettering on The Night Circus can still be read.
   If The Night Circus's lettering washes out at 0.6, go back to 0.55 and say so in the *Log*.
2. **Not for this task: the top row at 320 px.** The row sits under the header's light fade and
   the page buttons cover its left end, so a match there (The Night Circus) is hard to see.
   That isn't caused by this change: the same fade and buttons cover that row on `main` with no
   search on (see T-0004's 320 px screenshots). It belongs to the phone layout. T-0003's *Done
   when* already says that at 320 × 640 the tabs "cover no books, also while a search is on".
   Once T-0003 is done, a match on the top row can be seen there too. If T-0003 ends up not
   touching the header, the architect should open a separate task for it.

**Verdict: send back** to the developer for difference 1 (`MATCH_GLOW` 0.5 → 0.6, test
updated, new screenshots at 1280 and 390 px). After that I only need to look at the new
screenshots.

# Test

# Log

- 2026-11-21 architect: Task written from #184.
- 2026-11-21 ux-designer: design written. Glow 0.22 → 0.5, the other books from 35% to 18%
  brightness, matches 0.06 forward instead of 0.03. The review may raise the glow to at most
  0.7.
- 2026-11-21 developer: built in #197 (draft). `MATCH_GLOW` 0.5, `MATCH_DIM` 0.82 (18%),
  `MATCH_FORWARD` 0.06 in `BookMesh.tsx`, with `bookLight(fly, glow, dim)`; materials still
  only update when the values change. New `BookMesh.test.ts` (fails on `main`: "bookLight is
  not a function"). `npm test`: "Tests 285 passed (285)"; `npm run build`: "built in 15.81s".
  Before (`main`) and after screenshots of the search "the" (3 of 12 books) at 320, 390 and
  1280 px from a local dev server with no backend, for the UX designer's review. For the
  architect, not fixed here: at 320 px the top shelf row sits under the header's light fade and
  the view buttons cover its left end, so a match there (The Night Circus) is hard to see.
- 2026-11-21 ux-designer: reviewed: sent back. On the desktop the dark-spined match (The Hobbit)
  is not clearly brighter than the dimmed light books: raise `MATCH_GLOW` to 0.6 (dim and
  forward stay). The 320 px top-row overlap belongs to T-0003, not this task.
