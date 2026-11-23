---
id: D-0067
title: "A bingo square she swaps is saved as a place event with a b: key in the existing choice log, so the swap follows her to every device with no server change"
description: "Swapping is placing: which square stands in which slot of which card. It rides in the creatures choice log of D-0034 as a `place` event with key `b:<year>:<card>:<slot>` and the square's id in `sq`, which the live route already accepts and the den's and the garden's readers already ignore. Swapping is offered only on the card being played while nothing on it is ticked, and never to a square already on that card."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bingo, sync, server, challenges]
---

# Context

Hanna agreed CH4 on 22 November 2026: on a card with nothing ticked yet, tap a square, then
**Swap**, and pick another from all the squares; a ticked square can't be swapped; saved with
her account. The backlog added: "if that needs a server change, tell Hanna first (it would
need Sander)."

Book bingo saves nothing today (`src/lib/bingo.ts`): a card's squares are worked out from the
year and the card number with a fixed shuffle, and they tick themselves from the finishes, so
the card is the same on every device with nothing to sync. The one exception is a **full**
card, remembered on the book that filled it (`bingoCards`).

A swap she chooses is a real choice and must follow her to her phone and her computer, so it
has to be saved. Every store was looked at again:

- **`books`** (merged by `src/lib/shelfMerge.ts`, a code-owner path): a swap is not about one
  book. The existing `bingoCards` trick works only because a full card has a book that filled
  it; a card with nothing ticked has none. No.
- **`challenges`**: D-0034 already ruled this out for anything that isn't a challenge — the
  whole list is saved at once, so an older device would wipe the swaps the next time she
  edits a challenge. No.
- **`goals`, `favourites`**: `yyyy → number` and block-id strings. No.
- **A new field or route** in `deploy/nas/`: a code-owner path, a live database deploy, a
  second `needs-sander` pull request and Hanna waiting. That is exactly what the backlog
  asked to avoid if there is another way.
- **The creatures choice log** (`creatures`, D-0034, live since T-0028): a log that only
  grows, written through a route that takes a fixed list of kinds, where **`place`** is the
  setting kind for *which thing stands in which slot*, keyed by a free string of up to 60
  characters, and where per key only the newest event counts. The den's reader
  (`deriveShop`) reads only `home:<slot>` keys; the garden's reads only `g:` keys (D-0052),
  and both ignore everything else.

A swapped square **is** a placement: which square stands in slot *n* of card *c* of year *y*.
That is the `place` kind's own meaning, not a different kind of thing smuggled into it, and
the key namespace keeps it apart from the den's and the garden's keys exactly as D-0052 did.

# Decision

1. **A swap is a `place` event in the existing log** (D-0034), through the existing route and
   server function. **No change in `deploy/nas/`, `src/server/shelf.ts`, `src/lib/shelfMerge.ts`,
   `.github/` or `netlify/`, and nothing waits for Sander.**
2. **The key is `b:<year>:<card>:<slot>`** — the bingo year, the card number and the slot
   0…15 — and the square's id is the event's `sq` field (a string, well under the route's 60
   characters). Per key the newest event wins, so swapping the same slot again simply
   supersedes it; nothing is ever removed.
3. **Swapping is offered only on the card being played, in the current year, while nothing on
   that card is ticked.** As soon as one square is ticked, every square on that card shows no
   **Swap**. A ticked square is therefore never swappable, and a card in progress can't be
   rewritten under its own ticks.
4. **A square already on the card cannot be swapped in.** The picker lists only the squares
   that are not on the card, and the derivation refuses an override that would put the same
   square on a card twice: such an event is ignored, not applied.
5. **The three readers never read each other's keys.** Bingo reads only keys that start with
   `b:`, the garden only `g:`, the den only `home:<slot>`. A test covers all three directions.
6. **It works without the account** exactly as the creatures and the garden do: the device
   keeps the log in its own storage and sends what the account hasn't got when it can.
7. **A swap only changes which squares are on a card, never a tick.** Everything that follows
   from a card — a full card, the `bingo` badge, the trophy row, the rings (D-0064) — is still
   worked out from the finishes. Readers that need the swapped card take the swaps as an
   argument; a reader that passes none gets the unswapped card, which is what every caller
   got before.
8. **A future bingo thing that isn't a placement needs Sander.** As D-0052 §6 says for the
   garden: a new kind may not be smuggled into `place`.

# Rationale

The route was built to be added to, a slot is a slot, and this is the only store that both
follows her to every device and costs Sander nothing. Namespacing the keys with `b:` keeps
three games' choices apart in one log without any reader having to know about the others.
Allowing swaps only on an untouched card means a swap can never take away a tick she earned,
which is the one thing that could not be undone.

# Consequences

- Her bingo swaps ride along with her creature and garden choices: one log, one route, one
  sync.
- The log grows by at most one event per swapped slot (settings collapse per key), far inside
  the route's 20,000-event cap.
- `bingoYear` and `cardSquares` take an optional swap map; without one they behave exactly as
  before, so every existing caller and test is unchanged.

# Guidance for agents

- Use `place` with a `b:` key for a swap; never invent a kind, and never write the `creatures`
  field with a plain PATCH.
- Never offer **Swap** on a card with any square ticked, and never list a square the card
  already has.
- Keep the swap map optional on every function that takes it, so a caller that doesn't know
  about swaps still gets the old answer.
