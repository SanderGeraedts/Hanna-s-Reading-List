---
id: D-0077
title: "The harness's ruleset guards main, with no bypass; pull requests touching shelf saving or the NAS are held for Sander"
description: "The ruleset 'main' (code-owner review, admin bypass) is replaced by the harness's ruleset; the auto-merge workflow holds pull requests that touch src/lib/shelfMerge.ts, src/server/shelf.ts or deploy/nas/ with the waits-for-engineer label, and CODEOWNERS only requests reviews."
status: Accepted
date: 2026-11-24
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: [Q-003]
tags: [access, process]
---

# Context

The default branch had one ruleset, `main`: a pull request with 0 approvals, a code-owner
review for the paths in `.github/CODEOWNERS`, the CI check, no deletion or force-push, and a
bypass for repository admins. The harness asks for a ruleset with no bypass actors (G-0029) and
for green, tester-passed pull requests to merge themselves (G-0011). The auto-merge workflow
merges with `GITHUB_TOKEN`, which can't give a code-owner review, so under `main` a pull request
touching a code-owner path never merged itself. That was open question Q-003.

# Decision

- The `main` ruleset is deleted. The harness's ruleset (`harness protect "checks / checks"`)
  guards the default branch: a pull request, 0 approvals, the check `checks / checks`, no
  deletion, no force-push, **no bypass actors**.
- The auto-merge workflow's `hold-paths` holds every pull request that touches
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or anything in `deploy/nas/`. It gets the label
  `waits-for-engineer` instead of being merged, and Sander merges it.
- `.github/CODEOWNERS` stays, but only to request Sander's review; GitHub no longer requires it.
- On Hanna's instance, a pull request that needs Sander stays a draft labelled `needs-sander`
  (`docs/hanna-guardrails.md`); a held pull request is the same thing seen from the pipeline.

# Rationale

It keeps the one guard that matters most: nothing that changes how her shelf is saved or what
runs on the NAS goes live without Sander. Everything else flows through the pipeline without a
bypass actor, as the harness intends.

# Consequences

- Workflow, Netlify and guardrail changes merge themselves once green and passed, like any other
  pull request. The draft gate, the tester and the hourly NAS snapshots are the guard for those.
- Sander can no longer push past the checks as an admin; a red pull request waits like anyone
  else's.
- A held pull request waits until Sander merges it; `pnpm exec harness waiting` lists it.

# Guidance for agents

- Keep `hold-paths` in `.github/workflows/auto-merge.yml` covering the two shelf-saving files and
  `deploy/nas/`. Widening it is fine; narrowing it needs Sander.
- Never add a bypass actor to the ruleset.
- Don't mark a `needs-sander` draft ready on Hanna's instance; on a held pull request, don't try
  to merge around the hold.
