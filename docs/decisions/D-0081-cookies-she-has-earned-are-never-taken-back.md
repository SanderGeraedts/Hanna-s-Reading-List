---
id: D-0081
title: "Cookies she has earned are never taken back, so her balance cannot go below zero"
description: "Cookies are worked out from the reading log but spending is stored, so lowering the log — a day corrected down, a slider nudged back, a book removed — took back cookies she had already spent and her balance went negative; the highest total ever earned rides in the choice log as one `place` event keyed `c:earned`, read as the highest in the log, and `earned` is never less than that."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [creatures, cookies, choices]
---

# Context

Hanna, 26 November 2026: *"have a look at how I got into negative cookies a few days ago and
have a look if we can improve it to not happen again."*

Cookies are **worked out** from her reading log and never stored (D-0033 §1–2): 1 🍪 per 5
minutes, +10 for a finished book, sleep reads half. What she **spends** — feeding a pet, buying
in the creature shop — is stored in the choice log. The balance is `earned + bonus − spent`, and
`creature.ts` had long said out loud what that meant:

```ts
/** earned + bonus − spent; may be below zero after a fix to a past day */
```

Anything that lowers the log lowers `earned`: correcting a past day down to nothing on the
calendar (T-0045 — `logPatch` deletes the day when the amount reaches zero), sliding a book's
progress back, removing a book, or merging two copies. If she had already spent those cookies,
the balance went **below zero** and stayed there until she had read enough to climb out.

This is the same shape as the fact that came round twice (D-0079), from the same cause: a total
worked out from data that is allowed to shrink, with decisions already taken against it.

# Decision

1. **What she has earned never goes down.** `earned` is `max(what the log says now, the mark)`.

2. **The mark is one `place` event** in the creatures choice log keyed `c:earned` with the
   count in `n`, exactly as the facts' mark and a swapped bingo square ride there (D-0034,
   D-0067, D-0079). The route is already live, so **nothing changes in `deploy/nas/`**. `place`
   is a setting kind, so `mergeLogs` keeps only the newest per key: one event however many
   years she reads, and it follows her to every device.

3. **It is read as the highest `c:earned` in the log**, not the newest, so two devices that have
   not met yet cannot pull it backwards.

4. **It is moved on by the page** (`useCookieMark`), not by the Creatures tab: cookies are
   earned by reading, so the mark must keep up on a day she only opens her shelf.

5. **Correcting a day upwards still earns more**, exactly as before. Only taking cookies away is
   refused.

# Rationale

She really did read that day, and she may already have spent what it earned. Clawing it back
because she tidied her log afterwards punishes her for keeping it accurate — and the app
encourages her to keep it accurate.

The alternative, refusing to let the balance show below zero, hides the problem without fixing
it: she would still be unable to feed a pet until the figure climbed back.

# Consequences

- A balance cannot go below zero from a correction any more. The one case left is a shelf whose
  log shrank **before** this shipped: the mark starts from what her log says today, so an
  existing negative balance stays until her reading catches up. It cannot happen again.
- The same narrow sync race as D-0079 applies: a device writing the mark while it is behind
  another can lower it by a few once a merge has dropped the higher event, and it climbs back.
- `deriveCreatures` takes the log it already had; nothing else changes.
