---
id: T-0030
title: "Give her free eggs at reading milestones and an album of all 20 creatures with their rarity, shinies and a choice for duplicates"
description: "CR2 of the book creatures (D-0033): milestone eggs that hatch a fixed surprise of the right rarity, an album card per creature (silhouette until found) with tier and IUCN Red List label and source, shiny variants, and keep / cookies / power-up for duplicates, releasing a pet with a confirm step, and an extra warning with hold-to-confirm for a shiny; several pets, one of them current."
status: Doing
size: full
depends_on: [T-0029]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/252]
---

# Goal

1. **Milestone eggs** (`src/lib/creatures/eggs.ts`), worked out from her books from the start day,
   each with a stable id and a tier, exactly D-0033 §6: every 5th finished book (25th rare, 50th
   legendary), every 10 hours (100th hour rare), streaks of 7 / 30 / 100 days, a finished series, a
   challenge done (own challenges and the monthly challenge), a full bingo card. A new egg waits in
   Waiting for you and in the Creatures tab; the dashboard block's "next unlock" names the nearest
   milestone.
2. **Hatching** a surprise of the egg's tier, fixed by the egg id; shiny by the second hash (1 in 20,
   1 in 5 for a duplicate); every species can be shiny (D-0033 §5, §7).
3. **Shiny looks**: the shiny palette of each of the 20 (T-0027 Design §7) plus a soft gold
   sparkle, built on the normal model from Fable's base models (no new Fable work).
4. **Album** in the Creatures tab: a card per species in list order, grouped by tier; a found one
   shows the creature, name, tier and the Red List label in words with a small source line ("IUCN
   Red List, 2024"); an unknown one is a dark silhouette with only its tier. A ✨ mark on a card when
   she has its shiny. "N of 20 found". Each species counts once.
5. **Duplicates** (D-0033 §8): a hatch of a species she has asks, in the tab (not a pop-up): Keep as
   a new pet / Turn into N 🍪 / Power up <name> (+3 levels). A shiny is kept by default; turning a
   shiny into cookies or a power-up needs the "This is a shiny!" warning and a press-and-hold to
   confirm (D-0033 §9).
6. **Several pets**: a pet list in the tab; she picks the current one (shown on the dashboard).
7. **Release a pet, with care** (D-0033 §9): in a pet's card, "Release…" asks a clear confirm that
   names the pet ("Release Biscuit? This can't be undone.") with Release and Keep, Keep focused
   first. For a shiny, also the "This is a shiny!" warning and press-and-hold (about 2 s) to
   confirm. Her last pet can't be released (the button is disabled). A released pet leaves her pets;
   the album still shows its species as found; no cookies come back; if it was the current pet (or
   on the shelf), her first remaining pet takes its place. Saved as a `release` choice (D-0034).

# Done when

1. `pnpm test` passes and includes: each milestone gives its egg once, on the right day, with the
   right tier, and nothing before the start; the hatch of an egg id is the same every time and of its
   tier; every species can come out shiny, and duplicates more often (statistical check over many egg
   ids); a duplicate choice of cookies adds half the tier price and a power-up adds 3 levels;
   **shiny safety**: a shiny can't become cookies or a power-up without the confirm step (the
   function refuses without it, and the component test shows the hold-to-confirm), a shiny hatch is
   kept when nothing is chosen; **release**: refused without the confirm, refused for her last pet,
   refused for a shiny without the warning and the hold (function and component test), a released
   pet gone from her pets but its species still found in the album, the current pet moving to the
   first remaining one, the same result on two devices from the same choices.
2. On `pnpm run dev` with demo data reaching a few milestones: eggs wait, hatch, the album shows
   found cards with labels and silhouettes for the rest, a duplicate offers the three choices, a
   shiny duplicate needs the hold; 390 × 844 and 1280 × 800, both wallpapers; screenshots in
   `docs/tasks/T-0030-screens/`.
3. The developer has re-checked the Red List categories in T-0027's table on iucnredlist.org (or
   notes there was no change since T-0027) and noted the date in *Log*.
4. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms the album on the live
   site.
5. **Eggs (Design §2, §3):**
   - A waiting egg shows one 🥚 line in Waiting for you: "A rare egg is waiting for you!" with
     its reason line, or "3 eggs are waiting for you!". Hatch from there opens the tab and plays
     the crack of the oldest egg.
   - The Eggs card shows the oldest egg, its tier in words and its reason, plus "Then:" small eggs.
   - The tier's egg colour and the reveal's glow and sparkle ring are visible for rare+ and
     epic+.
   - With reduce motion, it's a cross-fade.
6. **Next egg:** the block and the Eggs card show "Next egg: …" (books, hours or streak, the one
   furthest along), naming the tier when it isn't common. With an egg waiting, the block shows
   "🥚 A rare egg is waiting" and a Hatch button.
7. **Duplicates and shiny safety (§5):**
   - A duplicate offers Keep as a new pet / Turn into N 🍪 / Power up {name} (+3 levels), "Which
     koala?" with several, and no power-up with none left.
   - A non-shiny duplicate left undecided waits (Eggs card and 🐣 line). A shiny one is kept.
   - On a shiny, cookies and power-up show "✨ This is a shiny!" with Keep it focused, and only a
     2 s hold acts. Letting go early does nothing, by mouse, touch and keyboard (Space or Enter
     held).
8. **Album (§6):**
   - 20 cards in six tier groups with "N of 20 found" and per-group counts.
   - A found card shows its picture, name, ◆ tier line, Red List label in words and source line.
     The house cat says "Domestic animal" and the fantasy creatures "Fantasy creature".
   - An unknown card shows a dark silhouette with a faint edge and only its tier line.
   - "×2" shows with two pets of a species, and the ✨ toggle once its shiny is found.
   - 5 per row at 1280 and 2 per row at 390, both wallpapers.
   - **No canvas inside the album** (the tester counts `canvas` elements on the tab: one, the den).
9. **Several pets (§8):**
   - Your pets shows from 2 pets as a radio group.
   - Picking a pet makes it current in the den, the creature card and the dashboard block, and
     announces it.
   - Arrowing through the pets saves one `current` event.
10. **Release (§7):**
    - "Release…" is disabled with one pet.
    - The confirm names the pet, with Keep focused first and Escape = Keep.
    - A shiny needs the warning and "Hold to release".
    - Afterwards the first remaining pet is current, the album still counts the species, the
      balance is unchanged, and focus is on the new pet's name.
11. **Keyboard and screen reader (§11):** every flow above works with keys alone; the live region
    says the §11 messages; canvases are `aria-hidden`; album pictures have `alt=""`, with the text
    giving name, tier and label, or "Not found yet".

# Notes

- Builds on T-0029 (cookies, choices log, Creatures tab) and T-0027 (species list, base models).
- Choices saved: `hatch`, `choose` (keep / cookies / power-up, with the egg id), `name` for a new
  pet, the current pet as a `current` setting (D-0034). Hatch results themselves are never
  saved (derived, D-0033 §1).
- Finished series: `seriesProgress` in `src/lib/insights.ts`; challenges: `challengeBooks` in
  `src/lib/ownChallenges.ts` and `src/lib/monthChallenge.ts`; full bingo card: `src/lib/bingo.ts`.
- **Modelling:** shiny palettes and sparkles on the normal model from T-0027's files; no Fable
  agent.

# Design

UX designer, 2026-11-23 (at night, so Hanna wasn't asked: I took the recommended option each time,
and the real questions are at the end under *Questions for Hanna in the morning*). This builds on
T-0029's Design and the Creatures tab as built (`CreaturesPage.tsx`, `CreaturesCard.tsx`,
`WaitingCard.tsx`), on T-0027 §7 (shiny palettes) and §9 (lights), and on T-0042's medal grid (how
hidden items look). English with British spelling. The examples use Biscuit the house cat (her first
pet) and Kiki the koala.

What's in scope: milestone eggs, the hatch reveal, the duplicate choice, shiny looks, the album,
several pets with a current one, release, and the "next egg" line. What's not: the shop (T-0031),
roaming, tricks and share pictures (T-0032), the shelf creature (T-0033). The shelf rule for a
release lives only in the library code and its tests, because nothing shows a shelf creature yet.
No empty placeholders or "coming soon" anywhere.

## 1. Still pictures, not live 3D (phone first)

- **At most one live canvas per page, as today.** On the tab that is the den. On the dashboard it
  is the block's still canvas, which is drawn once. The album, the pet list, the Eggs card and
  Waiting for you all use **plain images**, so 20 cards never mean 20 canvases (browsers allow
  about 16).
- **Recommended: images made in advance.** A dev-only script renders them from the real models
  (`makeCreature`, T-0029's still framing: ¾ turned, neutral pose, T-0027 §9 lights) as transparent
  WebP images, 192 × 192, into `public/creatures/`:
  - `{species}-{stage}.webp` and `{species}-{stage}-shiny.webp`: 20 × 3 stages × 2 = 120 files. The
    shiny ones have the gold sparkle (§4) drawn in.
  - `egg-{tier}.webp`: 6 files (§2).
  - At roughly 5 to 8 KB each that's under 1 MB in the repo. A page only loads the ones it shows:
    `loading="lazy"`, `decoding="async"`, with width and height set so nothing jumps.
  - A test checks that all 126 files exist, so a new species or stage can't ship without its
    pictures.
  - The developer may instead use one shared offscreen renderer at runtime, as long as the result is
    the same: no extra live canvases, and nothing that moves.
- **A picture that fails to load:** the tile keeps its size and shows a "?" in the style of T-0042's
  hidden medals (`--serif`, `--muted`). The card's text stays, and nothing else breaks.

## 2. Milestone eggs

**The eggs' looks.** These use the same egg as T-0029 §3a (a sphere scaled [1, 1.28, 1] with six
flat spots). The shell and spot colour show the tier, and **the tier is always given in words as
well**, so colour is never the only sign:

| tier | shell | spots | extra |
|---|---|---|---|
| common | `#f3e9d8` cream | `#d9a85b` gold | (the welcome egg) |
| uncommon | `#a9c4a0` sage | `#f3e9d8` cream | |
| rare | `#8fb3d9` soft blue | `#f3e9d8` cream | |
| very rare | `#b39ad9` lavender | `#f4d68c` light gold | |
| epic | `#e39aa8` rose | `#f4d68c` light gold | |
| legendary | `#d9a85b` gold, satin | `#fbf6ee` pearl | a soft gold glow behind it (baked into `egg-legendary.webp`; in the den, the §4 sparkle) |

**The words for each milestone.** These are the reason lines, used in Waiting for you and in the
Eggs card:

| egg id | reason line |
|---|---|
| `m:books-N` | For your 5th book · For your 25th book · For your 50th book (English ordinals: 1st, 2nd, 3rd, 11th, 12th, 13th, 21st…) |
| `m:hours-N` | For 10 hours of reading · For 100 hours of reading |
| `m:streak-7/30/100` | For a 7-day streak · For a 30-day streak · For a 100-day streak |
| `m:series-…` | For finishing {series name} (e.g. "For finishing The Lord of the Rings") |
| `m:challenge-…` | For the challenge {challenge name} · For November's challenge (the monthly one) |
| `m:bingo-…` | For a full bingo card |

"Of reading" covers listening as well (D-0008), so it needs no extra words. Egg names in
sentences: "a common egg", "an uncommon egg", "a rare egg", "a very rare egg", "an epic egg",
"a legendary egg".

**Waiting for you (D-0013): one egg line, however many eggs there are.**

- One egg: 🥚 **"A rare egg is waiting for you!"**, with the reason line under it in
  `muted small-text` ("For your 25th book"), and **Hatch** (primary).
- Several: 🥚 **"3 eggs are waiting for you!"**, with no reason line, and **Hatch** (primary).
- Hatch goes to the tab and **starts hatching the oldest egg straight away**. She has already
  tapped Hatch, so the crack (§3) plays without a second tap. The den card scrolls into view.
- The line goes away when no egg is waiting. It has no "Later": it stays, like the welcome egg.
- Order in the block: welcome egg, eggs, duplicates waiting for a choice (§5), level-up, then
  today's other lines.

**Hatch order: always the oldest egg first.** D-0033 §7 decides whether an egg is a duplicate by
the eggs earned before it. Hatching out of order could ask her to power up a creature she hasn't
hatched yet, so every Hatch button hatches the oldest waiting egg. The eggs never sit side by side
as separate choices.

**The Eggs card in the tab.** It shows from the first pet on. On a computer it sits at the top of
the right column; on a phone it comes right after the den.

- Heading **Eggs** (h2, like the other cards).
- **With eggs waiting:** the oldest egg's picture (96 × 96 on a `--surface-sunken` round tile, like
  the block's still), then **"A rare egg"** (bold), the reason line (`muted small-text`) and
  **Hatch** (primary). With more eggs, a row under it reads **"Then:"** followed by up to 5 small egg
  pictures (40 px, in earned order) and "+3" when there are more. Each small egg's name for a screen
  reader is "a common egg"; the "Then:" row is a list.
- **A duplicate waiting for a choice** (§5) shows above the eggs: the creature's picture (its baby
  image), **"Your new koala is waiting"** and **Choose** (primary). That opens the choice in the den
  card.
- **Nothing waiting:** only the next-egg line (below).

**The next-egg line ("next unlock", Goal 1)** is shown in the Eggs card when nothing waits, and in
the dashboard block under the "Next: level …" line, as 🥚 plus text:

- **"Next egg: 2 more books"**, or "1 more book".
- **"Next egg: 3 h 20 min more reading"**. Minutes use T-0029's `minutesText`: "45 min",
  "1 h 05 min".
- **"Next egg: 4 more days in a row"**. This only shows while a streak is going (she read today or
  yesterday).
- If that next egg isn't common, the tier goes in: **"Next rare egg: 2 more books"**, **"Next
  legendary egg: 1 more book"**.
- **Which milestone it names:** of books, hours and streak, the one that's furthest along in its
  current step (done ÷ needed). A tie goes to books, then hours, then streak. Series, challenges and
  bingo eggs stay a surprise and are never named here.

**In the dashboard block with an egg waiting:** the next-egg line becomes **"🥚 A rare egg is
waiting"** ("🥚 3 eggs are waiting"), and a **Hatch** button (secondary, so Feed stays the primary)
sits next to Feed in the bowl row. That Hatch does the same as the one in Waiting for you.

## 3. Hatching a surprise

This all happens in the den card, on her tap. It's never a pop-up, and it reuses T-0029 §3c.

1. **Tap Hatch.** The `hatch` choice for that egg id is saved **on the tap**, before any animation,
   so a reload can't lose it. The Eggs card's Hatch hides while the hatch plays.
2. **The crack.** The current pet fades out of the den, and the tier's egg appears big on the
   cushion. It wobbles three times (0.9 s), splits in two halves (0.4 s) and the baby pops up
   (scale 0.6 → 1, 0.3 s). **Rarity in the moment:**
   - common and uncommon: just the pop;
   - rare and very rare: a soft gold glow behind the baby while it pops (0.6 s);
   - epic and legendary: the glow plus a ring of 12 gold sparkle points that drift outward and fade
     (1 s).
   These play on a phone too, because she tapped. With *Reduce motion* there's no wobble, pop,
   glow or ring, just a 200 ms cross-fade from the egg to the baby.
3. **The reveal** (below the den, where T-0029's hello step is; focus moves to its heading once the
   crack is done, or straight away with reduce motion):
   - **A new species:** heading **"It's a koala!"**, with "an" before a vowel: "It's an otter!",
     "It's an axolotl!", "It's an emperor penguin!", "It's an African penguin!". Under it, the
     tier line (§6, e.g. "◆◆◆ Rare") and **"New in your album!"**. Then T-0029's name step, without
     its own heading: the **Name** field filled with the suggestion (§10), **🎲 Another name** and
     **"That's the one!"**.
   - **A duplicate:** heading **"Another koala!"**, the tier line, then the choice (§5).
   - **A shiny** (either case): the line **"✨ A shiny one!"** sits under the heading, and the baby
     has its shiny palette and sparkle (§4).
4. **After the reveal** ("That's the one!" or a duplicate choice), the den cross-fades back to the
   **current pet**. A new pet joins the pet list but **doesn't become current** on its own; she
   picks the current pet herself (§8). Focus goes to the Eggs card heading.
5. **No WebGL:** the den is left out, as in T-0029. Hatch goes straight to the reveal text, which
   still works and makes sense.

## 4. Shiny looks

- **The shiny palette** of each of the 20 is T-0027 §7's table, on the normal model.
- **The gold sparkle:** 8 tiny four-point stars in `#f4d68c` (gold on the midnight wallpaper reads
  as well as on lavender, T-0027 §7), placed on a loose ring around the creature at about head and
  shoulder height.
  - In the den on a computer they twinkle: each one fades between 30 % and 100 % in its own 2 to
    3 s rhythm and drifts slowly around (one turn in about 20 s).
  - On a phone and with reduce motion, the stars stand still at 70 %.
  - On the still pictures they're drawn in at 80 %.
- **✨ after the name** stays as T-0029 has it (`displayName`).

## 5. Duplicates: keep, cookies or power-up (D-0033 §8)

The choice is shown below the den, under "Another koala!":

- Three buttons in a column (one under the other at 390 and at 1280, full width of the area,
  44 px high at least):
  1. **Keep as a new pet** (primary)
  2. **Turn into 60 🍪** (secondary). The number is half the tier's shop price: common 30,
     uncommon 45, rare 60, very rare 80, epic 100, legendary 150 (D-0033 §6).
  3. **Power up Kiki (+3 levels)** (secondary), naming her pet of that species.
- **Several pets of that species:** the third button reads **"Power up a koala (+3 levels)"**.
  Tapping it swaps the three buttons for a radio group **"Which koala?"** listing those pets
  (name and "Level 6 · Young"), followed by **Power up** (primary, disabled until one is picked) and
  **Back**. Focus goes to the group.
- **No pet of that species left** (all released): the power-up button isn't shown, only Keep and
  Cookies.
- **Not shiny:** Keep, Cookies and Power-up each act on the tap, with no confirm (nothing she had
  is lost).
  - Keep → the name step, with heading **"Say hello to your new koala!"**.
  - Cookies → the pill counts up with the new balance at once. Live region: **"60 cookies added."**
  - Power-up → live region **"Kiki reached level 9!"**, or at a stage change "Kiki reached level 10
    and is all grown up now!" (T-0029's `levelUpSay`).
  - The choice is saved as `choose` with the egg id.
- **She leaves without choosing** (another tab, a reload):
  - **Not shiny:** the duplicate waits. It isn't a pet yet. It shows in the Eggs card ("Your new
    koala is waiting" · **Choose**) and in Waiting for you as 🐣 **"Your new koala is waiting for
    you to choose"** with **Choose** (primary) → the tab, with the choice open in the den card.
    Other eggs can still be hatched in the meantime.
  - **Shiny:** it is **already kept as a pet** (D-0033 §9). No waiting line, and the name is the
    first suggestion. When she comes back the choice isn't asked again; to let it go later she uses
    Release (§7).

**Shiny safety.** For a shiny duplicate, **Keep as a new pet** is the primary button and comes
first. Tapping **Turn into 80 🍪** or **Power up Kiki** doesn't act. Instead the area changes to:

- A warning box: a 1 px `--warning` border with `--radius-card`, the text in `--text`, `role="group"`
  labelled by its first line:
  - **"✨ This is a shiny!"** (bold)
  - **"Turning it into cookies can't be undone."**, or **"Using it to power up Kiki can't be
    undone."**
- **Keep it** (primary) **gets focus first**, then the hold button **Hold to turn into 80 🍪** or
  **Hold to power up Kiki**.
- Escape is the same as Keep it, and Keep it returns to the three buttons.

**The hold button** (one component, also used for release in §7):

- It looks like a secondary button with a `--danger` border and label, and the label never changes.
- Pressing it (pointer down, or Space or Enter down) starts a fill in `--danger` at 35 % that grows
  from left to right, linear, over **2 s**.
- When the fill reaches the end, the action happens. A short lift of the finger or key before then
  means nothing happens: the fill drains back in 200 ms. Key repeats are ignored, and key up cancels.
  Moving the pointer off the button cancels too.
- The fill is a CSS transform, so it runs on the compositor. With reduce motion it still fills,
  because it shows progress, not decoration, but there's no easing.
- No hint text (D-0014): the word "Hold" in the label is the explanation. Screen readers: the
  button is described by the warning box (`aria-describedby`). VoiceOver and TalkBack users can
  "double-tap and hold", which passes the long press through.
- After it fires: the live region says "80 cookies added." or "Kiki reached level 9!", and focus
  goes to the Eggs card heading.

## 6. The album

A full-width card **below** the tab's den grid, on both sizes. It shows from the first pet on (before
the welcome hatch the tab stays as T-0029 has it).

**The head.**
- **Album** (h2).
- **"7 of 20 found"** (`--fs-body`) with T-0042's gold bar under it.
- When at least one shiny has been found: **"✨ 2 shinies"** next to the count. One shiny reads
  "✨ 1 shiny".

**The groups.** Six groups in tier order, each an `h3` with the tier line and its own count: **"◆
Common · 3 of 5"**, "◆◆ Uncommon · 1 of 3", "◆◆◆ Rare · 1 of 3", "◆◆◆◆ Very rare · 0 of 3",
"◆◆◆◆◆ Epic · 0 of 2", "◆◆◆◆◆◆ Legendary · 0 of 4". Cards go in species order within a group
(`SPECIES`).

**The tier line** is used on cards, group headings and the reveal. The ◆ are gems in `--accent`
with `aria-hidden`; the word follows in `--muted` (on headings, `--text`). The count of gems
(1 to 6) shows rarity without colour, and the word says it.

**Grid** (`repeat(auto-fill, minmax(…, 1fr))`, gap `--space-3`):
- **1280 × 800** (page 72rem, card about 1128 px inside): **5 per row**, cards about 215 px wide, so
  every tier fits on one row.
- **390 × 844** (about 334 px inside): **2 per row**, cards about 160 px.
- In between it simply fits more or fewer.

**A found card** (a `--surface-raised` box with a 1 px `--border` and `--radius-card`; a legendary
card has an `--accent-line` border instead), top to bottom:

1. **The picture:** a square tile the full card width, face `--surface-sunken` with a soft
   spotlight (`radial-gradient(circle at 50% 42%, rgba(255,240,215,0.14), transparent 70%)`),
   showing `{species}-grown.webp`. It's always the grown-up, because it's the species' card.
   - **Count:** when she has 2 or more pets of the species, a pill top left: **"×2"** (`--fs-small`,
     cream on `--surface-solid`). The screen-reader text is "2 pets". With one pet, or none after a
     release, there's no pill.
   - **✨:** when she has ever hatched the shiny of this species, a round 44 px toggle top right
     with ✨. It switches the picture between the normal and the shiny look (`aria-pressed`, label
     **"Show the shiny koala"**). It's off at first, and the choice isn't remembered.
2. **Name** (bold, `--fs-body`, wraps with `overflow-wrap: anywhere`).
3. **The tier line** (`--fs-small`).
4. **The Red List label in words** (`--fs-small`, `--text`), then the **source line**
   (`--fs-tiny`, `--muted`):

   | species | label | source line |
   |---|---|---|
   | real, on the list | Least Concern · Near Threatened · Vulnerable · Endangered · Critically Endangered | IUCN Red List, 2016 (the year kept in `species.ts`; without one: "IUCN Red List") |
   | house cat (domestic) | Domestic animal | Not on the IUCN Red List |
   | fantasy | Fantasy creature | (none) |

**An unknown card** (same box, same size):
- The picture tile has a **dashed** 2 px `--border-strong` rim (as T-0042's hidden medals) and
  shows the grown-up image as a **dark silhouette**: `filter: brightness(0)
  drop-shadow(0 0 1.5px rgba(244,234,217,0.5))`. The faint cream edge lets the black shape read on
  the dark card on both wallpapers.
- Then only **the tier line**. There's no name, label or count, and no ✨ even if it would be
  shiny.
- Screen reader: "Not found yet" (visually hidden) in place of the name.

**"Found"** means ever hatched, counted once per species. A released or traded-in creature stays
found, and so does its ✨.

**Both wallpapers:** the album is a walnut card like every other block, so only the wallpaper
around it changes, and it needs nothing per wallpaper. The silhouette edge is the one thing to look
at on midnight.

**Cards aren't buttons.** Only the ✨ toggle is focusable. A card is an `<li>` in a `<ul>` per
group.

## 7. Releasing a pet, with care (D-0033 §9)

Release lives in the **creature card** (the current pet's card), as its last row: **"Release…"**, a
small secondary button with `--danger` text.

- **Her last pet:** the button is shown but disabled. It stays focusable with
  `aria-disabled="true"` and a visually hidden description, **"You always keep one pet."**, which is
  also its `title`. Nothing visible explains it (D-0014).
- **Tap Release…:** the button and the food bowl row are replaced in place, in the card, by:
  - heading **"Release Biscuit?"** (h3, focus moves here)
  - **"This can't be undone."**
  - **Keep** (primary, **focused first**: focus goes to the heading, and Tab lands on Keep before
    Release) and **Release** (secondary, `--danger` border and text).
  - Escape = Keep. Keep restores the card, and focus goes back to "Release…".
- **A shiny pet:** the same, plus the warning box of §5 above the buttons: **"✨ This is a shiny!"**
  and "This can't be undone." inside it, so the plain "This can't be undone." line isn't shown
  twice. **Release** becomes the hold button **"Hold to release"**.
- **After a release:**
  - The pet leaves the pet list. Its species stays found in the album, and no cookies come back.
  - It was the current pet (release only happens from the current pet's card), so **her first
    remaining pet in hatch order becomes current**. The den cross-fades to it (200 ms).
  - Live region: **"Biscuit was released. Mochi is your current pet now."**
  - Focus goes to the new current pet's name heading.
  - It's saved as a `release` choice. The `current` setting simply follows from "the first
    remaining pet" when the current one is gone, so no extra event is needed.
- **The shelf:** T-0033 will read "the shelf pet, or the first remaining one" from the same library
  function. Nothing to show here.

## 8. Several pets, one current

A **"Your pets"** card, shown when she has **2 or more** pets. On a computer it goes in the right
column after the creature card; on a phone after the creature card.

- Heading **Your pets** with the count in `--muted`: "Your pets · 3".
- A **radio group** labelled "Current pet". Each pet is a row with a native radio that's visually
  hidden; the whole row is the target and is 56 px high at least:
  - the pet's picture (`{species}-{stage}[-shiny].webp`, 48 × 48 on a round `--surface-sunken`
    tile);
  - its name with ⭐/✨ (bold, one line with an ellipsis);
  - "Level 6 · Young · Koala" (`--fs-small`, `--muted`);
  - for the current one: a gold wash and outline (`--accent-soft`, `--accent-line`, as T-0029's
    choose tiles) and a small **"Current"** chip at the right.
- Rows go in hatch order (welcome first), and the current pet isn't moved to the top.
- **Picking a row** makes it current at once: the den cross-fades to it (200 ms, or instant with
  reduce motion), the creature card and the dashboard block follow, and the live region says
  **"Mochi is your current pet."**
  - Arrow keys move and pick, as radios do. The view follows at once, but the `current` choice is
    saved only after 1 s without another change, so arrowing through 6 pets writes one event, not
    six.
- To feed or release another pet, she makes it current first. Feed, Rename and Release always act
  on the current pet.

## 9. Layout of the tab after this task

- **1280 × 800:** the den card on the left (62 %). The right column holds the **Eggs** card, the
  **creature card**, **Your pets** (2+ pets) and **This week**. Under the whole grid, the **Album**,
  full width.
- **390 × 844:** one column with a 16 px gutter: den, Eggs, creature card, Your pets, This week
  (closed), Album.
- **Dashboard block:** as T-0029, plus the next-egg line, or the egg-waiting line and Hatch (§2).
  It always shows the current pet.

## 10. Suggested names for the other 15

These go next to T-0029's five, picked the same way. A suggestion already used by another of her
pets of the same species is skipped, so two koalas aren't both called Gumnut.

- European hedgehog: Bramble, Prickles, Conker, Sprout, Truffle, Thimble
- Eurasian otter: Ripple, Pebbles, Splash, Wren, Brook, Otto
- Platypus: Puddle, Paddle, Duckie, Noodle, Bilby, Pip
- Koala: Kiki, Gumnut, Eucy, Bonnie, Wattle, Mopsy
- Giant panda: Bao, Mei, Bamboo, Panko, Dim Sum, Lychee
- Polar bear: Frost, Snowdrop, Nanook, Blizzard, Marshmallow, Igloo
- Red panda: Sunny, Paprika, Fizz, Rowan, Peaches, Momo
- Emperor penguin: Admiral, Tux, Duchess, Flurry, Captain, Pingu
- Ring-tailed lemur: Ziggy, Jubilee, Stripes, Banjo, Mango, Rafi
- African penguin: Kaapie, Sandy, Dotty, Boulder, Pebble, Jazz
- Axolotl: Bubbles, Blossom, Miso, Sakura, Gill, Lotus
- Book dragon: Inkwell, Quill, Ember, Vellum, Saga, Folio
- Library owl: Hootsworth, Dewey, Sage, Parchment, Athena, Ollie
- Bookmark fox: Ribbon, Page, Tassel, Chapter, Marigold, Dog-Ear
- Starlight unicorn: Stardust, Luna, Nova, Celeste, Twinkle, Aurora

**Species words** for sentences ("It's a koala!", "Say hello to your new koala!") go in
`SPECIES_WORD` for all 20. The name is lower case, keeping proper nouns, and T-0029's five stay as
they are. New: hedgehog, otter, platypus, koala, giant panda, polar bear, red panda, emperor
penguin, ring-tailed lemur, African penguin, axolotl, book dragon, library owl, bookmark fox,
starlight unicorn. "an" goes before otter, emperor penguin, African penguin and axolotl.

## 11. Keyboard and screen reader

- **Canvases** stay `aria-hidden` with the hidden description next to them (T-0029 §10). During a
  hatch the description is "A rare egg on a cushion.", then "Kiki the koala, a baby, sitting on its
  cushion in the den."
- **Tab order** in the tab: den-card controls (reveal, name, choice, warning) → Eggs card (Choose,
  Hatch) → creature card (Rename, Feed, Release…) → Your pets (one stop, then arrows) → This week
  summary → Album (only the ✨ toggles).
- **Focus moves:**
  - Hatch → the reveal heading once the crack is done.
  - Keep as a new pet → the Name field's heading "Say hello to your new koala!".
  - After a choice, a power-up, cookies or "That's the one!" → the Eggs card heading.
  - Release… → "Release Biscuit?". Keep → back to "Release…". After a release → the new current
    pet's name heading.
  - A warning box → its Keep it button.
  - Waiting for you buttons use the existing pattern (focus to the block heading when a line goes).
- **The live region** (the page's one polite `role="status"`), new messages:
  - hatch: **"A rare egg hatched: it's a koala!"**, plus " A shiny one!" for a shiny, and " New in
    your album!" for a first find
  - cookies: **"60 cookies added."**
  - power-up: T-0029's `levelUpSay` ("Kiki reached level 9!")
  - current: **"Mochi is your current pet."**
  - release: **"Biscuit was released. Mochi is your current pet now."**
- **Labels:**
  - Hatch in the Eggs card: **"Hatch the rare egg"**. In Waiting for you with several eggs: "Hatch
    the oldest egg".
  - Choose: "Choose for your new koala".
  - The cookies button: **"Turn the koala into 60 cookies"**. Power-up: **"Power up Kiki by 3
    levels"**. Hold buttons: **"Hold to release Biscuit"**, "Hold to turn the shiny koala into 80
    cookies", "Hold to power up Kiki with the shiny koala".
  - ✨ toggle: "Show the shiny koala".
  - Count pill: "2 pets".
  - Small eggs in "Then:": "a common egg".
- **Album structure:** h2 Album → h3 per tier (its text includes the count) → a `<ul>` of cards. Each
  found card reads: name, tier word, Red List label, source. An unknown one reads "Not found yet",
  then the tier word. Pictures have `alt=""`, because the text says it all.
- The focus ring is the house gold `:focus-visible` ring everywhere, including the pet rows and the
  hold button.

## 12. Empty, error and long-text states

- **No eggs yet, nothing waiting:** the Eggs card shows only the next-egg line. If none can be named
  (no streak and, oddly, nothing countable), the card shows **"No eggs waiting."** (an empty-block
  message).
- **Offline, not signed in, or a server without the choices route:** no difference (D-0034).
- **A choice made on another device** (she picked cookies on her computer): the phone's Eggs card,
  Waiting line and album follow on the next sync, with no message.
- **Long names** wrap in the reveal, the creature card and the album, and get an ellipsis in the pet
  rows and the block (T-0029 as built).
- **Many pets** (10+): the list just grows; no scroll box inside the card.
- **Before the welcome hatch:** no Eggs card, album or pet list; T-0029's flow is unchanged.
  Milestone eggs earned before the welcome hatch wait, and the Waiting line shows them after the
  welcome egg line.

## 13. Wording, all in one place

| Where | Text |
|---|---|
| Waiting (eggs) | A rare egg is waiting for you! · 3 eggs are waiting for you! · Hatch |
| Waiting (duplicate) | Your new koala is waiting for you to choose · Choose |
| Reasons | For your 5th book · For 10 hours of reading · For a 7-day streak · For finishing {series} · For the challenge {name} · For November's challenge · For a full bingo card |
| Eggs card | Eggs · A rare egg · Then: · +3 · Your new koala is waiting · Choose · Hatch · No eggs waiting. |
| Next egg | Next egg: 2 more books · 1 more book · Next egg: 3 h 20 min more reading · Next egg: 4 more days in a row · Next rare egg: 2 more books |
| Block | 🥚 A rare egg is waiting · 🥚 3 eggs are waiting · Hatch |
| Reveal | It's a koala! · It's an otter! · New in your album! · Another koala! · ✨ A shiny one! · Say hello to your new koala! |
| Duplicate | Keep as a new pet · Turn into 60 🍪 · Power up Kiki (+3 levels) · Power up a koala (+3 levels) · Which koala? · Power up · Back |
| Shiny warning | ✨ This is a shiny! · Turning it into cookies can't be undone. · Using it to power up Kiki can't be undone. · Keep it · Hold to turn into 80 🍪 · Hold to power up Kiki |
| Release | Release… · Release Biscuit? · This can't be undone. · Keep · Release · Hold to release · (hidden) You always keep one pet. |
| Pets | Your pets · 3 · Current · Level 6 · Young · Koala |
| Album | Album · 7 of 20 found · ✨ 2 shinies · ✨ 1 shiny · ◆ Common · 3 of 5 · ×2 · Least Concern … Critically Endangered · Domestic animal · Fantasy creature · IUCN Red List, 2016 · IUCN Red List · Not on the IUCN Red List · (hidden) Not found yet |
| Tiers | Common · Uncommon · Rare · Very rare · Epic · Legendary |
| Live region | A rare egg hatched: it's a koala! · 60 cookies added. · Mochi is your current pet. · Biscuit was released. Mochi is your current pet now. |

## 14. Screenshots (in `docs/tasks/T-0030-screens/`)

Demo data with a few milestones reached and a dev-only seed that can force a shiny and a duplicate.
`390` = 390 × 844, `1280` = 1280 × 800; `lav` / `mid` = the wallpaper.

1. `waiting-egg-390-lav.jpg`, `waiting-eggs-1280-mid.jpg`: one egg line with its reason; the
   several-eggs line.
2. `eggs-card-390-lav.jpg`, `eggs-card-1280-mid.jpg`: the Eggs card with a rare egg and "Then:"
   small eggs; `next-egg-390-mid.jpg`: the card with only "Next egg: …".
3. `eggs-tiers-1280-lav.jpg`: the six egg pictures side by side (from `/style` or a dev page is
   fine).
4. `crack-legendary-1280-mid.jpg`: mid-hatch with the glow and sparkle ring (a frame grab).
5. `reveal-new-390-lav.jpg`, `reveal-new-1280-mid.jpg`: "It's a koala!" with the name step.
6. `duplicate-390-lav.jpg`, `duplicate-1280-mid.jpg`: the three choices;
   `duplicate-which-390-lav.jpg`: "Which koala?".
7. `shiny-reveal-1280-lav.jpg`, `shiny-reveal-390-mid.jpg`: a shiny baby with its sparkle.
8. `shiny-warning-390-lav.jpg`, `shiny-warning-1280-mid.jpg`: the warning box with Keep it and the
   hold button; `shiny-hold-390-lav.jpg`: the hold button half filled.
9. `album-390-lav.jpg`, `album-390-mid.jpg`, `album-1280-lav.jpg`, `album-1280-mid.jpg`: found
   cards (with ×2 and ✨) and silhouettes in every tier. 390 may need two shots
   (`-top` / `-bottom`).
10. `album-shiny-1280-lav.jpg`: a card with the ✨ toggle on.
11. `pets-390-lav.jpg`, `pets-1280-mid.jpg`: Your pets with three pets, one current.
12. `release-390-lav.jpg`: the confirm; `release-shiny-1280-mid.jpg`: the shiny confirm with
    "Hold to release"; `release-last-390-lav.jpg`: the disabled Release… with one pet.
13. `after-release-1280-lav.jpg`: the first remaining pet now current.
14. `block-egg-390-lav.jpg`, `block-next-1280-mid.jpg`: the dashboard block with an egg waiting,
    and with the next-egg line.
15. `waiting-duplicate-390-mid.jpg`: the 🐣 line.

## 15. Additions to *Done when* (for the tester)

See items 5 to 11 under *Done when*.

## Questions for Hanna in the morning

I took the recommended option for each of these tonight. Each one is easy to change.

1. **Does a new pet become the current one?** Recommended: **no**. It joins Your pets, and she taps
   it to make it current. Or should every new hatch take over the den and the dashboard?
2. **Shiny looks in the album.** Recommended: a shiny look shows (✨ toggle) **only once she has
   found that shiny**, to keep the surprise. Or should she be able to peek at all 20 shinies?
3. **Egg colours by rarity** (cream, sage, blue, lavender, rose, gold), always with the word as
   well. Recommended: as is. Other colours?
4. **Names for the other 15 creatures** (§10, e.g. Kiki the koala, Inkwell the book dragon).
   Recommended: as is. Any she'd like to add?
5. **Eggs hatch oldest first** with one Hatch button, rather than her picking which egg. The game's
   rules need this, so it isn't really a choice, but say if it feels wrong.
6. **One line in Waiting for you for all eggs** ("3 eggs are waiting for you!") rather than a line
   per egg. Recommended: as is.

## Build notes (developer, 2026-11-23)

Built at night, nothing asked; where the task left a choice I took the recommended or simplest
option and list it here for the UX review and the tester.

**Where things are**

- Lib: `src/lib/creatures/eggs.ts` (milestone eggs, tier from the egg id, what an egg hatches,
  next egg), `creature.ts` (several pets, duplicates, power-ups, release, current pet, album sets,
  `chooseEvent` / `releaseEvent` that refuse without their confirm steps), `choices.ts` (`choose`,
  `release`, `current` events), `numbers.ts` (milestones, prices, the 15 new name lists and species
  words), `words.ts` (all T-0030 wording), `hash.ts`.
- UI: `CreaturesPage.tsx` (hatch flow, reveal, release in the creature card, layout),
  `creatures/EggsCard.tsx`, `Reveal.tsx` (reveal, duplicate choice, "Which …?", shiny warning),
  `PetsCard.tsx`, `Album.tsx`, `bits.tsx` (`Still`, `TierLine`, `HoldButton`, `ShinyWarning`),
  `eggModel.ts` (the tiered egg, sparkle and glow, shared by den, block and pictures), `DenScene.tsx`
  (tier eggs, glow for rare+, sparkle ring for epic+, shiny sparkle), `CreaturesCard.tsx` (block),
  `WaitingCard.tsx` (🥚 and 🐣 lines), `routes/index.tsx` (`&step=hatch`, `&step=duplicate`).
- Pictures: `public/creatures/` (120 creatures + 6 eggs, 192 × 192 WebP, 809 KB), made by the
  committed script `pnpm run render:creatures` (`scripts/render-creature-stills.mjs` starts a bare
  Vite server for `scripts/creature-stills/`, renders `src/components/creatures/stills.ts` in
  headless Chrome with software WebGL). `stills.test.ts` checks all 126 exist and are WebP.

**Choices taken**

1. **What a milestone egg hatches uses a finalised hash** (`mixedHash`: FNV-1a + murmur3's
   fmix32). Plain FNV's low bits repeat for ids that differ in one digit, which left 3 species out of
   their tier in a 20 000-egg check. `seededHash` itself is unchanged, so T-0029's live names and the
   welcome egg's shiny stay as they are. The shiny check keeps `seededHash` (1 in 20 / 1 in 5 hold
   within ±1 % over 20 000 ids).
2. **A milestone hatch saves no species** (it's derived, D-0033 §1). `isHatch` now only asks for a
   species on the welcome egg.
3. **The tier follows from the egg id alone**, and a hatched egg that a fixed past day takes away
   stays a pet (it is ordered after the earned eggs). Nothing she has is lost.
4. **Counting:** book eggs count every finish from the start, re-reads and sleep reads included;
   hour eggs count sleep reads at their real minutes (it's time read); streak eggs count days with
   minutes from the start day and come once each (`m:streak-7` once, as the ids in D-0033 say); a
   series needs 2+ books all read, earned the day its last book was first finished; her own
   challenge on the day of its target-th book; the monthly challenge per month done; a bingo card on
   the day it was filled.
5. **Her own challenges** come into the creatures through `useOwnChallenges` in
   `CreaturesProvider`, so a page load asks the server for them once more (signed in only).
6. **The rules are enforced in the derivation too:** a shiny's cookies, power-up or release without
   `hold: 1`, a release without `confirm: 1`, or a release of her last pet (also when two devices
   release every pet at once) is ignored. A choice made in the same millisecond as its hatch counts
   (hatches sort first on a tie: found by a component test).
7. **A power-up adds the growth of the next 3 levels at the moment it is used**, so the level goes
   up by exactly 3 and the bar keeps its place.
8. **The crack:** the den switches straight to the tier's egg (no separate fade-out of the current
   pet); during the reveal the den shows the new baby, then the current pet again.
9. **The block's Hatch** sits in the bowl row and wraps under Feed at 390 (`block-egg-390-lav`).
10. **A dev-only switch** `localStorage['hannas-reading-list:dev-duplicate'] = '1'` makes every
    milestone egg hatch her first pet's species (next to T-0029's `dev-shiny`); never in a build.

**Checks**

- Canvas count on the tab: the Creatures page has one, the den. The document has two, because the
  bookshelf's own canvas stays mounted behind every view (as before this task).
- Red List: re-checked 2026-11-23. The latest IUCN Red List update is the one of 9 July 2026, before
  T-0027's check of 2026-11-22, so the categories in T-0027's table are unchanged.
- Screenshots: 35 files in `docs/tasks/T-0030-screens/` for all 15 sets, from the no-backend dev
  server on demo data (the welcome cat Biscuit plus short books finished one a day, so book eggs 5,
  10, 15… hatch red squirrel, red squirrel, red fox, a **shiny** red fox duplicate, a rare polar
  bear, …; the 50th a legendary starlight unicorn). The shiny shots show that shiny red-fox
  duplicate; `release-shiny-1280-mid` uses `dev-shiny`. `crack-legendary-1280-mid` is a real frame:
  software WebGL draws too slowly to catch 1.45 s into the crack, so the screenshot script ran the
  page's `performance.now` at 8 % speed (only in the script, not in the app). Album: 5 a row at
  1280, 2 at 390.

## Review after building (2026-11-23)

UX designer, at night (Hanna not asked). I looked at `git diff origin/main...HEAD -- src`, all 35
screenshots and the 126 still pictures. For the pictures I made contact sheets at the sizes the app
shows them: album tiles at 160 px on a 2× screen (all 40 grown-ups, normal and shiny, and all 6
eggs), pet rows at 48 px (all 120 creatures), and the eggs at 96 px, on a card over both wallpapers.
I didn't need the dev server.

**Verdict: matches the design. Nothing must be fixed before the tester.** Handed to the tester.

**Design checks, state by state**

- [x] §1 Still pictures: plain `<img>` with `alt=""`, lazy and fixed size, with a "?" fallback
  (`Still`). The tab has one canvas, the den. All 126 files are there.
- [x] §2 Waiting for you: "A rare egg is waiting for you!" with "For your 25th book" and Hatch;
  "7 eggs are waiting for you!" with no reason line; the 🐣 "Your new red squirrel is waiting for
  you to choose" with Choose. The order is right (egg, duplicate, then the other lines).
- [x] §2 Eggs card: the 96 px egg on a round sunken tile, "A rare egg", the reason, Hatch, and
  "Then:" as a list of 40 px eggs with hidden names (+N past five). Hatch hides while a hatch plays
  (`crack-legendary`, `reveal-new`). With nothing waiting it shows only the next-egg line. It's top
  right at 1280 and right after the den at 390.
- [x] §2 Next egg: "Next egg: 3 more books" and "Next uncommon egg: 3 more days in a row" (tier
  named), in the block and in the card.
- [x] §2 Block: "🥚 2 eggs are waiting" and a secondary Hatch, with Feed still the primary.
- [x] §2 Egg colours: six tiers you can tell apart, with the legendary egg's gold glow baked in.
  The tier is always given in words.
- [x] §3 Crack: the legendary glow and the ring of gold sparkles show in the frame grab. Reveal:
  "It's a polar bear!", "◆◆◆ Rare", "New in your album!", then the name step (Blizzard, from §10's
  list).
- [x] §5 Duplicate: Keep (primary) / "Turn into 30 🍪" / "Power up Nutmeg (+3 levels)" as one
  column of full-width buttons. "Which red squirrel?" is a radio group with Power up and Back.
- [x] §5 Shiny safety: "✨ A shiny one!", then the warning box ("✨ This is a shiny!" / "Turning
  it into cookies can't be undone.") with Keep it (primary) first and the danger-bordered "Hold to
  turn into 30 🍪". The hold fill is half way in `shiny-hold`. Component tests cover holding by
  mouse, touch and keys.
- [x] §6 Album: "7 of 20 found", "✨ 3 shinies" and the gold bar, then six h3 groups with counts.
  Cards show the name, ◆ tier, the label in words and the source ("Domestic animal / Not on the IUCN
  Red List"; "IUCN Red List" when `species.ts` has no year). There are ×N pills, ✨ toggles (on in
  `album-shiny`), and silhouettes with a dashed rim, a faint edge and only the tier line. The faint
  edge reads on midnight too. 5 per row at 1280, 2 at 390. A legendary card has the gold line.
- [x] §7 Release: "Release…" in danger text. The confirm replaces the bowl row in place:
  "Release Hazel?", "This can't be undone.", Keep (primary) then Release. A shiny pet gets the
  warning box (with the line only once) and "Hold to release". Release is dimmed with one pet. After
  a release, Biscuit is current again.
- [x] §8 Your pets: "Your pets · 3", rows in hatch order with a 48 px picture, name, "Level 2 ·
  Baby · Eurasian red squirrel", and a gold wash and "Current" chip on the current one.
- [x] §9 Layout at 1280 and 390, as designed.
- [x] §13 Wording matches the table. Prices follow the tier (common 30).

**The developer's night choices**

1. **The den switches straight to the egg** (no fade-out of the current pet first). **Accepted.**
   She has just tapped Hatch, so the egg turning up at once is the right feedback, and the wobble
   that follows gives the moment its build-up. A fade first would only make her wait. With reduce
   motion, the 200 ms cross-fade from egg to baby is still what counts. No change.
2. **The block's Hatch wraps under Feed at 390.** **Accepted.** The cookie pill, "Feed 5 🍪" and
   Hatch don't fit on one row in a ~300 px block. Wrapping keeps all three full size (44 px
   targets) and in reading order. Hatch is secondary, so Feed stays the clear main action on the
   first row. Making the buttons smaller to force one row would be worse. No change.
3. **Still pictures' quality at their shown size, both wallpapers.** **Good.** At 160 px on a 2×
   phone (a 192 px source shown at 320 device pixels) and 193 px at 1280, the creatures are clean,
   with no jagged edges or halos, and the transparency sits well on the sunken tile. At 48 px in Your
   pets every species is easy to recognise, and a shiny is easy to tell from a normal one. The
   pictures always sit on the walnut card (88 % opaque), so they look the same on lavender and
   midnight, as the album shots show. All 20 shiny palettes match T-0027 §7, and each has its
   sparkle.
4. The other choices (finalised hash, counting rules, rules enforced in the derivation, power-up
   adding exactly 3 levels, the dev-only duplicate switch) don't change what she sees. No remarks.

**Small differences, not to fix now** (nice to have, for a later polish task or Hanna's morning
questions):

- Under the warm den lights, the **rare egg** reads more grey-blue than the soft blue `#8fb3d9`, and
  the **very rare** egg more mauve than lavender. All six are still easy to tell apart, and the tier
  is always in words, so this belongs with Hanna's morning question 3 (egg colours) rather than
  being a fix.
- On a few shinies (library owl, emperor penguin, starlight unicorn) one of the 8 sparkle stars
  sits over the face or belly instead of on the loose ring around the creature. You only notice it
  at album size.
- On a 3× phone the 160 px album tile scales a 192 px picture up about 2.5×, which is slightly soft.
  If Hanna finds it soft on her phone, re-render at 384 px with the committed script (about double
  the 0.8 MB).
- When "Next uncommon egg: 3 more days in a row" wraps, its second line starts under the 🥚 instead
  of under the text (no hanging indent).
- `album-1280-lav-more.jpg` is the same view as `album-1280-lav.jpg`. The lower tiers at 1280 are
  covered by `album-shiny-1280-lav` and the 390 bottom shots.

# Test

# Log

- 2026-11-22 architect: wrote CR2 from Hanna's brief and D-0033 (milestones, tiers, shiny safety).
  Size: full.
- 2026-11-22 architect: Hanna's answers: all 20 creatures have a shiny, and a pet can be released
  with a clear confirm (for a shiny also the warning and the hold), with tests. Size unchanged: full.
- 2026-11-23 ux-designer: designed (eggs and the hatch reveal, the duplicate choice with the shiny
  warning and hold-to-confirm, the album as still pictures, Your pets with a current pet, release,
  next egg, keyboard and screen reader, wording, screenshots; Done when 5–11 added). Hanna was asked
  nothing (night); six questions for the morning under *Design*. Handed to the developer.
- 2026-11-23 developer: built CR2 on branch `t-0030-eggs-album`: milestone eggs worked out from
  reading (books every 5th / 25th rare / 50th legendary, hours every 10 / 100th rare, streaks
  7/30/100, finished series, own and monthly challenges, full bingo cards), hatching a fixed
  surprise of the egg's tier with shinies (1 in 20, 1 in 5 for a duplicate), the duplicate choice
  (keep / half-price cookies / +3 levels, "Which …?"), shiny safety with one hold button (2 s, mouse,
  touch and Space/Enter; a short press, a click or key repeats do nothing), the album (20 cards in six
  tier groups, silhouettes, ×N, ✨ toggle, Red List label and source, plain images only), Your pets
  with a current pet (one `current` event after 1 s of arrowing), Release… with its confirm (Keep
  first, Escape = Keep, shiny warning + "Hold to release", disabled for her last pet), the
  Waiting for you 🥚 and 🐣 lines, the block's egg line / next-egg line and Hatch, the den's tier
  eggs, reveal glow and sparkle ring and the shiny sparkle, and 126 pre-rendered pictures from the
  real models by the committed `pnpm run render:creatures` with a test that all exist. Choices
  taken at night are under *Build notes* (nothing asked). Nothing in `src/server/shelf.ts`,
  `src/lib/shelfMerge.ts`, `deploy/nas/` or any CODEOWNERS path. Checks: `tsc --noEmit` no output;
  `pnpm test` 1404 passed, 9 skipped (112 files), of which new: `eggs.test.ts` 19, `pets.test.ts`
  17, `CreaturesEggs.test.tsx` 17, `stills.test.ts` 2; `pnpm run build` ✓ (pictures in
  `dist/client/creatures/`); `harness check` ✓ tasks 41 / decisions 41 / engineers 2 / generated
  files current; 35 screenshots for the 15 sets (port 3162, server stopped afterwards). Red List
  re-checked 2026-11-23: no update since 9 July 2026, so no change since T-0027. Remaining: UX
  review; tester; Hanna's six morning questions (Design); Done when 4 (Hanna confirms the album on
  the live site). Draft PR #252.
- 2026-11-23 ux-designer: reviewed: matches the design, nothing must be fixed (35 screenshots and
  contact sheets of all 126 pictures at the sizes shown, both wallpapers; accepted the den switching
  straight to the egg, Hatch wrapping under Feed at 390, and the picture quality; five small
  nice-to-haves listed). Handed to the tester.
