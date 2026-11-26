---
id: D-0088
title: "Every failure Hanna can notice says what happened, whether her books are safe and what she can do, from one place: src/lib/trouble.ts"
description: "`trouble.ts` holds one honest three-part line per failure (what happened, what it means for her books, the way forward) with a Try again only where trying again can help; the shelf's failures wait in \"Waiting for you\", a goal's and a challenge's sit quietly where they are, the 3D note keeps its place, outside services (Open Library, cover lookups, favourites and creature choices) stay deliberately quiet, and \"safe on this device\" is only said when the browser really is keeping a copy."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [errors, sync, shelf, dashboard, storytel, words]
---

# Context

Hanna asked on 26 November 2026: *"what you see when the server at Sander's is unreachable,
a sync fails, or the 3D can't draw — today some of that is silent and some is a bare note."*

What the app did before:

| Failure | Before |
| --- | --- |
| The shelf can't reach the server at Sander's home | `sync: 'offline'`, shown only as one line hidden inside the account menu, plus a bare toast on the ↻ button |
| The shelf is too big to send | `sync: 'too-big'`, the same hidden line, with "uploaded covers" in it |
| The 3D bookshelf can't be drawn | A note with Try again (#181, T-0003) — good, but its words were about "this phone" and said nothing about what to do next |
| The Storytel refresh fails | A toast with Storytel's own message in it, status codes and all |
| A reading goal doesn't reach the server | **Silent.** `saveGoal(…).catch(() => {})` |
| One of her own challenges doesn't reach the server | **Silent.** `saveChallenges(…).catch(() => {})` |
| Open Library lookups, cover lookups | Quiet on purpose, and right to be: the guardrails say an outside API must fail quietly and the shelf must keep working |
| Favourites and creature choices sync | Quiet on purpose, and right to be: both queue what isn't sent and send it later; nothing is lost |

The two silent ones were the problem Hanna named: she could set a goal or make a challenge,
see it on screen, and have it reach no other device, with nothing said.

A claim had to be checked before it could be written. `useLibrary` writes the shelf to this
browser's storage on every change *before* anything is sent, so "your books are safe on this
device" is true — **except** when the browser refuses to store (a private window, storage
full), which `store()` swallows. The app may not claim a safety it hasn't got.

# Decision

1. **One place for the words: `src/lib/trouble.ts`.** A `TroubleKind` per failure and
   `troubleLine(kind, { deviceKeeps })` giving four things: `what` (what happened), `safe`
   (what it means for her books), `fix` (the way forward) and `retry` (the button's label,
   or `null` when trying again cannot help). `sander` marks the ones that are genuinely his.
   The words are tested in `trouble.test.ts`, not the components.
2. **Her words, never the machine's.** No stack trace, no status code, no `PocketBase`, no
   `WebGL`, no NAS. "The server at Sander's home" is the only name for the account server.
   `troubleFromError` and `troubleFromStorytelError` turn an error into a kind, and the
   error's own message is dropped.
3. **"Safe on this device" is checked, not assumed.** `deviceKeepsBooks()` writes one byte
   and takes it back. When it fails, the line says instead that this browser isn't keeping a
   copy either and what she changes now lives only in that tab.
4. **The shelf's failures wait in "Waiting for you"** (`WaitingCard`'s `trouble` prop), the
   app's home for anything that waits on her (D-0013): no pop-up, ever.
5. **Every other failure gets a quiet line where the thing is**: under the reading goal, under
   her challenges, in the 3D shelf's own note, in the Storytel toast.
6. **`offline` does not guess.** The device cannot tell "the server didn't answer" from "the
   server refused": `useLibrary` collapses both into `offline`. The line therefore claims
   neither, only what is certainly true — *"Your latest changes haven't reached the server at
   Sander's home."*
7. **Never offer to repair her books.** The `books-look-wrong` line sends her to Sander and
   says not to fix it by hand, because that makes his restore harder (the guardrails).
8. **What is quiet stays quiet.** Open Library and cover lookups, the favourites sync and the
   creature-choice sync fail without a word on purpose: each keeps what it hasn't sent and
   sends it later, and the shelf keeps working. Nothing about them risks her thinking her
   reading was saved when it wasn't.

# Rationale

A failure she can see but not understand is worse than one she can't see. The three parts are
what she actually needs and in that order: *is something broken, are my books gone, what do I
do.* Keeping them in one small pure module means the words can be tested as words, and the
same failure can never get two different lines in two different places.

A `retry` of `null` is as important as a label: offering Try again for a shelf that is simply
too big teaches her the button is a lie.

The device-keeps check is the whole reason this is a decision and not a text change. The old
3D note already said "Your books are safe" with nothing behind it.

# Consequences

- A new failure gets a `TroubleKind` and a line in `trouble.ts` — never a message written at
  the place it happens.
- `useLibrary`'s sync states stay as they are: `src/lib/library.ts`'s load/save/sync is group 3
  (the guardrails) and was not touched. The cost is point 6: the line cannot distinguish an
  unreachable server from a refusing one. Telling them apart would need `failed()` to keep the
  error, which is Sander's to approve.
- `store()` in `library.ts` still swallows a storage failure quietly. `deviceKeepsBooks()`
  notices the same condition from outside, which is enough for the words; making the shelf
  itself react to it is also Sander's.
- `useOwnChallenges` now returns a third item (whether the last save reached the server).
- `WaitingCard` has a `trouble` prop; the page wires it.
- No new CSS: the row reuses `waiting-list`, `badge-icon`, `waiting-info`, `chips`.

# Guidance for agents

- **Preserve:** one line per failure, in `trouble.ts`, in her words, with the three parts and
  an honest `retry`. The `SafeBookshelf` note and its Try again stay.
- **Preserve:** the deliberately quiet ones (Open Library, covers, favourites, creature
  choices). Making an outside API shout breaks the guardrails.
- **Avoid:** pop-ups (D-0013), stack traces, status codes, machine names, and any sentence
  offering to repair, restore or reset her books.
- **Avoid:** saying "safe on this device" without `deviceKeeps`.
- **Stop and ask Sander** before changing the load/save/sync parts of `src/lib/library.ts`,
  `src/lib/shelfMerge.ts` or `src/server/shelf.ts` (D-0077, the guardrails) — including to
  carry the real reason a sync failed through to the words.
