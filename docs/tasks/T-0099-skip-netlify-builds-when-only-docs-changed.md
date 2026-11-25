---
id: T-0099
title: "Skip Netlify builds when a change touches only docs/ and root Markdown"
description: "Add a dependency-free ignore script and a [build] ignore line in netlify.toml, so a docs-only pull request gets no deploy preview and a docs-only merge doesn't redeploy, with a test over git ranges and one real docs-only pull request as proof."
status: Doing
size: small
depends_on: []
decisions: [D-0078, G-0011, G-0018, G-0019, D-0077]
raised_on: 2026-11-25
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/276"]
---

# Goal

Netlify's build minutes are nearly used up this month (278 of 300 on 25 November 2026), and
this site uses about three quarters of them, many for pull requests and merges that change only
task files, decisions and other docs. Sander decided to skip those builds (D-0078). This task
makes Netlify cancel a build, for a deploy preview or for production, when every changed file
is under `docs/` or is a `.md` file at the repository root, and build as before for everything
else.

What a user sees: nothing changes in the app. On a docs-only pull request, Netlify's status
says the deploy preview was skipped instead of giving a preview link; on every other pull
request the preview appears as before.

# Done when

1. `pnpm test` passes, including a new test of the ignore script that builds throwaway git
   repositories in a temp folder (no network, no Netlify) and runs the script with the Netlify
   variables set, expecting exit 0 (skip) or non-zero (build):
   - preview, pull request changes only `docs/tasks/x.md` → skip
   - preview, only root `README.md` and `AGENTS.md` → skip
   - preview, only `src/…` → build
   - preview, `docs/…` and `src/…` together → build
   - preview, a docs-only last commit on a branch whose earlier commit changed `src/` → build
   - preview, only `public/notes.md`, `deploy/nas/README.md` or `netlify.toml` → build
   - preview, a rename from `src/a.ts` to `docs/a.ts` → build
   - production, `CACHED_COMMIT_REF..COMMIT_REF` docs-only → skip; with an app file → build
   - production, `CACHED_COMMIT_REF` empty, equal to `COMMIT_REF`, or not an ancestor → build
   - `CONTEXT=branch-deploy` or unset → build
   - no `main` to find a merge base with → build
2. `netlify.toml` has the `ignore` line under `[build]`, and `pnpm exec harness check` passes.
3. A real docs-only pull request (this task's own docs update after the code has merged, or a
   one-line change in `docs/`) shows on GitHub, from the developer or tester:
   `gh pr checks <n>` with Netlify's deploy-preview status reported as skipped or canceled
   (not built), `checks / checks` green, and the pull request merged by the auto-merge workflow.
   After the merge, the Netlify deploy list for `main` shows that commit's production build as
   skipped, and the live site still loads (the previous deploy). The pull request with the
   script itself must build (it touches `scripts/` and `netlify.toml`): its preview appearing
   is part of the check.

# Notes

- **Mechanism (D-0078):** `[build] ignore = "node scripts/netlify-ignore.mjs"` (or the
  equivalent `sh` script; the developer picks). Netlify cancels the build on exit 0 and builds
  on any other exit. It runs after the clone and before `pnpm install`, so the script may use
  only Node's built-ins and `git`. Netlify sets `CONTEXT`, `COMMIT_REF`, `CACHED_COMMIT_REF`,
  `BRANCH` and `HEAD`; the base branch is `main`.
- **Preview:** diff `git merge-base <main> COMMIT_REF`..`COMMIT_REF`, where `<main>` is
  `origin/main` if present, else try `git fetch origin main` (a failure means build). Don't use
  `CACHED_COMMIT_REF` for previews: on a pull request's first preview it isn't the pull
  request's base, and a plain `git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF` would skip the
  first build of a new branch.
- **Production:** diff `CACHED_COMMIT_REF..COMMIT_REF` only when both are set, they differ and
  `git merge-base --is-ancestor` holds; otherwise build.
- Use `git diff --name-status --no-renames` (or check both names of a rename) so a file moved
  out of `src/` counts as an app change.
- **Docs-only paths:** `docs/**` and `*.md` at the root only. Checked on 25 November 2026:
  nothing in `src/`, `netlify/`, `vite.config.ts` or `public/` imports or serves a file from
  `docs/` or the root Markdown (two comments in `src/server/` mention docs paths; they are not
  imports). Don't add `public/`, `deploy/` or `.github/`.
- **Merging is unaffected:** the `harness: default branch` ruleset requires only
  `checks / checks`, and `.github/workflows/auto-merge.yml` waits only for CI and Backend image,
  never for Netlify (D-0077). A skipped preview leaves no failing required check.
- **Update the docs that promise a preview for every pull request:** the last bullet of
  `AGENTS.md` ("every pull request gets a Netlify deploy preview") and `docs/hanna-setup.md`
  line about checking the deploy preview: say docs-only pull requests get none.
  `.claude/skills/feature-chat/SKILL.md` asks what Hanna checks on the preview; her feature
  pull requests change `src/`, so they still get one. If the skill is generated by
  `harness sync`, leave it.
- **Hanna (Requester):** her feature pull requests touch the app and keep their previews. If
  she or her Claude ever opens a docs-only pull request (her backlog, say), there will be no
  preview to look at, and nothing in the app changed.
- The test must never set or read `POCKETBASE_URL` or any Netlify site setting, and never run
  `netlify` commands (G-0019, AGENTS.md).
- The same approach is going into Sander's other Netlify site at the same time; keep the rule
  and the variable handling the same so both stay consistent.
- Size: small. Tooling only, no new collection, route or service, nothing in the app changes.

# Design

Nothing visible in the app.

# Test

Tester, 2026-11-25, on `6738e3e` (PR #276), clean `pnpm install --frozen-lockfile`.

**CI (read, not repeated):** run 45626361874, attempt 1, `success` on `6738e3e`.
`gh pr checks 276`: `checks / checks pass 1m33s`; `checks / e2e` and `checks / shards`
`skipping` (the harness skips e2e on a draft; they run on `ready_for_review`);
`netlify/hannas-reading-list/deploy-preview pass  Deploy Preview ready!` (status went
`pending Deploy Preview processing.` 13:43:05 → `success Deploy Preview ready!` 13:43:37); the
Header rules / Pages changed / Redirect rules checks `neutral`. CI log:
`✓ scripts/netlify-ignore.test.ts (22 tests)`, `Test Files 199 passed | 2 skipped (201)`,
`Tests 2480 passed | 22 skipped (2502)`; no retries. The preview loads: `GET /` on
`deploy-preview-276` → `200`. So the PR that carries the script built its preview, as *Done
when* 3 requires (its last commit touches only this task file, but the merge-base diff includes
`scripts/` and `netlify.toml`, so it built).

**Done when 1, the test, repeated:**
`pnpm exec vitest run scripts/netlify-ignore.test.ts` → `Tests  22 passed (22)`; then five
more runs with `--sequence.concurrent --maxWorkers=4` → `Tests  22 passed (22)` each time
(132 of 132).

**Done when 2:** `netlify.toml` line 5: `ignore = "node scripts/netlify-ignore.mjs"` under
`[build]`. `pnpm exec harness check` → `✓ tasks: 74 tasks, index in step`,
`✓ decisions: 70 records, index complete, 4 overrules valid`, `✓ engineers: 2 listed`,
`✓ generated files: current`, exit 0.

**Trying to break it** (own throwaway repositories in a temp folder, `node` on the script with
the Netlify variables; exit 0 = skip, 1 = build):

- `docs/x/../../src/evil.ts` written → git records `src/evil.ts` → build. git never reports a
  `..` path.
- docs file and src file with spaces and unicode (`src/ünïcödé n.ts`) → build; docs + root
  `ünïcödé c.md` only → skip (`-z` output, no quoting problems).
- root `NOTES.MD`, `Notes.Md` → build (only lowercase `.md` counts, the safe side). A root file
  named just `.md` → skip (harmless).
- deleted `src/app.ts` + docs change → build; mode change only on `src/app.ts` → build;
  `src/app.ts` turned into a symlink (`T`) → build.
- submodule added under `docs/` → build (it adds root `.gitmodules`); under `src/` → build.
- symlink `src/link.md` → build; symlink `docs/link.ts` → `../src/app.ts` → skip, which is
  right: the app file itself is unchanged and nothing in the app reads `docs/` (checked: no
  import of `docs/` or root Markdown in `src/`, `netlify/`, `vite.config.ts`, `public/`).
- run from `docs/` subdirectory with the absolute script path: docs-only → skip, docs+src →
  build (git reports root-relative paths). The `netlify.toml` command itself run from a
  subdirectory fails to find the script → exit 1 → build.
- merge commits, production: cached = a docs commit, head = merge bringing `src` → build;
  merge of a branch whose earlier commit changed `src` → build; merge of a docs-only branch →
  skip. Previews: docs branch that merged current `main` (which had `src` changes) → skip
  (correct, merge base moves); same with a stale `origin/main` → build; an "evil" merge that
  edits `src` in the merge commit → build.
- `CACHED_COMMIT_REF` an unrelated root commit, a missing sha, `not-a-ref`, `--all`, or a
  descendant of `COMMIT_REF` → build (`not an ancestor`). `COMMIT_REF` unset → build;
  `COMMIT_REF=nope` → build.
- `CONTEXT`: `deploy-preview` and `production` with a docs-only change → skip;
  `branch-deploy`, `dev`, `Production`, `DEPLOY-PREVIEW`, empty → build.
- not a git repository, git not on `PATH` → build.
- shallow clones: depth 1 of the branch only → build (`no merge base of FETCH_HEAD`), and
  production with the cached commit outside the clone → build; depth 2 all branches → preview
  build (no merge base), production docs-only → skip. Clone without `origin/main` → the
  `git fetch origin main` fallback works (docs-only → skip, with `src` → build); fetch failing
  (offline) → build.
- Could not test on Windows: a file name containing a newline (the file system refuses it);
  `-z` is the right handling for it.
- Observation, not blocking: with `diff.relative=true` injected into git's config and the
  script run from `docs/`, a docs+src change gave `skip` (git limits the diff to the current
  directory). Netlify runs the command from the repository root with no such config, so this
  can't happen in the build; adding `--no-relative` to the `git diff` call would close it.

**Docs:** `AGENTS.md` now says a pull request that changes the app gets a preview and a
docs-only change gets none; `docs/hanna-setup.md` says the same for Hanna. No other doc outside
tasks and decisions promises a preview for every pull request. D-0078 exists and is indexed.

**Verdict:** passed. *Done when* 1 and 2 hold; the script PR's own preview built. *Done when* 3
(a real docs-only pull request skipped, production skip on merge, live site still up) can only
be checked after this merges.

# Log

- 2026-11-25 architect: Sander decided (in session) to skip Netlify previews for docs-only pull requests in both repositories, to save build minutes; recorded D-0078 (overrules G-0018 for docs-only changes, production skipped too) and wrote this task. Size: small.
- 2026-11-25 developer: built `scripts/netlify-ignore.mjs` (Node built-ins and git only; previews diff `merge-base(origin/main or a fetched main, COMMIT_REF)..COMMIT_REF`, production diffs `CACHED_COMMIT_REF..COMMIT_REF` only when both are set, differ and the cached one is an ancestor; `--name-status --no-renames`; anything uncertain or an empty diff builds), the `[build] ignore` line in `netlify.toml`, and `scripts/netlify-ignore.test.ts` (22 cases over throwaway git repositories, every case in *Done when* 1 plus `docs-not/`, `src/notes.md`, a cached ref that isn't in the clone and preview ignoring `CACHED_COMMIT_REF`). AGENTS.md and `docs/hanna-setup.md` now say docs-only pull requests get no preview; `.claude/skills/feature-chat/SKILL.md` left as is (her feature pull requests change `src/`). Check: `pnpm exec vitest run scripts/netlify-ignore.test.ts` → `Tests 22 passed (22)`; `pnpm test` → `Test Files 199 passed | 2 skipped (201)`, `Tests 2480 passed | 22 skipped (2502)`. For the architect: `tsc --noEmit` on `main` already reports two unused imports (`src/components/GardenPage.test.tsx` `SPOTS_PER_BED`, `src/lib/dashboardLayout.test.ts` `toggleFavourite`); not fixed here.
- 2026-11-25 tester: passed (CI green on attempt 1, Netlify preview for #276 built and loads, the script's test 132 of 132 over six runs, about 50 own break cases never skipped an app change; see Test). Remaining: Done when 3 after the merge: open a real docs-only pull request and check that `gh pr checks` shows Netlify's deploy preview skipped or canceled, `checks / checks` green and auto-merge merged it; then Netlify's deploy list for `main` shows that commit's production build skipped and the live site still loads.
