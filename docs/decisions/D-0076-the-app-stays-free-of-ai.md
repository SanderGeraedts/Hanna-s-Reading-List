---
id: D-0076
title: "The app stays free of AI: no AI for series, page edges, quotes or back texts"
description: "Hanna's request to bring AI back for completing series, page edges, quotes and back texts (#183) is declined; D-0017 stands, and non-AI versions can be built as ordinary tasks if she wants them."
status: Accepted
date: 2026-11-24
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: [Q-002]
tags: [outside-service, money]
---

# Context

AI was removed from the app on 12 November 2026 (#117, D-0017). On 19 November Hanna asked in
#183 for completing series, page edges, quotes and back texts made with the help of AI. Bringing
it back needs a paid AI service's key on Netlify and costs money per use, billed to Sander
(G-0009). That was open question Q-002, with three options: stay free of AI, bring it back for
all four with a spending cap, or for back texts and series only.

# Decision

The app stays free of AI. D-0017 stands: no AI service, no AI key, no AI request anywhere.

# Rationale

#117 removed AI on purpose, and #183 brings no new reason beyond wanting it. No AI means no
monthly cost, no key to hold and no outside service to keep working.

# Consequences

- #183 is closed. What exists without AI stays: page edges from the cover or by hand, back texts
  from Open Library and *Find back text*, quotes she types herself.
- Non-AI versions of what she asked for (for example *Complete your series* from Open Library
  again, or a better *Find back text*) can be built as ordinary tasks when she asks for them.

# Guidance for agents

- Never add an AI SDK, an AI API call or an AI key, on either instance.
- On Hanna's instance, when she asks for AI: explain that Sander decided against it (D-0076) and
  offer the non-AI version. Asking again is a new question for Sander, not a reason to build it.
