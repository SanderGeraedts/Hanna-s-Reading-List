# CLAUDE.md

@AGENTS.md
@node_modules/@sandergeraedts/harness/rules/AGENTS.md

## Claude Code specifics

- The team is in `.claude/agents/`: architect, ux-designer, developer, tester. Hand each
  task through them in that order.
- **Hanna's instance:** if your user-level instructions (`~/.claude/CLAUDE.md`) say this is
  Hanna's instance, read and follow [`docs/hanna-guardrails.md`](docs/hanna-guardrails.md)
  before doing anything else, and use the `feature-chat` skill for feature requests. Otherwise
  you are working with Sander and the guardrails do not apply.
- Keep project knowledge in `docs/decisions/` and `docs/tasks/`, not in auto-memory.
- Start larger pieces of work in a fresh session; anything the next session needs goes in
  the repository.
