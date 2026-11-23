---
id: D-0051
title: "One garden, two views: a flat drawn top-down garden on the phone and the cosy 3D style on the computer"
description: "The Garden tab shows the same garden in two ways — a flat drawn top-down garden in SVG on phones (and on any device that can't draw 3D), and the cosy 3D garden on computers — chosen by the device, not by a switch; both show the same plants, beds, items and visitors, both can be tended with a finger, a mouse and a keyboard, and the 3D view keeps to the den's budget (≤ 60 draw calls, ≤ 20,000 triangles)."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, look, performance]
---

# Context

Hanna already has a 3D shelf and a 3D den; she said plainly on 2026-11-23 that she does not want a
third 3D scene slowing her phone down, and asked for **a flat drawn top-down garden on the phone**
and **the cosy 3D style on the computer** — the same garden, two views. D-0033 §13 already keeps
creature scenes light on phones for the same reason.

# Decision

1. **One garden, two views of it.** The plants, beds, garden items, visitors and seasons are the
   same in both; only the drawing differs.
2. **The phone view is flat and drawn**, as inline SVG: a top-down garden seen from above, no
   WebGL, no textures, no canvas. It must stay far lighter than the 3D view.
3. **The computer view is the cosy 3D** of the shelf and the den: the same warm gold-on-lavender
   palette (D-0020), a low camera over the beds, simple built geometry, no loaded models.
4. **The device chooses, not a switch.** The flat view is shown on a phone (the same test the
   creatures use: 720 px or narrower, or a coarse pointer) and on any device that cannot draw 3D;
   the 3D view on everything else. There is no view switch to learn or to get stuck in.
5. **Both views can be tended** with a finger, a mouse and a keyboard, and both describe the
   garden to a screen reader as text.
6. **Budget.** The 3D garden keeps to the den's budget on a phone-grade setting: at most **60 draw
   calls and 20,000 triangles** for the fullest garden on screen, measured by a test like the den's
   (`denBudget.test.ts`), with plants beyond what fits drawn as the simplest shape. The flat view's
   cost is counted in SVG nodes and kept under a tenth of that.
7. **Reduce motion** stops every sway, drift and visitor in both views; the garden is then a still
   picture.

# Rationale

Her phone carries the shelf and the den already, and the garden is the view she will open most
often, from bed. A flat drawn garden is the cheapest thing that still looks made rather than
charted, and it is sharp at any size. Letting the device choose keeps one less thing to explain
(D-0014) and means her phone can never end up in the heavy view.

# Consequences

- Every garden feature has to be drawn twice; a new plant kind or item is not done until both
  views have it, and a test checks that the catalogue has a drawing in each.
- A computer without WebGL gets the flat view, which doubles as the error fallback.
- The 3D garden has a budget test that fails when a plant model grows too heavy.

# Guidance for agents

- Don't add a 3D garden to the phone, and don't add a view switch without asking Hanna.
- Keep the two views fed by the same derived garden; never compute anything in a view.
- A new plant kind, garden item or visitor needs a drawing in both views and a line in the tests.
