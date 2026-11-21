---
id: D-0001
title: "This project follows the harness"
description: "The harness is installed as a pinned dev dependency at v0.7.0; its rules and global decisions (G-NNNN) apply here unless a project decision overrules one, and decisions, questions and tasks live as files in docs/."
status: Accepted
date: 2026-11-21
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [process]
---

# Context

Until now this project kept its way of working in `CLAUDE.md`, `docs/hanna-guardrails.md`,
`.github/CODEOWNERS` and GitHub issues: the roadmap was issue #21, decisions were made in
issues and pull requests, and nothing recorded them as files. The same way of working has
since been written down and generalised in [the harness](https://github.com/SanderGeraedts/harness):
rules for agents, a registry of global decisions (`G-NNNN`), a team of four agents (architect,
UX designer, developer, tester), the `harness` command and reusable workflows for CI and
auto-merge. Another project of Sander's already runs on it.

On 2026-11-21 Sander (the Engineer) asked for this repository to use the harness at version
`v0.7.0`. T-0001 does the work.

# Decision

- **The harness is a pinned dev dependency:** `pnpm add -D github:SanderGeraedts/harness#v0.7.0`.
  CI and auto-merge call its reusable workflows at the same tag (G-0004).
- **The harness's rules and global decisions apply here,** read from
  `node_modules/@sandergeraedts/harness/`, unless a project decision overrules one by naming it
  in `overrules` (G-0002). At adoption this project overrules G-0017 (D-0002), G-0018 (D-0003)
  and G-0028 (D-0005).
- **This registry keeps what is specific to the project:** decisions `D-NNNN` and questions
  `Q-NNN` in `docs/decisions/`, tasks `T-NNNN` in `docs/tasks/`, lessons in `docs/lessons.md`.
  The task index (`docs/tasks/index.md`, generated) replaces the roadmap issue #21.
- **The Engineers** are listed in `.harness/engineers`: `SanderGeraedts` and
  `SanderGeraedtsFugro`. Everyone else, Hanna included, is a Requester (G-0007).
- **Where the project simply differs without a reason, it conforms** instead of overruling:
  npm becomes pnpm (G-0016), the CI workflow becomes a caller of the harness's (G-0004,
  G-0011), and the default branch gets the harness's ruleset (G-0029). T-0001 lists these.
- **Hanna's own instance keeps following `docs/hanna-guardrails.md`.** How its "needs Sander"
  draft pull requests and the code-owner review in `.github/CODEOWNERS` fit with the harness's
  auto-merge and ruleset is the Engineer's to decide (Q-003); until then both stay as they are.

# Rationale

One place holds the way of working, so an improvement reaches every project through an update
instead of being copied by hand, and decisions become files an agent can read instead of
comments in closed issues. Pinning by tag makes an update a deliberate pull request that lists
what changed (G-0005).

# Consequences

- A fresh clone needs `pnpm install` before the rules can be read.
- The status check CI reports becomes `checks / checks` (the caller's job, then the reusable
  workflow's); the rulesets on `main` have to require that name instead of `test`.
- Decisions made in closed issues are recorded here afterwards, as records of their own.
- Requests still arrive as GitHub issues; the architect turns each into a task or a question.

# Guidance for agents

- Follow the harness's rules and global decisions as if they were written here, and this
  project's decisions where they overrule one.
- Never edit the installed copy in `node_modules/`; when a global decision doesn't fit, record
  a project decision that names it in `overrules` and says why.
- Update the harness with `pnpm add -D github:SanderGeraedts/harness#<tag>`, bump the tag in
  the workflows in the same pull request, run `pnpm exec harness sync`, and put the output of
  `pnpm exec harness changes <from> <to>` in the description.
- Hanna is a Requester: plain language and no engineering questions (the harness's *Talking to
  a Requester*, and `docs/hanna-guardrails.md` on her instance).
