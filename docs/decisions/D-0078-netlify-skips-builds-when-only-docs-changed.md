---
id: D-0078
title: "Netlify skips the build, preview and production alike, when a change touches only docs/ and Markdown at the repository root"
description: "An ignore command in netlify.toml cancels a Netlify build when every changed file is under docs/ or is a .md file at the repository root; anything else, or anything it can't work out, builds as before."
status: Accepted
date: 2026-11-25
decided_by: engineer
overrules: [G-0018]
replaces: []
replaced_by: []
resolves: []
tags: [hosting, process, cost]
---

# Context

Netlify's free build minutes are shared by this site and Sander's other Netlify site: on
25 November 2026, 278 of the month's 300 minutes were used. This site ran about 523 builds that
month (about 349 deploy previews and 174 production deploys) at about 30 seconds each, roughly
three quarters of the total. Many of them were for pull requests and merges that changed only
task files, decisions or other documentation, which the site never serves. G-0018 asks for a
deploy preview for every pull request. Sander said on 25 November 2026: skip previews for
docs-only pull requests, in both repositories.

# Decision

- `netlify.toml` gets a `[build] ignore` command. Netlify cancels the build when it exits 0 and
  builds when it exits anything else.
- **Docs-only** means: at least one file changed, and every changed path (added, modified,
  deleted or renamed, both names) either starts with `docs/` or is a `.md` file at the
  repository root (`README.md`, `AGENTS.md`, `CLAUDE.md`). Nothing else counts: not
  `public/`, `src/`, `netlify/`, `scripts/`, `deploy/`, `.github/`, `.claude/`, config files or
  Markdown anywhere outside `docs/` and the root.
- **What is compared:**
  - deploy preview (`CONTEXT=deploy-preview`): the whole pull request, from its merge base
    with `main` to `COMMIT_REF`. A docs-only push to a pull request that also changes the app
    still builds, so the preview always shows the pull request's own app.
  - production (`CONTEXT=production`): `CACHED_COMMIT_REF` (the last commit Netlify built) to
    `COMMIT_REF`, only when both are set, differ, and `CACHED_COMMIT_REF` is an ancestor of
    `COMMIT_REF`.
  - any other context (branch deploys, a manual or hook-started build): build.
- **When in doubt, build.** A missing variable, a merge base that can't be found (a shallow
  clone, no `main` to compare with), an empty diff, a git error or a crash of the script all
  exit non-zero, so Netlify builds as it did before.

# Rationale

The files in `docs/` and the root Markdown files are not imported by the app and are not in
`public/`, so the site Netlify would build from a docs-only change is the one already live.
Comparing a preview against the whole pull request, not the last preview build, keeps the
preview honest at the cost of some builds; `CACHED_COMMIT_REF` on a pull request's first
preview is not the pull request's own base, so it is not trusted there. Failing towards a build
means a mistake costs minutes, never a stale site.

# Consequences

- A docs-only pull request gets no deploy preview; Netlify reports its build as skipped. That
  doesn't hold up merging: the ruleset requires only `checks / checks`, and the auto-merge
  workflow waits only for CI and Backend image (D-0077).
- A docs-only merge to `main` doesn't redeploy the site; the live deploy stays the last one
  built, which has the same app.
- A change to the ignore script, `netlify.toml` or anything outside the docs-only paths
  always builds.
- A file the app starts reading from `docs/` or the root Markdown would then be skipped
  wrongly: that change must move the file or replace this decision.

# Guidance for agents

- Never widen the docs-only paths to anything the build reads, serves or bundles. Narrowing is
  always safe.
- Keep the ignore script free of dependencies: it runs before `pnpm install`.
- When a docs-only pull request needs a preview anyway, that is a sign it isn't docs-only.
