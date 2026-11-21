---
id: D-0006
title: "A save can never wipe the shelf: the server merges every save into its copy and keeps a history"
description: "Every shelf save is folded into the server's copy book by book (shelfMerge.ts), so a device can at worst add books, never lose them; PocketBase keeps earlier versions in an admin-only library_versions collection; the browser's pre-account shelf moves only into an account without a shelf and is never deleted."
status: Accepted
date: 2026-11-12
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [data-safety, sync, backend]
---

# Context

On 9 November 2026 a local test shelf on a developer's machine overwrote Hanna's shelf on the
server: a device with unsent changes replaced whatever the server had, wholesale. Her books were
recovered by hand (94 books, reading logs up to 9 November) with a one-off restore script (#96).
Her books are the one thing in the app that can't be rebuilt.

Before that, the move of the browser's shelf into an account at the first sign-in had already
been made safe (#24, closed 2026-11-07): it counts as done only after the server confirmed a save
that includes it, it happens once per browser, and the old copy (`hannas-reading-list:v1`) stays
in the browser as a backup.

PR #94 (merged 2026-11-12) made the overwrite impossible; #96 lists the steps the Engineer took
to restore her shelf and merge it. The README's *Accounts and syncing* section and
`docs/hanna-guardrails.md` describe the result.

Global decisions: this matches G-0019 (only production reaches the backend) and G-0023 (hourly
snapshots on the NAS); the history here is a second, finer way back for a single shelf. No
overrule.

# Decision

- **The server merges every save** (`src/lib/shelfMerge.ts`, called from `src/server/shelf.ts`).
  A save names the server version it is based on (`base`) and the books removed on purpose on
  that device (`removed`, and merged ids). Books on the server that a save leaves out are kept
  unless removed or merged there. When the server copy changed since `base`, each book comes from
  whichever side edited it last (`editedAt`), otherwise from the server. A save without `base`
  is always merged.
- **Every shelf keeps a history:** before a shelf changes, PocketBase stores the previous version
  in `library_versions` (at most one per 10 minutes, always one when a save drops books, the last
  100 per person), readable by the admin only (`deploy/nas/pb_hooks/history.pb.js`). Restoring is
  the Engineer's (`deploy/nas/README.md`, *Restoring a shelf*).
- **The pre-account browser shelf** moves only into an account that has no shelf yet, once per
  browser, counts as moved only after the server confirmed it, and is never deleted from the
  browser.
- **Nobody repairs her data by hand from a script or agent session;** when her books look wrong
  or missing, work stops and the Engineer restores from the history.

# Rationale

A whole-shelf save is simple, but it lets any stale or mixed-up device erase everything. Merging
on the server makes the worst case "a few books too many", which she can remove, instead of a
lost shelf. The history makes a mistake that still gets through reversible without a full
database restore.

# Consequences

- Every edit in the app and the nightly sync must stamp `editedAt`, or the merge can't tell which
  side is newer.
- `src/lib/shelfMerge.ts` and `src/server/shelf.ts` are code-owned: a change there waits for the
  Engineer's review.
- The `Backend image` workflow checks the history hook on every backend change.

# Guidance for agents

- Never make a save replace the server's shelf wholesale, and never drop a book the server has
  unless the device removed or merged it on purpose.
- Keep `editedAt` stamped by every new edit path, and keep the merge and sync tests
  (`shelfMerge.test.ts`, `library.sync.test.ts`) passing.
- If her books or reading data look wrong, stop and tell the Engineer; don't try to repair them.
- A change to how the shelf is saved, merged or migrated is the Engineer's: raise a question.
