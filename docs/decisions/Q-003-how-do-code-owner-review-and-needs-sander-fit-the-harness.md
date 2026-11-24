---
id: Q-003
title: "Should the code-owner review on main (with the admin bypass) give way to the harness's ruleset and auto-merge, and how is the guard on shelf saving kept?"
description: "The existing ruleset 'main' requires a code-owner review for the paths in .github/CODEOWNERS and lets admins bypass it, while G-0029 wants a ruleset with 0 approvals and no bypass and G-0011 wants green, tester-passed pull requests to merge themselves; the code-owner rule is a deliberate guard on Hanna's data and on the guardrails."
status: Resolved
raised_on: 2026-11-21
raised_by: architect
issue: "https://github.com/SanderGeraedts/Hanna-s-Reading-List/issues/190"
blocks: []
resolved_by: [D-0077]
tags: [access, process]
---

# Question

The default branch has one ruleset today, named `main`:

- a pull request is required with 0 approvals, **but a code-owner review is required** for the
  paths in `.github/CODEOWNERS`: `deploy/nas/`, `.github/`, `netlify/`, `netlify.toml`,
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, `CLAUDE.md`, `.claude/` and
  `docs/hanna-guardrails.md`. The only code owner is `SanderGeraedts`;
- the check `test` is required; no deletion, no force-push;
- **repository admins may always bypass it.**

`docs/hanna-guardrails.md` builds on that: on Hanna's instance anything that needs Sander is a
draft pull request labelled `needs-sander`, and Hanna merges the other pull requests herself
once CI is green and she has looked at the preview.

The harness asks for something else:

- **G-0029:** a ruleset with a pull request, 0 approvals, the CI check required, no deletion,
  no force-push and **no bypass actors**, which `harness protect` creates as a second ruleset
  named "harness: default branch".
- **G-0011:** a green pull request that isn't a draft merges itself through the auto-merge
  workflow, which merges with `GITHUB_TOKEN`. That token can't give a code-owner review, so
  **a pull request touching a code-owner path never merges itself;** it needs Sander's review
  or an admin's bypass.
- The harness's own guard for this is the auto-merge workflow's `hold-paths`: a pull request
  touching a matching path is labelled `waits-for-engineer` instead of merged.

Changing the ruleset and CODEOWNERS changes who can get what into production, and the guard
exists because Hanna's shelf can't be rebuilt (#96), so it is the Engineer's.

T-0001 does what doesn't depend on the answer: it adds the harness's ruleset with
`harness protect "checks / checks"`, changes only the required check in `main` from `test` to
`checks / checks`, adds the harness's files (`AGENTS.md`, `.harness/`, `.githooks/`) to
`CODEOWNERS`, and otherwise leaves `main`, `CODEOWNERS` and the guardrails as they are.

# Options

1. **Keep `main` as it is** (code-owner review, admin bypass) next to the harness's ruleset.
   The guard stays exactly as now. Every pull request that touches a code-owner path (every
   backend change, every workflow change, the adoption itself) waits for Sander's review or an
   admin's bypass; auto-merge only merges the rest. This overrules G-0029 (bypass actors) and
   G-0011 in part, and needs a project decision saying so.
2. **Replace `main` with the harness's ruleset, and keep the guard through `hold-paths`.** Delete
   the `main` ruleset; set `hold-paths` in `auto-merge.yml` to the paths `CODEOWNERS` lists
   (or a shorter list: `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, `deploy/nas/`); keep
   `CODEOWNERS` for review requests only. Held pull requests are labelled
   `waits-for-engineer` and Sander merges them. No bypass anywhere; follows G-0029 and G-0011.
   The guardrails' `needs-sander` label maps onto `waits-for-engineer`.
3. **Replace `main` with the harness's ruleset and no guarded paths.** Every green pull request
   the tester has passed merges itself, backend included; the tester and the draft gate are the
   guard, and hourly snapshots plus shelf history (`library_versions`) are the way back. Hanna's
   instance follows the harness pipeline for everything.

**Recommendation: option 2.** It keeps the one guard that matters most (nothing that changes how
the shelf is saved or what runs on the NAS goes live without Sander) without a bypass actor,
and everything else flows through the pipeline. If Sander prefers to be out of the loop for
backend changes now that snapshots run hourly, option 3, keeping only the two shelf-saving files
in `hold-paths`.

Whatever the answer: the guardrails document and the `feature-chat` skill are updated in a
follow-up task to match (merging by Hanna herself, `needs-sander` versus `waits-for-engineer`).

# Answer

Resolved on 2026-11-24 by the Engineer: **option 2.** The `main` ruleset is replaced by the harness's ruleset with no bypass, and `hold-paths` holds pull requests touching `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `deploy/nas/` for Sander. Recorded in [D-0077](D-0077-the-harness-ruleset-guards-main-and-hold-paths-guard-the-shelf.md).
