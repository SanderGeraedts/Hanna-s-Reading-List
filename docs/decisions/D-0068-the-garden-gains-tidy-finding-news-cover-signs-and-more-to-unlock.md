---
id: D-0068
title: "The garden gains Tidy with Undo, finding a book, a quiet mark on what is new, cover signs for recent and current reading, a bigger catalogue and unlocks that go past fifty"
description: "Six additions to the reading garden, all worked out and none of them new saved data beyond where things stand: one Tidy button that sorts a year into reading order with an Undo, a search across every year, a per-device mark on plants that are new or have grown since she last looked, little cover signs for books finished in the last month and for the book she is reading now, forty-four plant kinds with every genre getting its own long, medium and short plant, and garden items unlocking to three hundred books with four seasonal ones and an item strip that grows with the garden."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, game, dashboard]
---

# Context

The garden went live the same day (D-0050 … D-0052, #263) and Hanna asked to improve it. In
a feature chat she settled every point herself, and chose explicitly to have all of it as
**one update** rather than five changes going live one at a time.

Two of her choices run against what would otherwise have been recommended, and are recorded
here because she made them knowingly:

- **Every existing plant is re-matched** when the catalogue grows. She was told that plants
  she already recognises would turn into something else overnight, and chose it anyway over
  filling only the gaps.
- **More kinds of plants** was chosen over day and night in the garden, so sleep reads stay
  marked 🌙 and are still never seen blooming at night.

A daily hook was wanted too, but D-0050 §4 says nothing in the garden ever wilts or dies,
which rules out the usual one. What is new is therefore *shown*, never *owed*.

# Decision

1. **Tidy is one button with one order.** "Tidy by reading order" puts every plant of a year
   garden on the spot of its own place in the order she finished the books, straight through
   the beds. There is no order menu: she wanted reading order and nothing else. A tidy that
   would move nothing is refused rather than written again.
2. **Tidy carries an Undo** that puts every plant back on the spot it stood on, as a second
   set of `place` events. Nothing is ever removed, so Undo costs no more than tidying did.
   The Undo belongs to the garden it was made in and goes when she looks at another year.
3. **Finding a book looks across every year,** not only the one she is on, and jumps to the
   year the plant stands in. A found plant is ringed until she does something else.
4. **What is new is marked, never announced.** A plant that has appeared or moved up a stage
   since she last looked is ringed quietly, and the dashboard block says "2 new plants · 1
   grew". No pop-ups and no hint texts (D-0013, D-0014).
5. **What she last saw is kept on the device, not in the account.** It is not a spot, and
   D-0052 §6 says anything else needs a kind of its own and so Sander. The phone and the
   computer therefore each keep their own, and she was told so.
6. **Opening the Garden tab is what counts as having looked.** The dashboard block reports
   the news and never clears it.
7. **Cover signs.** A book finished within the last month gets a little sign beside its plant
   with its cover on it, newest first and never more than eight. The book she is **reading
   now** gets one too, standing on the empty spot its plant will take when she finishes it,
   because an unfinished book has no plant (D-0050 §2) and nothing here may invent one.
   Signs lie over the drawing, so the flat garden and the 3D one get the same ones.
8. **The catalogue grows to forty-four kinds** and every shelf genre gets its own long,
   medium and short plant. **Every plant is re-matched,** including ones already in her
   garden (her choice). The four families stay as they are, so no new drawing is needed. No
   plant is drawn taller than a full-grown oak.
9. **Items unlock past fifty** — to 75, 100, 150, 200 and 300 finished books — and four
   seasonal items (seed tray, parasol, leaf pile, snowman) unlock by reading like any other
   and stand only in their own season. An unlocked item is still never lost, there is still
   no shop and still no price (D-0050 §8).
10. **The item strip grows with the garden:** six places in a one-bed garden and one more per
    bed after that, up to fourteen, so she never has to choose which items are out.
11. **Nothing new is saved.** Spots and item slots only, through the existing log and route
    (D-0052). No server change, nothing for Sander.

# Rationale

Everything she asked for could be worked out from the shelf she already has, so the whole
round stays a group-1 change she can have today. One tidy order rather than a menu is what
she actually asked for and is one less thing on a phone screen. Marking what is new instead
of asking her to keep something up gives the garden a reason to be opened without turning a
calm place into a chore, which is the only daily hook the no-dying rule leaves open.

Re-matching every plant is the riskier half of a bigger catalogue, and it is hers to take.

# Consequences

- The first time she opens the garden after this, many plants will look like something else.
- The glow is per device: looking on the phone does not clear it on the computer.
- A fuller garden draws more: the phone already falls back to the flat view, and the signs
  are capped at eight plus three so a busy month cannot flood it with covers.
- The bigger catalogue and the new items are data in `numbers.ts` and `plants.ts` and stay
  tunable without a new decision, as D-0050 §3 and §8 already allow.

# Guidance for agents

- Never save anything the garden works out: spots and item slots only, with `g:` keys.
- Never let a sign or the news write to the choice log; both are derived, and the note of
  what she last saw lives in this browser alone.
- A plant is still never removed or shrunk, and an unfinished book still never gets a plant.
