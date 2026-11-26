---
id: D-0087
title: "Every page is measured for readability in every look, and the measuring script stays"
description: "scripts/measure-contrast.mjs walks every visible piece of text on every page in the lavender and midnight wallpapers and in night mode, at phone and computer size, works out the colour it is really drawn in and the colour really behind it, and flags anything under 4.5:1 (3:1 for big text and icons); what it found is fixed in the tokens and rules of styles.css and held there by colours.test.ts, and only a deliberately dimmed disabled control is exempt."
status: Accepted
date: 2026-11-26
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [colours, accessibility, pages, night, tooling]
---

# Context

On 24 November the text on the **shelf** was measured against what sits behind it and the faint
parts were fixed (T-0096). The **dashboard, Stats, Challenges, Calendar, Creatures and Garden**
pages were never measured — they were only looked at. Then night mode shipped (D-0085) and
changed the wallpaper behind every one of them, so from that night there were three looks to be
readable in, not one: the lavender wallpaper, the midnight wallpaper, and the dark pages after
dark.

Eyeballing does not find this. A card is translucent, the wallpaper behind it is pale in two of
the three looks, the header's haze fades out down its own height, and several things carry an
`opacity`. What is drawn is the end of a stack, and only the browser knows the whole stack.

Hanna was asleep and had said to go with the recommended answer.

# Decision

1. **The measurement is a script that stays in the repository**: `scripts/measure-contrast.mjs`
   (`pnpm run measure:contrast`), beside `measure-shelf.mjs` and `measure-load.mjs` and in their
   house style. It seeds a demo shelf in the browser's own storage and never signs in (G-0019).

2. **It measures what is drawn, not what the CSS says.** For every visible piece of text it
   composites the whole stack: each ancestor's background colour and background layers, a
   gradient read **at the point the text sits** (the header's haze is nearly solid at the title
   and gone at its bottom edge), with every `opacity` on the way applied the way the browser
   applies it. The grey hint inside an empty box counts as text. Behind the shelf there is no
   page colour at all but the 3D room, so **the darkest wood, `rgb(43, 29, 18)`**, stands in for
   it: the worst thing the room can put behind a word.

3. **The bar is WCAG AA**: 4.5:1 for text, 3:1 for text of 24px or more, for bold text of 19px
   or more, and for icons and outlines (an empty star still says "out of five").

4. **The sweep is the whole app in all three looks**: the shelf and `?view=` dashboard, stats,
   challenges, calendar, creatures and garden, in the lavender wallpaper by day, the midnight
   wallpaper by day and night mode, at 390×844 and 1440×900. It runs against `pnpm run dev`
   (`pnpm run preview` does not serve this app: it answers 500), and takes the address from
   `URL`, because the dev server picks another port when 3000 is taken.

5. **What falls short is fixed in the token or the rule**, in `src/styles.css`, never by
   sprinkling exceptions, and never by redesigning: this is about contrast, not about a new look.

6. **Two things are exempt, by name:**
   - a **disabled control** that is deliberately dimmed to say "you can't do this"
     (`.shelf-pan .btn[aria-disabled='true']`, the garden's "Seed tray · in spring" chips);
   - text that is kept readable by a **halo** instead of by its colour — the shelf's filter names
     and its empty line, which T-0096 gave a light or dark text-shadow because they stand
     straight on the room. WCAG cannot count a shadow, so the script still reports them; the
     script marks them `[halo]` and `[disabled]` so they are not "fixed" again.

7. **Whatever is fixed gets a case in `src/lib/colours.test.ts`**, which reads the tokens and the
   rules out of `styles.css`, so none of it can drift back unnoticed.

# Rationale

A script that can be re-run is worth more than a one-off audit: the next wallpaper, the next page
or the next token change is one command away from an answer. Keeping it in the house style of the
two measuring scripts already there means nobody has to learn a new tool.

Reading a gradient where the text actually sits, rather than at its worst stop, is what makes the
output trustworthy: at the worst stop the header's title appears to stand on bare wood, which it
never does, and a report full of false alarms gets ignored.

Naming the exemptions in the decision, instead of silencing them in the script, keeps them
visible: if the garden's "in spring" chips ever become something Hanna has to read, the number is
already on the page.

# Consequences

- `--surface` goes from 0.88 to 0.96 opaque. Cards are still translucent over the 3D room, but a
  pale wallpaper behind a page hardly lightens them any more, which lifts every quieter thing on
  a card at once (a calendar day on its gold wash was 3.9:1 on the lavender paper).
- Hard-coded faint colours in rules — an empty star, an unlit pepper, the browser's own grey
  placeholder — become colours that were chosen rather than inherited.
- A rule that puts a control **straight on the wallpaper** instead of on a card (the garden's year
  and bed switches, its search box) has to give it the card's own fill: the app's buttons and
  boxes are built for a dark backdrop.
- Rule order matters: `.shelf-cases` had quietly lost its white pill to `.segmented`, which comes
  later in the file with the same weight. Selectors that must win now say so (`.segmented.shelf-cases`).
- The sweep takes about twenty minutes against the dev server; it is a thing you run when colours
  change, not on every commit. `colours.test.ts` is what runs every time.

# Guidance for agents

- **Measure, don't eyeball**, whenever a colour, a wallpaper, a look or a token changes:
  `pnpm run dev`, then `URL=http://localhost:<port> pnpm run measure:contrast`.
- **Fix the token or the rule.** If a fix needs a per-element exception, ask first whether the
  rule is wrong.
- **Never "fix" a disabled control or a halo'd piece of text** — they are marked in the output on
  purpose. Say so in the report instead.
- **Add the case to `colours.test.ts`** in the same change, for all three looks.
- The script never signs in and never reads a real shelf; keep it that way (G-0019).
