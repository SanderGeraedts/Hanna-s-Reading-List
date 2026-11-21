# Decision registry

Written by `harness sync`; don't edit, except for *Project notes* at the end. This is the
project's registry. The global registry, with the decisions every project starts from, is in
`node_modules/@sandergeraedts/harness/decisions/`.

Every choice someone would later ask "why?" about, one file each. Agents read the global
index, then [index.md](index.md), then only the records their work touches.

## Records

| Kind | File | Status values |
| --- | --- | --- |
| Decision | `D-NNNN-<slug>.md` | `Accepted`, `Replaced` |
| Open question | `Q-NNN-<slug>.md` | `Open`, `Resolved` |

Start every record from [_template-decision.md](_template-decision.md) or
[_template-question.md](_template-question.md). Ids are never reused.

## When to record a decision

Record it when reversing it would need a discussion: architecture, data shape, storage,
dependencies, how the project is run or backed up, promises to its users, and changes to how
the team works. Names, wording and small refactors are not decisions.

## Global and project decisions

- A global decision (`G-NNNN`) holds here unless a project decision overrules it.
- **To overrule one,** record a project decision that lists it in `overrules: [G-NNNN]` and
  says in its Context why the global decision doesn't fit. `pnpm exec harness overrules`
  lists every overrule; `pnpm exec harness check` fails when one names a decision that
  doesn't exist.
- **When a global decision covers what a project decision says,** the project decision is
  replaced by it: set it to `Replaced` with `replaced_by: [G-NNNN]` and move its index line
  to *Replaced*, ending the line with `Replaced by G-NNNN.` in plain text (the global record
  isn't in this folder, so don't link to it). `harness check` fails when that global
  decision isn't in the installed harness. `replaces` only ever names project decisions.
- **A choice that would suit every project** is still recorded here first, so work
  continues; the architect also proposes it as a global decision by pull request on the
  harness. The project decision stands whatever happens to the proposal.
- **When the harness is updated,** the update PR lists the global decisions that were added,
  changed or replaced (`pnpm exec harness changes <from> <to>`). Per decision the architect
  opens a task to conform or records an overruling decision.

## Rules

- **Decisions are never edited once Accepted,** except to redact personal details without
  changing what was decided. To change one, write a new decision that stands alone, list the
  old one in `replaces`, set the old one to `Replaced` with `replaced_by`, and move its
  index line to *Replaced*.
- **Agents may record a decision** when it can be reversed. A choice that can't be reversed
  or costs money needs a human: the architect raises an open question (`Q-NNN`) with options
  and a recommendation, opens a GitHub issue assigned to the Engineer, and the work that
  doesn't depend on it continues. The Engineer's answer becomes a decision that lists the
  question in `resolves`.
- **Every decision ends with *Guidance for agents*:** what to preserve, what to avoid, and
  when to stop and ask.
- **The index is the table of contents.** When a record is added or changes status, update
  its line in [index.md](index.md) in the same commit: `- [D-NNNN Title](file.md): one
  sentence`. `harness check` fails when the index and the files differ.
- Commit with the record id first: `D-0003: record`, `Q-002: raise`, `Q-002: resolve`.

## Project notes

What this project adds about its own registry goes between the two marker lines below.
`harness sync` keeps what is there and `harness check` ignores it; everything outside them
is rewritten on every sync. Leave the marker lines themselves as they are.

<!-- harness:project-section:start -->

Nothing yet.

<!-- harness:project-section:end -->
