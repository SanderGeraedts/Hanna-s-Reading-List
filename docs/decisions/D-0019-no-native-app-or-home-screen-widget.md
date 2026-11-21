---
id: D-0019
title: "No native app, so no home-screen widget"
description: "Hanna's request for a scrollable phone widget of the shelf is not planned: a real home-screen widget needs a native app, and iPhone widgets can't scroll; the app stays a web app."
status: Accepted
date: 2026-11-07
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [not-planned, platform]
---

# Context

#61 (2026-11-07): "Is it possible to get a scrollable widget for my phone from the shelf?" The
issue was closed the same day without a comment; the roadmap the Engineer kept (#21) lists it under
*Not planned*: "a real home-screen widget needs a native app (and iPhone widgets can't scroll)."

Global decisions: this matches G-0017 and G-0020, which make the front end a web app that can be
installed from the browser; this project's stack is in D-0002. No overrule.

# Decision

- The app stays a web app; there is **no native app and no home-screen widget**.

# Rationale

A home-screen widget needs a native app, which this project doesn't have and isn't going to
build for this, and on an iPhone a widget still couldn't scroll as asked.

# Consequences

- What can be done on the web (a home-screen shortcut, web push as asked in Q-001) is the way to be
  closer to her phone.

# Guidance for agents

- Don't start a native app, wrapper or widget; a request for one is a question for the Engineer.
