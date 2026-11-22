---
id: T-0029
title: "Hatch her first book creature from a welcome egg, earn cookies by reading, and let it grow, with a Creatures tab and a dashboard block"
description: "CR1 of the book creatures (D-0033): cookies worked out from the reading log, a welcome egg (no starting cookies) from which she chooses her first creature among the five commons, with a name, feeding and growing by itself on reading days, baby/young/grown-up stages, a missing-you look; a Creatures tab (home) and a dashboard block; hatches and level-ups in Waiting for you; her choices kept on the device and sent to the account once T-0028 is live (D-0034)."
status: Doing
size: full
depends_on: [T-0027]
decisions: [D-0002, D-0003, D-0008, D-0013, D-0014, D-0020, D-0022, D-0025, D-0030, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

The first playable step of the book creatures ([brief](../book-creatures-brief.md), D-0033). After
this Hanna has one creature that grows as she reads.

1. **Cookies** (`src/lib/creatures/cookies.ts`), worked out from her books from `CREATURES_START`
   (the day this goes live, a constant): 1 🍪 per 5 minutes read or listened, +10 per finished book,
   sleep reads half, exactly as D-0033 §2. The balance = earned − spent (spent comes from her
   choices); it starts at 0 on the start day. Below zero after a fixed past day: shown as is,
   feeding waits.
2. **Welcome egg**: on the start day a common egg waits in Waiting for you, with **no starting
   cookies** (D-0033 §3). Tapping **Hatch** opens, in the Creatures tab (not a pop-up), the five
   commons to **choose** from (house cat, red fox, capybara, red squirrel, Adélie penguin), each
   shown with its name; she picks one, the egg cracks (short, on her tap) and her first creature
   appears with a suggested cute name she can keep or change; she can rename later. Whether it is
   shiny follows D-0033 §7. Her pick is saved as the `hatch` choice.
3. **Growing**: **Feed** gives the creature cookies (the food bowl); each feed gives growth; on days
   she reads it also grows a little by itself, skipped days pause (D-0033 §10). Level, and visible
   stages baby → young → grown-up (D-0033 §11) made from Fable's base model by scaling its parts as
   the model file says (T-0027): no new Fable work. A level-up waits in Waiting for you.
4. **Missing you**: after 3 days without reading the creature looks a bit sad and sleepy (droopy
   eyes, slower idle); the first reading day it cheers up. Never hungry, never lost.
5. **Creatures tab**: a new page tab next to Calendar (`?view=creatures`), showing the creature in
   its home (a simple den), its name, level, stage and the cookie balance, with Feed and Rename.
   Album, shop and tricks come later; leave room for them.
6. **Dashboard block "Creatures"**: the current creature (still, small), its food bowl with the
   balance and a Feed button, and the next unlock ("Next egg: 7-day streak"; until T-0030 only the
   next level). Open › goes to the tab. It can be starred, moved and hidden like every block.
7. **Her choices** (hatch, name, feed) are events in a choices log (D-0034): kept in localStorage,
   and sent to the account through a new server function `src/server/creatures.ts` when the server
   keeps them (T-0028). Until then, or if the server answers 404, the device keeps its own log and
   everything works.

# Done when

1. `pnpm test` passes and includes tests for: cookies from a reading log (pages, listen-only
   minutes, a book without length as 280 pages, a sleep read at half, a finished-book treat, nothing
   before the start, fixing a past day lowers the total, rounding on the total); the welcome egg
   (one common egg on the start day, no cookies; balance 0 before any reading); the first hatch
   (only the five commons can be picked; the picked one is the creature on every device; shiny or
   not is the same for the same egg every time); growth by itself only on reading days; stages by level; missing-you after 3 days without
   reading and gone on the next reading day; the choices log merge (union by id, newest setting per
   key, nothing doubled) and that the app keeps working when the server answers 404 (like
   `favouritesSync.test.ts`).
2. On `pnpm run dev` with demo data: the welcome egg waits in Waiting for you; Hatch shows the five
   commons to pick from, and the picked one hatches with a suggested name; renaming works and stays after a reload; Feed lowers the balance
   and raises growth; the dashboard block and the Creatures tab show the same creature, level and
   balance; at 390 × 844 and 1280 × 800, both wallpapers. Screenshots in
   `docs/tasks/T-0029-screens/`.
3. On the phone size the creature only makes small idle movements, and rendering stops when the tab
   isn't visible or the book panel is over it (frame loop paused; checked by a test or the
   performance panel, noted in *Test*).
4. `pnpm run build` and `pnpm exec harness check` pass.
5. **Hanna** confirms on the live site that her first creature hatched and grows when she reads.

Added by the UX designer (Design below; the tester checks each on `pnpm run dev`, 390 × 844 and
1280 × 800, lavender and midnight):

6. **Welcome and hatch.** Before the hatch, Waiting for you shows "A welcome egg is waiting for
   you!" with **Hatch**, and nothing in it opens by itself. Hatch goes to the Creatures tab at
   *Choose your first creature*: five creatures, each a radio with its name, none picked at first,
   **Hatch** disabled until one is picked; arrow keys move between them. Hatching shows the crack,
   then *Say hello to your …!* with a suggested name in the field, **🎲 Another name** gives a
   different name from the same species' list, an empty name shows "Give your creature a name."
   and isn't saved. **Not yet** goes back to the egg without saving anything. After the hatch the
   egg line is gone from Waiting for you on the next visit and the hatch can't be repeated.
7. **The tab and the block agree.** The Creatures tab and the dashboard block show the same name,
   level, stage word, growth bar and 🍪 balance, before and after a Feed, and after a reload.
   **Feed** gives 5 🍪 (or what's left if fewer), its label says how many, and it is disabled at
   0 or below; a negative balance shows as "🍪 −4". The block can be starred, moved and hidden like
   every block, and a layout saved before this task still loads with the block added.
8. **Earning shows.** The tab's *This week* list shows a line per reading day with its minutes,
   🌙 for sleep-read minutes, 📗 per finished book and the day's cookies; the day lines add up
   exactly to the week total, and a day with only a sleep read gives half what the same minutes give
   otherwise.
9. **Growing.** The stage word follows the level (Baby 1–3, Young 4–9, Grown-up 10 and up, ⭐ after
   the name from 11); the 3D creature changes proportions at 4 and 10. A level-up shows one line in
   Waiting for you ("Biscuit reached level 4!" or, at a new stage, "Biscuit is young now!" / "Biscuit
   is all grown up!") with **Nice!** and **Visit**, only the newest one, gone on this device after
   either button.
10. **Moods.** With the last reading day 3 or more days ago the creature looks sad and sleepy (eyes
    half shut, head down) and the tab and block say "Biscuit misses you"; on the day she reads again
    it says "Biscuit is so happy you're back!" and looks normal. From 22:30 to 06:00 (device time) it
    looks sleepy and says "Biscuit is sleepy". Nothing about a mood ever shows in Waiting for you.
11. **Keyboard and screen reader.** Everything above is reachable with Tab, Enter, Space, arrows
    and Escape, with a visible focus ring; every 3D canvas is hidden from the screen reader and has a
    text description next to it; Feed, a level-up and the hatch are announced in a polite live region
    with the wording in Design §10; focus lands where Design §10 says after each step.
12. **Movement.** At 390 px the creature only breathes and blinks (and moves on a tap: the hatch,
    a feed); with *reduce motion* on, it doesn't move at all and the crack is a quick fade. The
    dashboard block's creature never moves. Rendering stops when the page is hidden, another tab is
    open or the book panel is over it.

# Notes

- **Order:** after the harness v0.9.0 upgrade and T-0026; before the better world map. T-0028 may be
  merged before or after this; this task doesn't wait for it.
- **Models:** use the base models from T-0027 (`src/components/creatures/models/`). Stages and
  expressions (sad/sleepy eyes) are built here from those designs on the normal model; **don't start
  a Fable agent** (D-0033 §14). If a creature's base look itself must change, that goes back to a
  Fable agent for that creature, as T-0027 describes.
- **Minutes per day:** `readingLog[day]` is the share of the book read that day; × the book's length
  in minutes (`minutes` for listen-only, `listenOnly` in `src/lib/listening.ts`; otherwise pages ×
  1.5). Finishes: `allFinishes` in `src/lib/stats.ts`. Sleep reads: `sleepReadIds` in
  `src/lib/sleepSeries.ts`. Streak (for later eggs): `readingStreak` in `src/lib/insights.ts`.
- **Waiting for you:** `src/components/WaitingCard.tsx` (D-0013): add the egg and level-up lines.
- **Page tabs:** `src/routes/index.tsx` (the `view` search param and the tab list near the
  bottom). Dashboard blocks: `src/lib/dashboardLayout.ts` (a new block id; saved layouts and
  favourites must still load).
- **Account sync:** follow `src/server/favourites.ts` / `favouritesStore.ts` and
  `src/lib/favourites.ts`: a read with `fields=id,creatures`, a post to the route, `kept: false` on
  404. Never PATCH the field (D-0034). Nothing in `src/server/shelf.ts`, `src/lib/shelfMerge.ts` or
  `deploy/nas/` changes in this task (code owners).
- **No hint texts** (D-0014); colours from the design system on both wallpapers (D-0020, D-0022).
- Every number (rates, caps, levels) in one file, `src/lib/creatures/numbers.ts`.

# Design

UX designer, 2026-11-23 (night; nothing asked, the recommended option taken, real questions at the
end under *Questions for Hanna in the morning*). Built on T-0027's models and its Design §2 (stage
factors), §4 (expressions by squashing `part:eyes`) and §9 (lights, den view). English, British
spelling, as the rest of the app. The example creature below is a house cat called Biscuit.

Scope: one creature, cookies, feeding, growing, moods, the tab, the block, two Waiting lines. Not
here (leave room, but show **no** empty placeholders or "coming soon"): album, shop, more eggs,
several pets, tricks, outfits, den life, the shelf creature.

## 1. The numbers this design assumes

They go in `src/lib/creatures/numbers.ts` (tunable without a new decision, D-0033 §6):

| What | Value | Why |
|---|---|---|
| Cookies | D-0033 §2 exactly (1 🍪 / 5 min, +10 per finish, sleep reads half) | decided |
| One feed | **5 🍪**, or what's left if fewer | a "bowl"; 2 taps a day at 45 min |
| Growth per 🍪 fed | 1 | easy to read: "12 🍪 to go" is true |
| Growth by itself | **+3 on each reading day** (from the hatch day on) | "a little", D-0033 §10 |
| Level n → n+1 | **20 + 5 × (n − 1)**, at most 80 | early levels quick, later slower |
| Stages | **Baby 1–3, Young 4–9, Grown-up 10+**; ⭐ by the name from 11 | D-0033 §11 |

At 45 minutes a day (9 🍪 + 3) that is young after about 6 days and grown-up after about a month.
Growth is worked out like cookies (never stored): fed cookies come from her `feed` choices, growth
by itself from the reading log from the hatch day. Level 1 at the hatch, growth 0.

## 2. The page tab

A fifth tab after Calendar: icon **🐾**, label **Creatures**, `?view=creatures`. On a phone just
the icon, like the others. The five tabs, the ☰ menu and the account button must fit on one line at
360 px; if they don't, narrow the tab padding down to the 44 px tap size, never below.

## 3. The welcome flow (in the tab, never a pop-up)

**3a. The egg (before the hatch).** From `CREATURES_START` on, until she hatches it:

- **Waiting for you**: a line with 🥚, **"A welcome egg is waiting for you!"** and one button
  **Hatch** (primary). No "Later": it stays until hatched, like a book waiting for its rating. It
  is the first line in the block (above the wrap-up).
- **The tab**: the den (§5) with the egg sitting on the cushion instead of a creature, and under it
  the heading **"A welcome egg"** and **Hatch** (primary). The cookie pill shows what she has earned
  so far ("🍪 9"); no Feed button yet.
- **The dashboard block**: the egg (still) with **"A welcome egg"** and **Hatch**.
- **The egg's look** (3D, built here from primitives like T-0027 §3): a sphere scaled [1, 1.28, 1],
  0.55 model units tall, paper cream `#f3e9d8`, matte, with 6 small gold `#d9a85b` spots (flattened
  spheres) scattered on the upper half. It sits a little tilted (6°) on the cushion. On a computer
  it rocks gently every ~6 s (±4°, 0.8 s); on a phone it holds still.

Every Hatch button (Waiting line, block, tab) goes to the tab and opens step 3b.

**3b. Choose your first creature.** Replaces the den card's content (same card, same place):

- Heading **"Choose your first creature"** (`h2`, focus moves here).
- **One** 3D canvas (not five: canvas limit, T-0027 §9) behind a grid of five tiles in species
  order: House cat, Red fox, Capybara, Eurasian red squirrel, Adélie penguin, each the grown-up in
  its normal palette, ¾ turned, with its name under it in normal text. 1280: one row of five tiles
  (~150 px). 390: three on the first row, two centred on the second (~110 px).
- The tiles are a **radio group** (label "Choose your first creature"); none picked at first. The
  picked tile gets the gold outline and gold wash (`--accent-line`, `--accent-soft`) and its creature
  turns slowly to face her (computer) or does one small hop (phone).
- Under the grid: **"Hatch {name}"** (primary, e.g. "Hatch the house cat"; disabled with only
  "Hatch" until one is picked) and **Not yet** (secondary: back to 3a, nothing saved).
- Display names in the button use "the" + lower-case name: the house cat, the red fox, the capybara,
  the red squirrel, the Adélie penguin.

**3c. The crack** (on her tap only, also on a phone): the grid fades, the egg appears big in the
den, wobbles three times (0.9 s), splits into two halves that tip away (0.4 s) and the baby pops up
(scale 0.6 → 1, 0.3 s, a small overshoot). The `hatch` choice is saved **when she taps Hatch**,
before the animation, so a reload mid-crack never loses it. If the egg id comes out shiny (D-0033
§7), the baby is built with its shiny palette and the name step shows "✨ A shiny one!" (the gold
sparkle is T-0030's). *Reduce motion*: no wobble or pop, a 200 ms cross-fade from egg to baby.

**3d. Say hello.** Under the den, replacing the egg heading:

- Heading **"Say hello to your {species}!"** (focus moves here), e.g. "Say hello to your house
  cat!"; for a shiny a line under it: **"✨ A shiny one!"**.
- A text field labelled **Name**, filled with the suggested name, all of it selected.
- **🎲 Another name** (secondary): the next name from the species' list (§9), round and round.
- **"That's the one!"** (primary): saves the name (a `name` choice only when it differs from the
  first suggestion; the first suggestion is the default without a choice) and shows the home (§5).
- Rules: trimmed, 1 to 20 characters (the field stops at 20). Empty → the field's error **"Give
  your creature a name."**, nothing saved. Any letters and emoji are fine.
- If she leaves here without tapping, the creature keeps the first suggested name.

## 4. Cookies and how earning shows

- **The cookie pill**: "🍪 23" in a gold-outlined pill (`--accent-line`, cream text, `--fs-large`),
  in the tab's header next to the h1 and in the block's food bowl. Below zero after a fix to a past
  day: "🍪 −4" (a real minus), same style, Feed disabled, no explanation (D-0014).
- **Next to the pill**: "+9 today" in `--muted` / `--header-muted`, only when today earned
  something. That is the only live sign of earning: no toasts, no counting-up animation.
- **This week** (in the tab, §5): a `<details>` card, open on a computer, closed on a phone. Summary:
  **"This week · +34 🍪"** (the last 7 days including today). Inside, one line per reading day,
  newest first, days without reading left out:
  - `Today` / `Yesterday` / `Mon 23 Nov`, then what was read: **"45 min"**, **"🌙 20 min"** for
    sleep-read minutes (shown apart so half is visible without a hint), **"📗 The Hobbit"** per
    finished book; then right-aligned **"+21 🍪"**.
  - Minutes rounded to whole minutes, "1 h 05 min" from 60 on.
  - The day's cookies are the difference of the running total (earned through that day minus
    earned through the day before), so the lines add up exactly to the week total even though the
    rounding is on the total (D-0033 §2).
  - No reading this week: the summary says **"This week · nothing yet"** and the list is empty
    (an empty-block message, allowed by D-0014).
- Before the start day nothing earns and the tab shows nothing of it.

## 5. The Creatures tab (home)

Same page frame as Calendar and Challenges: the wallpaper, an `h1` **Creatures** on the wallpaper
in `--header-ink` with the cookie pill and "+9 today" at its right (they wrap under the h1 at
390). Below, cards on `--surface` (`dash-card` look), so the wallpaper only shows around them;
both wallpapers need nothing else.

**1280 × 800**: a grid with the den card left (about 62 %, canvas 16:10, ~700 × 440) and a right
column with the **creature card** on top and **This week** below. Later tasks add cards (album,
shop) under this grid; nothing reserved now.

**390 × 844**: one column, 16 px side gutter: den card (canvas full card width × 300 px), creature
card, This week (closed).

**The den** (3D, inside the den card, its own background): a cosy corner seen about 10° from above
and ¾ turned (T-0027 §9): a warm back wall `#3a2c24` fading into a wooden floor `#5a3f2c`, a round
rug in muted plum `#6e4f8f`, a round floor cushion in gold `#d9a85b` (matte) where the creature
sits, and a small wooden **food bowl** beside it holding a little pile of 3D cookies (`#c98a4b`
discs): 0 cookies at a balance of 0 or less, then one cookie per 5 🍪 up to 5. Lights as T-0027 §9
(warm hemisphere, ambient, warm key from the top left, soft back light). Size by stage (the stage
factors of T-0027 §2 are built in by `makeCreature`): the grown-up fills about 60 % of the canvas
height, young about 46 %, baby about 33 %, always standing on the cushion's centre. Phone: quality
`low`, no shadow maps (a soft dark disc under the cushion fakes the shadow), dpr up to 1.5.
Computer: `high`, shadows, dpr up to 2. The canvas is `aria-hidden`; a visually hidden line next to
it describes it (§10).

**The creature card**, top to bottom:

1. **Name** in the serif heading size (`--fs-heading`), with ⭐ after it from level 11 and "✨"
   after a shiny's name; long names wrap, never cut off in the tab. Beside it **Rename** (small
   secondary button, ✏️ icon + word).
2. **"Level 3 · Baby"** in `--fs-body`, then the species in `--muted`: "House cat".
3. **The growth bar**: a 10 px pill bar, track `--surface-sunken`, fill `--accent`; under it at the
   right "18 / 30" in `--fs-small` `--muted`. It fills smoothly (300 ms) after a feed; on a level-up
   it fills, empties and goes on (no reduce-motion animation: it just jumps).
4. **Next**: **"Next: level 4 · 12 🍪 to go"**; when the next level starts a stage: **"Next: young at
   level 4 · 12 🍪 to go"** / **"Next: grown-up at level 10 · 40 🍪 to go"**. "🍪 to go" is the
   growth still needed (1 🍪 = 1 growth).
5. **The mood line** (§7), only when there is one, in `--fs-body` with its emoji.
6. **The food bowl**: the cookie pill and **"Feed 5 🍪"** (primary; "Feed 3 🍪" when 3 are left;
   disabled "Feed 5 🍪" at 0 or below).

**Rename**: the name turns into the Name field (current name selected) with **Save** (primary) and
**Cancel**; Enter saves, Escape cancels, the same empty-name error as §3d. After either, focus goes
back to Rename. Saved as a `name` choice.

**Feeding** (in scope in CR1: it is how she grows it). One tap = one feed of 5 🍪 (or the rest).
On the tap: a 🍪 hops from the button toward the den and fades (CSS, 500 ms), one cookie disappears
from the 3D bowl, the creature squashes its eyes happy (^ ^, `part:eyes` scale y 0.35, 0.8 s) and
bobs once; the balance and the bar update at once. Fast taps each count; the developer may combine
taps within 2 s into one `feed` event with the total, to keep the log small (D-0034). Feeding never
asks a confirm. *Reduce motion*: no hop, no bob, the eyes still blink happy.

**Empty, loading and error states**

- Loading the 3D: the den card shows its own background colour (`#3a2c24`) at the canvas size, no
  spinner; the creature card is there at once (it's all worked out from the books).
- No WebGL or the canvas fails: the den card is left out; the creature card and This week stay.
- Before `CREATURES_START` (only on a test or a wrong device clock): the tab shows the h1 and one
  empty-state line **"Your creatures arrive soon."**; the block hides itself.
- Offline, not signed in, or the server answers 404 for choices: no difference anywhere (D-0034);
  no sync message of its own.

## 6. Growing (stages and levels)

- Stages are visible in the 3D only through the T-0027 §2 factors (big head, short limbs as a
  baby). No new models, no other colours.
- The level word and number change in the card, the block and Waiting for you. Beyond level 10 the
  number keeps going ("Level 14 · Grown-up ⭐").
- A level-up on her tap (Feed): the bar fills to the end, the creature does a slightly bigger happy
  bob (both phone and computer: it's on a tap), and the live region announces it (§10). A level-up
  from growth by itself happens while she isn't looking; she sees it in Waiting for you.
- Several levels at once (a long reading day): the bar jumps to the right place, one announcement
  with the new level.

## 7. Moods

Computed from her reading log and the device clock; a mood is never saved and never shows in
Waiting for you (no guilt notifications). One mood at a time, first match wins:

| Mood | When | Look | Line (tab and block) |
|---|---|---|---|
| **Missing you** | last reading day is 3 or more days before today (or no reading day since the hatch, 3+ days after it) | eyes half shut (`part:eyes` scale y 0.5), head tipped down 8°, breathing slower (6 s) | **"💤 Biscuit misses you"** |
| **Sleepy** | 22:30 to 06:00 on the device | eyes almost shut (scale y 0.2), head tilted 6° sideways, breathing slower (6 s) | **"🌙 Biscuit is sleepy"** |
| **Back** | today is a reading day and the reading day before it was 3 or more days earlier | normal look, one happy squint when the tab opens | **"💛 Biscuit is so happy you're back!"** |
| (normal) | otherwise | normal | no line |

"Missing you" wins over "Sleepy" at night (it already looks sleepy). Moods never change cookies,
levels or anything she has.

## 8. The dashboard block "Creatures"

Block id `creatures`, title **Creatures**, with the usual block chrome (☆ star, drag, hide, and
**Open ›** to `?view=creatures`). Default place: section **Today**, right column, right after
**Monthly challenge**; saved layouts get it where it is by default, as every new block.

Inside, a row: a small still picture of the creature on the left (96 × 96 at 390, 120 × 120 at 1280,
framed to fill its tile whatever the stage, ¾ turned, on a `--surface-sunken` round tile; the den is
not drawn here) and on the right:

1. **Name** (bold, one line, ellipsis when long) and **"Level 3 · Baby"** under it.
2. The **growth bar** (as in the tab, without the numbers).
3. **Next**: "Next: level 4 · 12 🍪 to go" (§5.4). Until T-0030 this is always the next level.
4. The mood line, when there is one.
5. The **food bowl**: the cookie pill and **"Feed 5 🍪"** (as in the tab; feeding from here does
   the same thing, minus the 3D reaction).

Before the hatch: the egg instead of the creature, **"A welcome egg"** and **Hatch**. The block
picture is rendered once (`frameloop="demand"`, one frame) and again only when the creature, stage,
mood or palette changes: it never moves.

## 9. Suggested names

Per species, a short list in `numbers.ts` (or next to it); the first suggestion is picked by a seeded
hash of the egg id over the list, so every device suggests the same name. 🎲 steps through the list
from there.

- House cat: Biscuit, Mochi, Pudding, Marmalade, Tofu, Whiskers
- Red fox: Maple, Ember, Clementine, Rusty, Pumpkin, Ginger
- Capybara: Pebble, Dumpling, Bean, Potato, Coco, Waffle
- Eurasian red squirrel: Hazel, Nutmeg, Acorn, Conker, Cinnamon, Pip
- Adélie penguin: Waddles, Pepper, Oreo, Puffin, Button, Domino

## 10. Keyboard and screen reader

- **Canvases** are always `aria-hidden="true"` and out of the tab order. Next to each, a visually
  hidden text: tab **"Biscuit the house cat, a baby, sitting on its cushion in the den."** (+ " It
  misses you." / " It is sleepy." with a mood); block **"Biscuit the house cat, level 3."**; egg
  **"A welcome egg on a cushion."**
- **Tab order** in the tab: h1 area (nothing focusable but links in the header) → den card controls
  (Hatch / the radio group and its buttons) → Rename → Feed → This week summary.
- **Choose step**: native radios (visually the tiles), one tab stop, arrow keys move and pick,
  Space picks. Focus to the heading "Choose your first creature" on entering. **Hatch {name}** is a
  normal button after the group; Not yet after it and returns focus to the tab's Hatch button.
- **After Hatch**: focus moves to the heading "Say hello to your house cat!" once the crack is done
  (immediately with reduce motion). After "That's the one!", focus goes to the creature's name
  heading (`tabIndex=-1`).
- **Live region** (one polite `role="status"` per page, visually hidden):
  - hatch: **"Your house cat hatched!"** (+ " A shiny one!")
  - feed: **"Biscuit ate 5 cookies. 18 cookies left."**
  - level-up on a feed: **"Biscuit reached level 4 and is young now!"** or **"Biscuit reached level
    5!"**
  - rename: **"Renamed to Mochi."**
- **Labels**: the cookie pill reads "23 cookies" (the 🍪 is `aria-hidden`, the number with a
  visually hidden "cookies"); "−4 cookies" below zero. Feed: **"Feed Biscuit 5 cookies"**. Disabled
  Feed stays focusable with `aria-disabled="true"` so its label is still read. The growth bar is a
  `role="progressbar"` with `aria-valuetext="18 of 30 to level 4"`. 🎲: "Another name". Rename:
  "Rename Biscuit".
- Focus rings: the existing gold `:focus-visible` ring everywhere, including on the tiles.
- Waiting for you lines: the same structure and buttons as the badge lines (§11), so the existing
  focus handling (focus back to the block heading when a line goes) applies.

## 11. Waiting for you (D-0013)

Two new kinds of line, same layout as the badge lines (icon, bold line, chips):

| Line | Icon | Text | Buttons | Goes away |
|---|---|---|---|---|
| Welcome egg | 🥚 | **"A welcome egg is waiting for you!"** | **Hatch** (primary) → the tab, step 3b | when hatched (everywhere) |
| Level-up | ⭐ | **"Biscuit reached level 5!"**; at a new stage **"Biscuit is young now!"** / **"Biscuit is all grown up!"** | **Nice!** (primary), **Visit** → the tab | after either button, on this device (like badges); a newer level-up replaces it |

- Only the newest level-up shows (one line). Seen levels are kept per device, like seen badges;
  the first time a device opens after the hatch, level-ups from before the newest are not listed.
- A level-up she caused herself with Feed while on the page counts as seen at once (she saw it).
- Order in the block: welcome egg first, then level-up, then what is there today.
- Nothing else from creatures goes here in CR1 (no moods, no "cookies earned").

## 12. Phone performance and movement

- **One canvas per page at most, plus the block's still one** on the dashboard (rendered once).
- **Tab, phone (≤ 720 px or coarse pointer)**: idle is breathing (body scale y ±1.5 %, 4 s) and a
  blink every 4–7 s; nothing else moves unless she taps (crack, feed, level-up). Run the frame loop
  on `demand` and invalidate at most ~20 times a second for the idle, `low` quality, no shadow maps.
- **Tab, computer**: breathing, blinking, a small head tilt or look to the side every ~8 s, the egg's
  rocking; 60 fps is fine; `high` with shadows.
- **Reduce motion** (`prefers-reduced-motion: reduce`): no idle at all, no hop, no bob; the crack is
  a fade; bars jump.
- **Stops** (`frameloop="never"`): page hidden (`visibilitychange`), another tab open (the tab's
  canvas unmounts or stops), the book panel or any sheet over it. Same as `CreaturesPreview.tsx`.
- Building a creature (`makeCreature`) happens once per species, stage and palette and is reused;
  the den is built once.

## 13. Wording, all in one place

| Where | Text |
|---|---|
| Tab | Creatures (🐾) |
| Page h1 | Creatures |
| Cookie pill | 🍪 23 · 🍪 −4 · "+9 today" |
| Egg heading | A welcome egg |
| Buttons | Hatch · Hatch the house cat · Not yet · That's the one! · 🎲 Another name · Rename · Save · Cancel · Feed 5 🍪 · Nice! · Visit · Open › |
| Choose heading | Choose your first creature |
| Hello heading | Say hello to your house cat! |
| Shiny | ✨ A shiny one! |
| Name field | Name · error: Give your creature a name. |
| Card | Level 3 · Baby · House cat · 18 / 30 · Next: level 4 · 12 🍪 to go · Next: young at level 4 · 12 🍪 to go |
| Stages | Baby · Young · Grown-up |
| Moods | 💤 Biscuit misses you · 🌙 Biscuit is sleepy · 💛 Biscuit is so happy you're back! |
| This week | This week · +34 🍪 · This week · nothing yet · Today · Yesterday · Mon 23 Nov · 45 min · 🌙 20 min · 📗 The Hobbit · +21 🍪 |
| Waiting | A welcome egg is waiting for you! · Biscuit reached level 5! · Biscuit is young now! · Biscuit is all grown up! |
| Empty (tab before start) | Your creatures arrive soon. |
| Block title | Creatures |

## 14. Screenshots (in `docs/tasks/T-0029-screens/`)

Demo data, the creature a house cat named Biscuit unless said otherwise. `390` = 390 × 844,
`1280` = 1280 × 800; `lav` / `mid` = the wallpaper.

1. `tabs-390-lav.jpg`: the header with five tabs on one line.
2. `waiting-egg-390-lav.jpg`, `waiting-egg-1280-mid.jpg`: Waiting for you with the egg line, and the
   block in its egg state.
3. `tab-egg-390-lav.jpg`, `tab-egg-1280-mid.jpg`: the tab before the hatch.
4. `choose-390-lav.jpg`, `choose-390-mid.jpg`, `choose-1280-lav.jpg`, `choose-1280-mid.jpg`: one
   creature picked (the red fox on one pair, the capybara on the other).
5. `hello-390-lav.jpg`, `hello-1280-mid.jpg`: the name step; `hello-empty-390-lav.jpg`: the empty-name
   error.
6. `tab-390-lav.jpg`, `tab-390-mid.jpg`, `tab-1280-lav.jpg`, `tab-1280-mid.jpg`: the home with a
   balance, This week open on 1280 (a sleep-read day and a finished book in it).
7. `stages-1280-lav-baby.jpg`, `-young.jpg`, `-grown.jpg`: the same creature at levels 2, 6, 11.
8. `fed-1280-lav.jpg`: right after a feed (bar moved, one cookie fewer in the bowl).
9. `rename-390-lav.jpg`: the rename field open.
10. `block-390-lav.jpg`, `block-390-mid.jpg`, `block-1280-lav.jpg`, `block-1280-mid.jpg`: the dashboard
    block.
11. `waiting-levelup-390-lav.jpg`: a stage level-up line ("Biscuit is young now!").
12. `missing-390-lav.jpg`, `sleepy-390-mid.jpg`, `back-1280-lav.jpg`: the three moods (a test clock or
    demo data may set them).
13. `negative-390-lav.jpg`: "🍪 −4" with Feed disabled.
14. `shiny-hello-1280-mid.jpg`: a shiny hatch, if a dev-only seed can force one (otherwise note it
    in *Log*).

## Questions for Hanna in the morning

Taken with the recommended option tonight; each is easy to change in `numbers.ts` or the wording.

1. **How fast it grows.** Young after about 6 days and grown-up after about a month at 45 minutes
   a day (Baby levels 1–3, Young 4–9, Grown-up from 10, levels go on after). *Recommended: as is.*
   Faster or slower?
2. **One Feed = 5 cookies.** A tap gives one bowl of 5 🍪; with 23 cookies she taps a few times.
   *Recommended: as is* (a "Feed all" button would empty what she'll later want for eggs in the
   shop). Or would she like a Feed all?
3. **The names.** Six suggestions per creature (§9), Biscuit for the cat and so on. *Recommended:
   as is.* Any names she'd like added?
4. **Sleepy hours** 22:30 to 06:00 on the device. *Recommended: as is.* Another bedtime?
5. **The tab's icon** 🐾 after Calendar, and the dashboard block right after Monthly challenge in
   Today. *Recommended: as is.* Elsewhere?

# Test

Developer's own checks (2026-11-23, night); the tester's independent run goes here too.

- **Done when 1:** `src/lib/creatures/cookies.test.ts` (pages, listen-only minutes, a book without
  length as 280 pages, sleep read half, finish treat incl. re-read, nothing before the start,
  fixing a past day lowers the total, rounding on the total, This week adds up, sleep-only day
  half), `creature.test.ts` (welcome egg, balance 0, only the five commons, same creature on every
  device, shiny fixed per egg, names, growth by itself only on reading days, feeding, negative
  balance, stages, wording, moods), `choices.test.ts` (merge: union by id, newest setting per key,
  nothing doubled, same order everywhere; cleaning like the route), `creaturesSync.test.ts` (two
  devices against a stand-in server that merges like T-0028's route; 404 with no field, 404 with no
  shelf, offline then T-0028 goes live, signed out never calls the server; quick feeds combined),
  `src/components/CreaturesPage.test.tsx` (welcome flow, Feed, Rename after reload, the tab and the
  block agree, Waiting lines), `src/components/creatures/scenes.test.tsx` (frame loop),
  `dashboardLayout.test.ts` (old layout gets the block, favourites kept). Output:
  `Test Files 101 passed | 1 skipped (102), Tests 1111 passed | 9 skipped (1120)`.
- **Done when 3 / 12 (frame loop):** `scenes.test.tsx`: the den is `frameloop="always"` on a
  computer, `demand` on a phone and with reduce motion, `never` when paused (book panel, add
  dialog, wish card over the page) or the page is hidden; the block's picture and the choose canvas
  are `demand`. Measured in headless Chrome (SwiftShader) on the dev server, draw calls in 4 s:
  390 visible 1760 (≈ 20 frames/s on demand), hidden 0; 1280 visible 8500 (60 fps with shadows),
  hidden 0. Leaving the tab unmounts the den.
- **Done when 2 / 6–12:** screenshots in `T-0029-screens/` (no-backend dev server on 3146, demo
  books, page clock fixed at 2026-11-29 19:00 unless said): all 14 of Design §14 (31 files) plus
  `tab-390-lav-card`, `missing-390-lav-card`, `sleepy-390-mid-card` (the card with its mood line)
  and `fed-1280-lav-before` (23 🍪, five cookies in the bowl; after the feed 18 and four). The five
  tabs sit on one line at 390 (all tops 109 px). `shiny-hello-1280-mid` uses the dev-only switch
  `localStorage['hannas-reading-list:dev-shiny'] = '1'` (stripped from builds by
  `import.meta.env.DEV`); the real welcome egg is not shiny (its hash gives 10 of 20).
- `pnpm exec tsc --noEmit`: no output. `pnpm run build`: `✓ built`. `pnpm exec harness check`: see
  Log.

# Log

- 2026-11-22 architect: wrote CR1 from Hanna's brief; earned things are derived from the reading
  log, choices kept on the device and synced once T-0028 is live; no Fable work in this task. Size:
  full (new tab, new block, new data).
- 2026-11-22 architect: Hanna's answers: the welcome egg comes without cookies, and she chooses her
  first creature from the five commons (not a surprise). Size unchanged: full.
- 2026-11-23 ux-designer: designed. *Design* §1–14: growth numbers (5 🍪 per feed, +3 a reading
  day, level cost 20 + 5 per level, Baby 1–3 / Young 4–9 / Grown-up 10+), the 🐾 Creatures tab at
  390 and 1280, the welcome flow (egg → choose one of five in a radio group → crack → name with 🎲),
  cookies with a *This week* list that shows sleep reads apart, the den, feeding, moods (missing you
  after 3 days, sleepy 22:30–06:00, happy you're back), the dashboard block, two Waiting for you
  lines, keyboard and screen reader, wording, 14 screenshots and phone movement. Done when 6–12
  added. Five questions taken with the recommended option for the morning. Hand-over to the
  developer. Remaining: Hanna's answers to the five morning questions.
- 2026-11-23 developer: built CR1 on branch `t-0029-first-creature` (from `t-0027-book-creatures`).
  Lib: `src/lib/creatures/numbers.ts` (every number, `CREATURES_START = 2026-11-23`), `cookies.ts`
  (minutes from `readingLog`, 1 🍪 / 5 min on the total, +10 per finish, sleep reads half, This
  week as running-total differences), `creature.ts` (welcome egg, hatch = earliest hatch event for
  `welcome` among the five commons, seeded shiny 1 in 20 and name hash, level cost, stages, moods,
  `deriveCreatures`), `choices.ts` (event log, cleaning with the route's rules, merge: union by id
  and newest setting per key), `words.ts` (all wording). Sync: `src/server/creatures.ts` +
  `creaturesStore.ts` (read `fields=id,creatures`, POST to `/api/collections/libraries/creatures`,
  `kept: false` on a missing field or 404; never PATCH) and `src/components/useCreatureChoices.ts`
  (log in localStorage per account, sends what the account hasn't got on open, on coming back into
  view and after each choice; quick Feed taps within 2 s become one event, held back until the taps
  stop). UI: `CreaturesPage.tsx` (🐾 tab `?view=creatures`, `&step=choose` from every Hatch
  button), `CreaturesCard.tsx` (block `creatures`, Today right column after Monthly challenge),
  two Waiting for you lines in `WaitingCard.tsx`, `creatures/CreaturesContext.tsx` (one log for
  the whole page), 3D in `creatures/DenScene.tsx` (den, egg, crack, idle, moods, feed and level-up
  reactions), `ChooseScene.tsx` (one canvas behind five tiles), `CreatureStill.tsx` (block picture,
  on demand), `pose.ts` (one build per species/stage/palette/quality, cloned). Nothing in
  `src/server/shelf.ts`, `src/lib/shelfMerge.ts`, `deploy/nas/` or any CODEOWNERS path. Checks:
  `tsc --noEmit` no output; `pnpm test` 1111 passed, 9 skipped (102 files); `pnpm run build` ✓;
  `harness check` ✓ tasks 34 / decisions 38 / engineers 2 / generated files current; 35 screenshots.
- 2026-11-23 developer: choices taken at night (recommended option, nothing asked): (1) a sleep
  read's finish treat is halved too (5 🍪), reading D-0033 §2 "sleep reads earn half" as all their
  earning; (2) a day counts as a reading day for growth and moods when it has a log entry or a
  finish; (3) "Creatures" h1 and cookie pill sit on the `challenges-head` card like Calendar and
  Challenges ("same page frame"), not straight on the wallpaper, so the cream pill text stays
  readable on lavender; (4) a level-up line on a device with no seen level counts level 1 as seen
  (only the newest shows); (5) the den stops for the book panel, the add dialog and the wish card;
  (6) `CREATURES_START` is 2026-11-23: if the PR merges later the architect or tester may move it to
  the merge day (anything read since then counts, nothing is lost); (7) Escape in the choose step
  is Not yet. The default layout gained `creatures`, so `recommend.test.ts`'s default-layout
  expectation changed with it.
- 2026-11-23 developer: no pull request yet, on purpose: the no-stacked-PRs rule means this goes to
  `main` only after T-0027 (PR #241) is merged; then rebase on `main`, open the draft PR, add it to
  `result`, wait for CI and hand over to the UX designer for review. T-0028 (PR #239) is not
  needed: until Sander merges it every device keeps its own log and nothing differs. Remaining:
  draft PR after #241; UX review; tester; Hanna's five morning questions; Done when 5 (Hanna on the
  live site).
