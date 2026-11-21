---
id: T-0001
title: "Adopt the harness at v0.7.0"
description: "D-0001: switch to pnpm, install the harness at v0.7.0 with harness adopt, thin AGENTS.md and CLAUDE.md, CI and auto-merge as callers of the harness's workflows with the backend workflow wired in, and the harness's ruleset on main."
status: Open
depends_on: []
decisions: [D-0001, D-0002, D-0003, D-0005, G-0004, G-0007, G-0011, G-0012, G-0016, G-0019, G-0023, G-0029]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Sander (the Engineer) asked on 2026-11-21 for this repository to use
[the harness](https://github.com/SanderGeraedts/harness) at `v0.7.0` (D-0001). The registries
(`docs/decisions/`, `docs/tasks/`, `docs/lessons.md`) and `.harness/engineers` came in with the
architect's pull request; this task makes the rest of the repository follow it, without changing
anything Hanna sees in the app:

1. **pnpm instead of npm** (G-0016): `packageManager` in `package.json` pinned to a pnpm 10
   version, `pnpm-lock.yaml` as the only lockfile (delete `package-lock.json`), the `preinstall`
   guard that refuses npm. Keep the existing `pnpm.onlyBuiltDependencies`. `netlify.toml` builds
   with `pnpm run build`.
2. **The harness installed:** `pnpm add -D github:SanderGeraedts/harness#v0.7.0`, then
   `pnpm exec harness adopt` (report) and `pnpm exec harness adopt --write SanderGeraedts
   SanderGeraedtsFugro`, then `pnpm exec harness sync`. It adds `.claude/agents/`,
   `.claude/settings.json`, `.githooks/pre-push`, `.gitattributes`, `.nvmrc` and the `prepare`
   script; commit what it writes.
3. **`.nvmrc` says `22`**, the version Netlify (`netlify.toml`) and the old CI use. `adopt`
   writes the major version of the machine it runs on; correct it if that isn't 22.
4. **Thin `AGENTS.md` and `CLAUDE.md`** from the harness's templates (`templates/AGENTS.md`,
   `templates/CLAUDE.md`), as in the harness's README. What is specific to this project moves
   into *Project rules* in `AGENTS.md`, each pointing at its decision:
   - whose instance is this: on Hanna's instance read and follow `docs/hanna-guardrails.md`
     first and use the `feature-chat` skill (keep this pointer word for word in meaning; it is
     how her instance finds its rules);
   - data safety: never run the dev server, a script or a test against the production
     `POCKETBASE_URL`, never pull Netlify environment variables (G-0019, D-0003, #96); new
     fields on `Book` are optional (D-0002);
   - the backend deploys through the `Backend image` workflow and Watchtower; never run
     `harness infra up/down` (D-0005);
   - backups: the NAS snapshots the app's data every hour (G-0023), so a schema change needs
     no manual backup first;
   - the project overrules G-0017, G-0018 and G-0028 (D-0002, D-0003, D-0005).
   `CLAUDE.md` keeps the `@AGENTS.md` and `@node_modules/@sandergeraedts/harness/rules/AGENTS.md`
   lines and the Claude Code specifics.
5. **Every npm command becomes a pnpm one** in `README.md`, `docs/hanna-guardrails.md`,
   `docs/hanna-setup.md`, `.claude/skills/feature-chat/SKILL.md` and `deploy/nas/README.md`
   (`npx netlify-cli …` becomes `pnpm dlx netlify-cli …`; setup on Hanna's PC gains
   `corepack enable` or an install of pnpm). Change only the commands, not the rules in those
   files (Q-003 decides those).
6. **CI as a caller of the harness's workflow** (G-0004, G-0011): `.github/workflows/ci.yml`
   as in the harness's README at `v0.7.0` (job `checks`, `workflow_dispatch:`, triggers
   including `ready_for_review`). The default checks run the `test` and `build` scripts that
   exist.
7. **Auto-merge** (G-0011): `.github/workflows/auto-merge.yml` calling
   `SanderGeraedts/harness/.github/workflows/auto-merge.yml@v0.7.0`, with
   - `workflows: [CI, Backend image]` under `workflow_run`;
   - `backend-workflow: backend.yml`;
   - `backend-paths: '^(deploy/nas/(Dockerfile|pb_migrations/|pb_hooks/)|\.github/workflows/backend\.yml)'`
     (the same paths `backend.yml`'s push trigger watches);
   - `wait-for: CI,Backend image`.
   **`backend.yml` stays the project's own** (D-0005): don't replace it with the harness's
   reusable `backend.yml`, which would publish under another image name than the one the NAS
   pulls. It already has `workflow_dispatch:`.
8. **`.github/CODEOWNERS` also lists** `/AGENTS.md`, `/.harness/` and `/.githooks/` for
   `@SanderGeraedts`: the rules move out of `CLAUDE.md`, which is code-owned, into those files,
   and the guard must move with them (until Q-003 is answered).
9. **The ruleset** (G-0029; the repository is public, so GitHub allows it): once CI has reported
   `checks / checks` on this task's pull request, `pnpm exec harness protect "checks / checks"`
   creates the ruleset "harness: default branch". In the existing ruleset `main`, change **only**
   the required status check from `test` to `checks / checks`: otherwise nothing can merge,
   since `test` is no longer reported. Leave its code-owner review and bypass as they are until
   Q-003 is answered. Do this at the merge, after the tester has passed the pull request.

# Done when

Run in a fresh worktree of the task's branch (no `.netlify/` folder in it):

- `pnpm install --frozen-lockfile` succeeds; `npm install` stops with the `preinstall` guard's
  message; `git ls-files package-lock.json` prints nothing.
- `pnpm exec harness check` prints only ✓ lines: tasks in step, decisions index complete with
  `3 overrules valid`, `engineers: 2 listed`, generated files current.
- `pnpm exec harness overrules` lists D-0002 → G-0017, D-0003 → G-0018, D-0005 → G-0028.
- `pnpm exec harness role`, signed in as `SanderGeraedts`, prints `engineer`.
- `pnpm test` and `pnpm run build` pass, with the same number of tests as `npm test` on `main`
  before this task.
- `grep -rnE "\bnpm (install|ci|run|test)\b|\bnpx\b" README.md CLAUDE.md AGENTS.md docs/hanna-guardrails.md docs/hanna-setup.md .claude/skills deploy/nas/README.md netlify.toml`
  prints nothing.
- `grep -n "harness" package.json .github/workflows/ci.yml .github/workflows/auto-merge.yml`
  shows `#v0.7.0` in `package.json` and `@v0.7.0` in both workflows; `auto-merge.yml` has
  `backend-workflow: backend.yml` and `wait-for: CI,Backend image`.
- On the pull request: `checks / checks` is green, and Netlify's deploy preview for it is built
  and opens the shelf (no sign-in screen, as before on previews).
- After the merge: `gh api repos/SanderGeraedts/Hanna-s-Reading-List/rulesets` lists
  "harness: default branch", whose `required_status_checks` is `checks / checks` with no bypass
  actors, and `main`, whose required check is `checks / checks` instead of `test`; Netlify's
  production deploy of the merge commit succeeded.

# Notes

- The harness: `node_modules/@sandergeraedts/harness/` (README sections *Install*, *Adopt* and
  *Update*, `rules/AGENTS.md`, `decisions/`). Never edit the installed copy. The adoption in
  diy-projects (its T-0028 and D-0030) is the worked example.
- `harness adopt` was run once by the architect to create the registries; `adopt --write` adds
  only what is missing, so running it again is safe.
- This pull request changes the CI and merge workflows, `.claude/` and `.githooks/`: say so
  plainly in its description. The new `auto-merge.yml` only takes effect once it is on `main`,
  so this pull request itself is merged by hand (`gh pr merge --squash`) once green and passed.
- **It touches code-owner paths** (`.github/`, `netlify.toml`, `CLAUDE.md`, `.claude/`,
  `deploy/nas/README.md`, `docs/hanna-guardrails.md`), so the `main` ruleset requires
  Sander's review, or an admin's bypass, to merge it (Q-003).
- **Data safety while working:** the main clone has a `.netlify/` folder; until T-0002 is done,
  the dev server there loads production's environment (#156). Build and run in a worktree
  without `.netlify/`, and never run `netlify link`.
- `.nvmrc` and `netlify.toml`'s `NODE_VERSION` must name the same major version.
- Open question **Q-003**, issue #190 (the `main` ruleset's code-owner review and bypass,
  `hold-paths`, the guardrails): everything above goes ahead without it; only deleting or loosening the
  `main` ruleset, `hold-paths` and rewriting the guardrails' rules wait for the answer.
- Not in this task: decisions from closed issues (a later task), seeded demo data for previews
  (G-0019 gap, see the log).

# Design

Nothing visible.

# Test

# Log

- 2026-11-21 architect: Task written from the Engineer's request. Ran `harness adopt` (v0.7.0,
  from a checkout of the harness) on `main`: no registries, no candidates; `adopt --write`
  created the registries and `.harness/engineers`, which the architect's pull request carries;
  everything else it wrote was left for this task. Recorded D-0001 to D-0005; raised Q-003 for
  the part of the ruleset that changes access. The existing required check is `test`, from the
  job `test` in the old `ci.yml`. Known gap, not in scope: G-0019 asks for seeded demo data on
  previews; previews here start with an empty shelf.
