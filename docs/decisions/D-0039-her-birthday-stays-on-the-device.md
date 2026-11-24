---
id: D-0039
title: "Her birthday for the secret Birthday book badge is kept only on the device, as a day and a month, and never goes to her account or the server"
description: "The Badges block asks for a birthday (day and month, no year) once per device and keeps it in that browser's storage under hannas-reading-list:birthday as MM-DD; badges() takes it as an option and every place that works out badges passes it; it is never part of the shelf, the Book data, the account or anything sent to the server at Sander's home."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [badges, privacy, storage]
---

# Context

Hanna asked (feature chat "better badges", 2026-11-22) for a secret badge for finishing a book
on her birthday, with the birthday "entered once per device in the badge block", explicitly
without involving Sander. Keeping it with her account would need a new field on the server at
Sander's home (a change in `deploy/nas/`, group 3 of the guardrails) or a change to how the shelf
is saved (`shelfMerge.ts`, also Sander's). Badges are worked out from the books and nothing is
saved for them.

# Decision

- The birthday is a **day and a month**, no year, stored as `MM-DD` in the browser's storage
  under `hannas-reading-list:birthday`, per device (not per account), read and written through
  one small helper in `src/lib/` that never throws when storage is blocked.
- `badges(books, today, { birthday })` takes it as an option; without one the Birthday book
  badge is simply not earned (still a hidden medal with its riddle). Every caller that works out
  badges (the Badges block, the badge toast, "Waiting for you") passes this device's birthday.
- It is **never** written to a `Book`, the shelf, the account, the server or a share image.
- She can change or clear it on the device; clearing it takes the badge away again there.

# Rationale

It gives Hanna the badge tonight with nothing for Sander to do, and keeps a personal date off
the server. Entering it once on her phone and once on her computer is the price, and she agreed
to it in the brief.

# Consequences

- On a new device the badge only appears after she enters her birthday there.
- Moving it to the account later is a new decision and a needs-Sander change.

# Guidance for agents

- Don't add a `birthday` field to `Book`, the library record or any server route.
- Don't ask for a year.
- If a request wants the birthday to follow her across devices, that is group 3: explain it to
  Hanna and go through Sander.
