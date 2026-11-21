---
id: T-0001
title: "Adopt the harness at v0.7.0"
description: "D-0001: switch to pnpm, install the harness at v0.7.0 with harness adopt, thin AGENTS.md and CLAUDE.md, CI and auto-merge as callers of the harness's workflows with the backend workflow wired in, and the harness's ruleset on main."
status: Doing
depends_on: []
decisions: [D-0001, D-0002, D-0003, D-0005, G-0004, G-0007, G-0011, G-0012, G-0016, G-0019, G-0023, G-0029]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/192"]
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
   - the dev server never loads Netlify's site environment (`environmentVariables: { enabled:
     false }` in `vite.config.ts`, #156); never re-enable it or run `netlify link` (see
     `docs/data-safety.md`). Added by the orchestrator on 2026-11-21, after T-0002 merged;
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
- `grep -n "environmentVariables" AGENTS.md vite.config.ts` shows the rule in *Project rules*
  and `environmentVariables: { enabled: false }` in `vite.config.ts`.
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

2026-11-21, tester. First run at `59d7d0d`, re-run at `4aeb1b0`, which merges `main` in
after T-0002. Ran in a fresh worktree of `origin/t-0001-adopt-harness` that had no
`.netlify/` folder. Node v22.23.5, pnpm 10.34.9, and no `POCKETBASE_URL` in the environment.

**Verdict: passed at `4aeb1b0`**, for everything that can be checked before the merge.
`59d7d0d` conflicted with `main` after T-0002 merged; the developer fixed that in `4aeb1b0`
before I sent the task back. See the last two sections.

## Done-when, run by hand at `59d7d0d`

- `pnpm install --frozen-lockfile`: it ran `preinstall` (passes under pnpm) and `prepare`
  (`harness hooks`), then printed "Done in 21.2s using pnpm v10.34.9".
- `npm install` (npm 11.20.0, in a scratch folder with a copy of `package.json`) printed
  "Use pnpm (G-0016): pnpm install", `npm error code 1`, and exited with 1. As the developer
  noted, npm still wrote `node_modules/` and a `package-lock.json` before the guard stopped it.
  That comes from the harness's guard, not from this change.
- `git ls-files package-lock.json` printed nothing.
- `pnpm exec harness check` exited with 0 and printed "✓ tasks: 10 tasks, index in step",
  "✓ decisions: 8 records, index complete, 3 overrules valid", "✓ engineers: 2 listed" and
  "✓ generated files: current".
- `pnpm exec harness overrules` lists G-0017 overruled by D-0002, G-0018 overruled by D-0003
  and G-0028 overruled by D-0005.
- `pnpm exec harness role`, with `GH_TOKEN` for `SanderGeraedts` (`gh api user` gives
  `SanderGeraedts`), printed `engineer`.
- `pnpm test` printed "Tests 279 passed (279)" and exited with 0. The branch doesn't touch
  `src/`. The last CI run on the old `main` also had 41 files and 279 tests. The new `main`
  has 42 files and 280 tests, because T-0002 added `vite.config.test.ts`.
- `pnpm run build` printed "✓ built in 14.42s" and exited with 0.
- The npm/npx grep over the listed files printed nothing (exit 1).
- The harness grep finds `github:SanderGeraedts/harness#v0.7.0` in `package.json` and
  `@v0.7.0` in both `ci.yml` and `auto-merge.yml`. `auto-merge.yml` has
  `backend-workflow: backend.yml` and `wait-for: CI,Backend image`. The lockfile resolves the
  harness to `9f6ca58`, which is `v0.7.0^{commit}` in the harness repository.
- On the pull request, `checks / checks` passed. Its log shows pnpm v10.34.9, the four ✓
  lines of `harness check`, "Test Files 41 passed (41)", "Tests 279 passed (279)" and the
  build. `netlify/hannas-reading-list/deploy-preview` is `success`, "Deploy Preview ready!".
  Netlify's build command is `pnpm run build` and the repository no longer has an npm
  lockfile, so the green preview means the build ran with pnpm. I didn't open the Netlify log
  or the preview itself, because previews may carry production's address. The Done-when check
  that the preview "opens the shelf" can't pass until the Engineer fixes the preview
  environment (Log item 4).
- The checks for after the merge (rulesets, production deploy) were not run, since the pull
  request hasn't merged.

## What else I tried

- **Dependency versions.** I compared `package-lock.json` from `main` with `pnpm-lock.yaml`,
  matching each package name against its set of versions. npm had 692 packages and pnpm has
  693; the only difference is the added `@sandergeraedts/harness`. Everything else, including
  the optional platform packages, has the same versions. `pnpm ls --depth 0` agrees with the
  old lock for vite 8.3.5, vitest 5.1.0, react 19.3.1, three 0.187.0, @tanstack/react-start
  1.169.4, @tanstack/react-router 1.170.46, @netlify/vite-plugin-tanstack-start 1.3.19,
  typescript 6.0.3 and happy-dom 21.0.4.
- **Workflows.** The real names are `CI` (`ci.yml`) and `Backend image` (`backend.yml`), so
  `workflows: [CI, Backend image]` and `wait-for: CI,Backend image` match exactly. The
  harness's reusable workflow matches `wait-for` against the run's `.name`, which is the
  workflow name. `backend-paths` covers the same four paths as `backend.yml`'s push trigger.
  `backend.yml` is unchanged (`git diff --quiet` against `main`) and already has
  `workflow_dispatch:`. `ci.yml` has `workflow_dispatch:` and the `ready_for_review` trigger.
  The permissions in `auto-merge.yml` (`contents`, `pull-requests`, `actions: write`) are what
  the reusable workflow asks for.
- **Rules kept.** I compared the thin `AGENTS.md` and `CLAUDE.md` with the old `CLAUDE.md`.
  These all carried over:
  - whose instance this is, with the pointer to `docs/hanna-guardrails.md` and the
    `feature-chat` skill (in both files);
  - never use the production `POCKETBASE_URL` locally, and never pull Netlify environment
    variables (now naming `netlify link` and `netlify dev` too);
  - #96 and `shelfMerge.ts`;
  - `Book` fields optional;
  - a `deploy/nas/` change rebuilds the image and changes the live database;
  - the code owners;
  - the commands, the Netlify deploy on merge, and the previews.

  Two things were dropped, and neither matters: "CI must pass before merging", which CI and
  the harness rules now enforce, and "since #94 a save can't drop books", which the README
  still explains. `docs/hanna-guardrails.md` and `.claude/skills/feature-chat/SKILL.md` keep
  their rules; only commands changed. CODEOWNERS now also lists `/AGENTS.md`, `/.harness/` and
  `/.githooks/`. The guardrails' list of "the guardrails themselves" doesn't name `AGENTS.md`
  yet; that is for the follow-up task after Q-003.
- **The pre-push hook.** I fed it stdin directly. A push to `refs/heads/main` is refused
  (exit 1), including when the last line has no trailing newline. A push to a feature branch
  is allowed (exit 0). The file is stored with LF line endings (`.gitattributes`).
- **`core.hooksPath`.** `harness hooks` (run by `prepare`) set `core.hooksPath=.githooks` in
  the clone's shared config. The path is relative, so it resolves in each worktree.
  - The main clone is on `main`, which has no `.githooks/` yet, so it runs no hooks.
  - It ran none before either: `.git/hooks` holds only `*.sample` files.
  - So nothing is lost. The main clone just gets no pre-push guard until `.githooks/` reaches
    `main`, and the `main` ruleset still refuses direct pushes.

  This doesn't break anything.
- **`.nvmrc` and Netlify.** `.nvmrc` is `22`, which matches `NODE_VERSION = "22"` in
  `netlify.toml`.

## Found at `59d7d0d`, fixed in `4aeb1b0`

1. **Merge conflict with `main`.** After T-0002 (#191) merged,
   `git merge-tree --write-tree --name-only HEAD origin/main` reported
   `CONFLICT (content): Merge conflict in docs/tasks/index.md`.
2. **T-0002's text wasn't adapted.** T-0002 says the task that merges second takes the
   other's changes in. At `59d7d0d` the merged result would have had:
   - `docs/data-safety.md` still saying `npm run dev` and pointing at "`CLAUDE.md` →
     *Data safety*", a section this pull request removes;
   - no #156 rule in `AGENTS.md`.

The developer fixed both in `4aeb1b0`, before I sent the task back.

## Re-run at `4aeb1b0`

Same worktree; I deleted `node_modules` first.

- `pnpm install --frozen-lockfile` printed "Done in 36.1s using pnpm v10.34.9".
- `pnpm exec harness check` printed the same four ✓ lines and exited with 0.
- `harness role` printed `engineer`.
- `harness overrules` lists the same three overrules.
- `git ls-files package-lock.json` printed nothing.
- The npm/npx grep, with `docs/data-safety.md` added, printed nothing (exit 1).
- `grep -n "environmentVariables" AGENTS.md vite.config.ts` found `AGENTS.md:38` (the rule in
  *Project rules*) and `vite.config.ts:22`, `environmentVariables: { enabled: false },`.
- `docs/data-safety.md` no longer mentions `CLAUDE.md` and points at `AGENTS.md` →
  *Project rules*.
- `git merge-tree --write-tree HEAD origin/main` reports no conflict (exit 0).
- `pnpm test` printed "Test Files 42 passed (42)" and "Tests 280 passed (280)": the 280 on
  `main` now, which includes T-0002's new test.
- `pnpm run build` printed "✓ built in 2.52s" and "✓ built in 1.85s", exit 0.
  - Afterwards `git status` showed `src/routeTree.gen.ts` as modified. The change is line
    endings only: the build writes LF and this Windows checkout uses CRLF. `main` does the
    same. I restored the file.
- The pull request checks for `4aeb1b0`:
  - `checks / checks` passed. Its log shows pnpm v10.34.9, the four ✓ lines, "Test Files 42
    passed (42)" and "Tests 280 passed (280)".
  - `netlify/hannas-reading-list/deploy-preview` passed, "Deploy Preview ready!".
  - Netlify's "Header rules", "Pages changed" and "Redirect rules" show `skipping`. They are
    Netlify's deploy-summary items, not test checks, and they skip on every pull request here
    (#188, #191) too.
  - GitHub reports the pull request `MERGEABLE`.

**Verdict at `4aeb1b0`: passed** for everything that can be checked before the merge. Still
open, for the Engineer:
- the preview item of *Done when*: the preview shows the sign-in screen, which points at the
  preview environment (Log item 4);
- the checks for after the merge.

# Log

- 2026-11-21 architect: Task written from the Engineer's request. Ran `harness adopt` (v0.7.0,
  from a checkout of the harness) on `main`: no registries, no candidates; `adopt --write`
  created the registries and `.harness/engineers`, which the architect's pull request carries;
  everything else it wrote was left for this task. Recorded D-0001 to D-0005; raised Q-003 for
  the part of the ruleset that changes access. The existing required check is `test`, from the
  job `test` in the old `ci.yml`. Known gap, not in scope: G-0019 asks for seeded demo data on
  previews; previews here start with an empty shelf.
- 2026-11-21 developer: Built on `t-0001-adopt-harness`, in a worktree without `.netlify/`.
  `packageManager: pnpm@10.34.9`; `pnpm-lock.yaml` made with `pnpm import` from the old
  `package-lock.json` (same resolved versions), which is deleted. Installed
  `github:SanderGeraedts/harness#v0.7.0`; `adopt --write SanderGeraedts SanderGeraedtsFugro`
  added the four agents, `.claude/settings.json`, `.githooks/pre-push`, `.gitattributes`,
  `.nvmrc` (it wrote `26`, corrected to `22`) and the `preinstall` and `prepare` scripts;
  `harness sync` "✓ generated files are current". Thin `AGENTS.md` (project rules with their
  decisions) and `CLAUDE.md`; npm commands are pnpm ones in the five docs and `netlify.toml`
  (Hanna's setup gains `winget install --id pnpm.pnpm -e`). `ci.yml` calls the harness's CI at
  `v0.7.0` with its default checks; `auto-merge.yml` as in step 7; `backend.yml` unchanged.
  CODEOWNERS also lists `/AGENTS.md`, `/.harness/`, `/.githooks/`. Checks, locally:
  `pnpm install --frozen-lockfile` "Done in 2.8s using pnpm v10.34.9"; `npm install` stops
  with "Use pnpm (G-0016): pnpm install" (npm error code 1); `git ls-files package-lock.json`
  prints nothing; `harness check` "✓ tasks: 10 tasks, index in step", "✓ decisions: 8
  records, index complete, 3 overrules valid", "✓ engineers: 2 listed", "✓ generated files:
  current"; `harness overrules` lists G-0017 ← D-0002, G-0018 ← D-0003, G-0028 ← D-0005;
  `harness role` as SanderGeraedts "engineer"; `pnpm test` 41 files, 279 tests passed (`npm
  test` on `main` before: 279 passed); `pnpm run build` built; the npm/npx grep prints
  nothing; the harness grep shows `#v0.7.0` and `@v0.7.0` in both workflows. For the
  architect: `adopt` lists candidates (D-0001 ~ G-0004/G-0001, D-0005 ~ G-0018/G-0030/G-0027
  and others), not acted on here; `npm install` writes `node_modules` and a `package-lock.json`
  before the guard stops it (npm 11 runs the root `preinstall` after reifying); `prepare`
  sets `core.hooksPath=.githooks` in the clone's shared git config, so the main clone has no
  hooks until it has `.githooks/` from `main`.
- 2026-11-21 developer: Draft PR #192. CI on it: `checks / checks` passed (pnpm v10.34.9,
  `harness check` the four ✓ lines as above, "Tests 279 passed (279)", build ✓);
  `netlify/hannas-reading-list/deploy-preview` passed, "Deploy Preview ready!". **The preview
  does not meet the Done-when:** it opens on the **sign-in screen** ("Sign in to open your
  shelf"), not the shelf. Not caused by this change: the preview of #188 (from `main` before
  this task) shows the same sign-in screen. The sign-in screen only appears when the server
  has a `POCKETBASE_URL` (`src/server/pocketbase.ts`, `src/lib/session.ts`), so deploy
  previews appear to get production's address, against G-0019 and D-0003. Not touched here
  (Netlify environment settings are the Engineer's); for the architect and the Engineer.
- Remaining: (1) Sander's code-owner review of #192 (the `main` ruleset requires it; not
  bypassed). (2) At the merge, after the tester has passed it: in the ruleset `main` change
  only the required check from `test` to `checks / checks`, then merge by hand with
  `gh pr merge --squash`. (3) Q-003 (#190): whether `harness protect "checks / checks"` is run
  now (it creates "harness: default branch" with no bypass actors, per its `--dry-run` in the
  PR) and what happens to `main`'s code-owner review and bypass. Not run tonight. (4) Deploy
  previews show the sign-in screen, which suggests `POCKETBASE_URL` is set for previews
  (G-0019): for the Engineer to check on Netlify; the preview item of the Done-when waits on
  it. (5) After the merge: the rulesets check and Netlify's production deploy.
- 2026-11-21 developer: At the orchestrator's request after T-0002 (#156) merged: merged
  `origin/main` (conflict only in the generated task index, regenerated); `AGENTS.md` →
  *Project rules* gains the rule that the dev server never loads Netlify's site environment
  (`environmentVariables: { enabled: false }`, never re-enable it, never `netlify link`, see
  `docs/data-safety.md`), and Goal step 4 and *Done when* gain it. `docs/data-safety.md` (from
  T-0002) now says `pnpm run dev` and points at `AGENTS.md` → *Project rules* instead of
  `CLAUDE.md` → *Data safety*, which this task moved. Checks: `pnpm install --frozen-lockfile`
  done; `harness check` the four ✓ lines (10 tasks in step, 8 records, 3 overrules valid, 2
  engineers, generated files current); `grep -n environmentVariables AGENTS.md vite.config.ts`
  shows `AGENTS.md:38` and `vite.config.ts:22`; the npm/npx grep prints nothing; `pnpm test`
  42 files, 280 tests passed (279 before plus the one in T-0002's `vite.config.test.ts`);
  `pnpm run build` built.
- 2026-11-21 tester: passed at `4aeb1b0`. Every Done-when item that can be run before the
  merge passed (outputs in *Test*). `59d7d0d` had conflicted with `main` after T-0002 merged,
  and `4aeb1b0` fixed that. Dependency versions are unchanged apart from the added harness.
  Every project rule and data-safety guard from the old `CLAUDE.md` is kept. The workflow
  names match. `core.hooksPath` doesn't break the main clone, which had no hooks before.
  Marked ready; not merged.
- Remaining: for the Engineer:
  (1) the code-owner review of #192;
  (2) at the merge, change the required check in the ruleset `main` from `test` to
      `checks / checks`, then merge by hand;
  (3) Q-003 (#190): `harness protect`, and `main`'s code-owner review and bypass;
  (4) deploy previews show the sign-in screen, which suggests `POCKETBASE_URL` is set for
      previews (G-0019). The preview item of the Done-when waits on this;
  (5) after the merge: the rulesets check and Netlify's production deploy.
