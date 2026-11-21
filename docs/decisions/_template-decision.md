---
id: D-NNNN
title: "The decision, as a statement"
description: "One sentence saying what was decided, for the index."
status: Accepted            # Accepted | Replaced
date: YYYY-MM-DD
decided_by: engineer        # engineer | requester | the agent role, e.g. architect
overrules: []               # global decisions this project sets aside, e.g. [G-0017]
replaces: []
replaced_by: []             # what replaced this one; may be a global decision, e.g. [G-0016]
resolves: []                # questions this answers, e.g. [Q-001]
tags: []
---

# Context

What forced a choice: the problem, the constraint, what was considered. When this overrules
a global decision: what that decision says and why it doesn't fit this project.

# Decision

What we will do, stated plainly enough to check against the code.

# Rationale

Why this option over the others.

# Consequences

What this makes easier, harder, or now required elsewhere.

# Guidance for agents

- What to preserve.
- What to avoid.
- When to stop and ask.
