---
id: D-0052
title: "Where her plants and garden items stand is saved in the existing creatures choice log, as place events with garden keys, so the garden needs no server change"
description: "The garden's only saved data is where things stand; it rides in the `creatures` choice log of D-0034 as `place` events with keys `g:p:<book id>` (a plant) and `g:i:<year>:<item>` (a garden item), which the existing route already accepts and the den's reader already ignores, so the garden is a group-1 change with nothing for Sander to do and no second server pull request."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, sync, server]
---

# Context

D-0050 saves only Hanna's choices, and she wants her garden on every device, like her creatures.
D-0034 went through every store that already syncs and found that creature choices needed a server
change (T-0028); that change is live: a `creatures` JSON field on her `libraries` record and a
route, `POST /api/collections/libraries/creatures`, that adds choice events in one transaction and
never removes one.

That route takes a fixed list of kinds (`hatch`, `choose`, `release`, `name`, `feed`, `buy`,
`wear`, `place`, `habitat`, `current`, `shelf`) and drops anything else, so a new `plant` kind
would be thrown away silently. A new kind would mean a second change in `deploy/nas/`, which is a
code-owner path: another `needs-sander` pull request, another live-database deploy, and Hanna
waiting.

The garden's saved data is only ever **where something stands**, which is exactly what the route's
`place` kind is for: a setting kind with a `key`, where per key only the newest event counts. The
den's reader (`deriveShop` in `src/lib/creatures/shop.ts`) only reads `place` keys of the form
`home:<slot>` with a slot it knows, and ignores every other key.

# Decision

1. **The garden writes `place` events into the existing log** (D-0034), through the existing
   route and server function. **No change in `deploy/nas/`, and no second server pull request.**
2. **Keys.**
   - A plant's spot: `g:p:<book id>`, with `bed` and `spot` as numbers.
   - A garden item's spot: `g:i:<year>:<item>`, with `slot` as a number, and `off: 1` when she
     takes the item away again. `<year>` is the garden's year, or `0` for the garden of finishes
     with no day.
   A key is at most 60 characters, which a 36-character book id fits inside.
3. **Only where things stand is saved.** Never a plant, a stage, a size, a kind, an unlock or a
   count: those are worked out (D-0050 §1).
4. **The den and the garden never read each other's keys.** The garden reads only keys that start
   with `g:`; the den keeps reading only `home:<slot>`. A test covers both directions.
5. **It works without the account** exactly as the creatures do: the device keeps the log in its
   own storage and sends what the account hasn't got when it can.
6. **A future kind of its own needs Sander.** If the garden ever needs something that isn't a
   spot, that is a new decision and a `needs-sander` task; it may not be smuggled into another
   kind.

# Rationale

The route was built to be added to, and a spot is a spot: using `place` costs nothing, loses
nothing (a log that only grows, merged by key), and keeps the whole garden a group-1 change Hanna
can have today instead of after a database deploy. Namespacing the keys with `g:` keeps the two
games' choices apart inside one log without either reader having to know about the other.

# Consequences

- Her garden arrangement rides along with her creature choices: one log, one route, one sync.
- The log grows by at most one event per plant and per item placed (settings collapse per key), so
  a hundred-plant garden is far inside the route's 20,000-event cap.
- A reader of the log must never assume every `place` event is a den item.

# Guidance for agents

- Use `place` with a `g:` key for anything the garden saves; never invent a kind.
- Never write the `creatures` field with a plain PATCH; only through the existing route.
- Never remove a garden event; placing again supersedes it, `off: 1` takes an item away.
