---
id: T-0031
title: "Open the creature shop: food, outfits, home upgrades, eggs, toys, habitats and reading-room decorations for cookies"
description: "CR3 of the book creatures (D-0033): a Shop in the Creatures tab where cookies buy food, outfits and accessories her pets wear, home upgrades and habitats for the den, toys, eggs of every rarity at D-0033's prices, and extra decorations that join the 3D reading room's room panel; purchases are choices saved with her account (D-0034)."
status: Doing
size: full
depends_on: [T-0030]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/255]
---

# Goal

1. **Shop** in the Creatures tab, in sections, each item with a picture, a name and its price in 🍪;
   Buy is disabled with the missing amount shown when the balance is too low. Bought items show as
   owned. Six sections:
   - **Food**: snack, treat, feast (more growth per cookie for the bigger ones).
   - **Outfits & accessories**: hats, scarves, glasses, bows, a little backpack (about 12 items); she
     dresses each pet (one item per slot: head, face, neck, back), shown everywhere the pet is.
   - **Home**: cushions, a lamp, a mini bookcase, a rug, a window with weather (follows the time of
     day; rain/sun/snow by month, no weather service).
   - **Habitats**: den backgrounds forest, ice, beach, castle library (+ the plain den she has).
   - **Toys**: ball, yarn, slide (used in T-0032 for play and tricks; here they stand in the den).
   - **Eggs**: one per tier at D-0033's prices; a bought egg waits to hatch like a milestone egg
     (id `shop:<purchase id>`).
   - **Room decorations**: three or four new decorations for the 3D reading room (e.g. a creature
     plush, a tiny egg display, a pennant garland); once bought they join the 🎨 room panel's
     decorations list on every device, shown or hidden per device like the others (D-0022).
2. **Prices** in `src/lib/creatures/numbers.ts`, balanced against D-0033's earning: food 5–25,
   accessories 20–60, home 30–80, toys 25–50, habitats 80–150, decorations 60–120, eggs per D-0033.
3. **Saved choices** (D-0034): `buy` (item id and the price paid), `wear` (key `pet:slot`), `place`
   (key `home:slot`), `habitat`. Spent = the sum of `buy` prices; prices changed later never change
   what she paid.

# Done when

1. `pnpm test` passes and includes: the balance after buying (earned − paid), buying refused
   when the balance is too low or below zero, an item bought once (no double buy from two quick
   taps; bought twice only for food and eggs), wearing one item per slot and only owned items, a
   bought egg hatching like a milestone egg of its tier, a bought decoration in the room panel's
   list, a price change not changing an earlier purchase.
2. On `pnpm run dev` with demo data: buying in each section, dressing a pet (seen in the tab and on
   the dashboard), placing home items, switching habitats, a bought decoration showing in the 3D
   room; 390 × 844 and 1280 × 800, both wallpapers; screenshots in `docs/tasks/T-0031-screens/`.
3. Phone performance: the den with all home items, a habitat and a dressed pet stays within the
   budget the UX designer sets in *Design* (draw calls, noted in *Test*).
4. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms the shop on the live site.
5. (UX) The Creatures tab has a Den | Shop switch from the first pet on; the Shop view has the seven
   categories of Design §5 with the 41 items and prices of Design §2; the URL keeps the category, and
   Back returns to the previous view.
6. (UX) Each card shows the right state of the four (affordable, too expensive with "N 🍪 more",
   owned, in use) for balances above, at and below the price and below 0; Buy opens the inline
   confirm in the card (no dialog), Escape cancels, a double tap on the confirm buys once, and food
   is given on the tap without a confirm.
7. (UX) An outfit put on a pet shows on its anchor in the den and on the dashboard block, one per
   slot, for any of her pets via the Dress row, without changing the current pet; the contact sheet
   (Design §15.7) shows no piece sunk into or floating off any of the five creatures beyond the two
   accepted cases.
8. (UX) Home items, a toy and a habitat change the den at once; all six spots are fully in view at
   390 (300 px and 180 px canvases) and 1280; the window's sky and weather follow a test clock and
   month as Design §8 says, still on a phone.
9. (UX) A bought decoration appears in the 🎨 panel and on the 3D shelf on a second device after
   sync, switched on at the top of the list (so it always has a shelf; review after building); hiding it on one device doesn't hide it on the other; decorations not
   bought appear nowhere.
10. (UX) Keyboard only: every buy, put on, take off, place, put away, habitat and show/hide can be
    done; the live-region words of Design §14 are announced; the fullest den on `low` stays at or
    under 60 draw calls and 20,000 triangles (unit test, plus `renderer.info` noted in *Test*).

# Notes

- **Modelling:** every shop item (outfits, home items, habitats, toys, decorations) is built by the
  normal agents (default model), procedural three.js like `src/components/Decorations.tsx`.
  Outfits sit on the anchor points of Fable's base models (`hat`, `face`, `neck`, `back`, T-0027)
  and scale with the stage. **No Fable agent** in this task (D-0033 §14).
- Room decorations: `src/lib/room.ts` (`DecorKind`, `cleanRoom`, the per-device room settings) and
  `src/components/RoomPanel.tsx`; a bought decoration is unlocked by the choices log, its on/off and
  order stay per device. Older saved rooms must still load.
- Weather in the window comes from the date and time only (no outside service).

# Design

UX designer, 2026-11-23 (at night: Hanna wasn't asked, I took the recommended option each time, and
the real questions are at the end under *Questions for Hanna in the morning*). This builds on
T-0029's and T-0030's Designs and the tab as built (`CreaturesPage.tsx`, `DenScene.tsx`, the
stills of T-0030 §1), on T-0027 §3 (budget) and §5 (anchors), and on the 🎨 room panel
(`src/lib/room.ts`, `RoomPanel.tsx`, D-0022). English, British spelling. Examples: Biscuit the
house cat (current pet) and Kiki the koala, with 82 🍪.

In scope: the shop with seven categories, buying, dressing a pet, placing home items and a toy,
habitats, the window's weather, bought eggs, bought room decorations. Not here: pets playing with
toys and tricks (T-0032), the shelf creature (T-0033). No empty placeholders or "coming soon".

## 1. The numbers: earning against prices

D-0033 §2: 1 🍪 per 5 min + 10 per finished book. At 45 minutes a day and about a book a week that
is **≈ 9 🍪 a day, ≈ 75 🍪 a week** (T-0029's Feed and growth already use some of it). So:

| Price | Takes her about | Used for |
|---|---|---|
| 5–25 | today to 3 days | food (bought again and again) |
| 20–60 | 2 days to a week | outfits, toys, small home items |
| 60–100 | 1–1½ weeks | big home items, room decorations, cheaper habitats, a common egg |
| 120–160 | about 2 weeks | the castle library, rare and very rare eggs |
| 300 | about a month | a legendary egg |

**Everything once** (outfits, home, toys, habitats, decorations: 32 items, food and eggs left out)
costs **1,730 🍪 ≈ 23 weeks**: something new every few days at first, and the whole shop is a
half-year goal. One egg of each tier adds 930 🍪. All prices go in
`src/lib/creatures/numbers.ts` (`SHOP`), as Goal 2 says, and stay inside its ranges.

## 2. The item list (41 items for sale, prices in 🍪)

Ids are the keys in `SHOP` and the still's file name. "Slot" is where it goes.

**Food** (3; bought again and again, given straight to a pet, §6). Bigger food gives more growth per
cookie than Feed (5 🍪 = 5 growth):

| id | Name | Price | Growth |
|---|---|---|---|
| `berry-snack` | Berry snack | 5 | 6 |
| `honey-cake` | Honey cake | 12 | 15 |
| `picnic-feast` | Picnic feast | 25 | 35 |

**Outfits & accessories** (12; slot = the anchor of T-0027 §5: head → `hat`, face → `face`, neck
→ `neck`, back → `back`). Colours from the house palette (plum `#6e4f8f`, gold `#d9a85b`, cream
`#f3e9d8`, midnight `#1f2a4a`, sage `#a9c4a0`, rose `#e39aa8`):

| id | Name | Slot | Price | Look |
|---|---|---|---|---|
| `big-bow` | Big bow | Head | 20 | a rose bow tilted to one side |
| `bobble-hat` | Bobble hat | Head | 30 | plum knitted hat (ribbed torus brim), gold bobble |
| `flower-crown` | Flower crown | Head | 40 | a sage ring with five small cream and rose flowers |
| `little-crown` | Little crown | Head | 60 | a gold crown with five points, satin |
| `reading-glasses` | Reading glasses | Face | 25 | two round gold rims and a bridge |
| `heart-glasses` | Heart glasses | Face | 35 | two rose heart frames, dark lenses |
| `star-glasses` | Star glasses | Face | 40 | two gold star frames |
| `bow-tie` | Bow tie | Neck | 20 | a plum bow tie |
| `striped-scarf` | Striped scarf | Neck | 25 | a cream and plum striped ring with one end hanging |
| `bell-collar` | Bell collar | Neck | 30 | a rose collar with a small gold bell |
| `little-backpack` | Little backpack | Back | 45 | a sage backpack with a cream flap and two straps |
| `star-cape` | Star cape | Back | 55 | a midnight-blue cape with a gold star |

**Home** (9; slots in the den, §8): bed and rug replace the den's own gold cushion and plum rug;
"Put away" brings those back.

| id | Name | Slot | Price |
|---|---|---|---|
| `cloud-cushion` | Cloud cushion | Bed | 40 |
| `basket-bed` | Basket bed | Bed | 60 |
| `star-rug` | Star rug | Rug | 35 |
| `fairy-lights` | Fairy lights | Wall | 45 |
| `weather-window` | Window | Wall | 80 |
| `potted-plant` | Potted plant | Left corner | 30 |
| `mini-bookcase` | Mini bookcase | Left corner | 70 |
| `book-tower` | Book tower | Right corner | 30 |
| `reading-lamp` | Reading lamp | Right corner | 50 |

**Eggs** (6; bought again and again; D-0033 §6): Common egg 60 · Uncommon egg 90 · Rare egg 120 ·
Very rare egg 160 · Epic egg 200 · Legendary egg 300 (`EGG_PRICE`, already in `numbers.ts`).

**Toys** (3; one toy stands in the den at a time, slot Toy): `ball` Ball 25 · `yarn` Ball of yarn
30 · `slide` Slide 50.

**Habitats** (4, plus the free **Cosy den** she has; §9): `forest` Forest 80 · `beach` Beach 100 ·
`ice` Ice land 120 · `castle-library` Castle library 150.

**Reading room** (4; new `DecorKind`s, built like `Decorations.tsx`, each ≤ 0.16 wide):
`dragon-plush` Dragon plush 60 (a soft plum dragon with gold book wings, simple, not the creature
model) · `pennant` Pennant flags 70 (a tiny bunting of plum, gold and cream flags on two sticks,
within its own width) · `egg-display` Egg display 80 (three tiny eggs, cream, sage and gold, on a
wooden stand) · `snow-globe` Snow globe 100 (a glass dome on a gold base with a tiny tree and
still snow).

## 3. Where the shop is: two views in the Creatures tab

The tab already holds den, eggs, creature, pets, week and album; 41 cards under that would be a very
long page. So the tab gets **two views**, from the first pet on (before the welcome hatch the tab
stays as T-0029 has it):

- Under the h1 (on the wallpaper, left; the cookie pill stays at the right): a two-part switch
  **🏡 Den** · **🛍️ Shop**, in the header-pill style (white with `--pill-ink`, as D-0022 says for
  buttons on the wallpaper), the active one with the gold outline. Each is a link:
  `?view=creatures` and `?view=creatures&shop=<category>` (e.g. `&shop=outfits`), so the browser's
  Back works and a reload keeps the place. `aria-current="page"` on the active one.
- **Den view** = the tab exactly as T-0030 built it, plus two small secondary buttons:
  **👗 Dress up** in the creature card (after Rename) → Shop view, Outfits, dressing that pet; and
  **🛋️ Arrange** under the den canvas (right) → Shop view, Home.
- **Shop view**: the den card (the same live canvas, §10) and the **shop card**.
- Category in the URL; with none, **Food**. The last category is not remembered beyond the URL.

## 4. Layout

**1280 × 800, Shop view:** two columns, `gap --space-4`.
- Left (≈ 40 %, ~440 px): the den card, canvas 16:10 (~440 × 275), **sticky** (`top: var(--space-2)`
  inside `.dashboard`, like the arranging bar), so what she puts on shows while she scrolls the
  cards. Under the canvas, inside the den card, the **dressing strip** or **den strip** of the open
  category (§7, §8).
- Right (≈ 60 %): the shop card (`dash-card`): the category chips, the category heading (h2), then
  the item grid `repeat(auto-fill, minmax(9.5rem, 1fr))`, gap `--space-3`: **4 per row** (~150 px).

**390 × 844, Shop view:** one column, 16 px gutter.
- The den card, **sticky** at the top, canvas full width × **180 px** (wider than tall, so the
  corners still show). Nothing else in the sticky part.
- Then the strip of the open category (not sticky), the shop card with the chips (they wrap onto two
  rows, never a sideways scroll), the h2, and the grid, **2 per row** (~160 px).
- Between 390 and 1280 it just fits more or fewer; the two-column layout starts where the Den view's
  does.

**Both wallpapers:** only the h1, the cookie pill and the Den/Shop switch sit on the wallpaper (they
use the tokens D-0022 names); everything else is on walnut cards, so nothing changes per wallpaper.
Check the switch's gold outline on midnight in the screenshots.

## 5. The shop card

- **Category chips** (`chips`, one row of buttons, `role="tablist"` labelled "Shop"): **🍓 Food**,
  **🎀 Outfits**, **🛋️ Home**, **🥚 Eggs**, **🧶 Toys**, **🌲 Habitats**, **🎨 Room**. The open one has the
  gold wash and outline (`--accent-soft`, `--accent-line`), as T-0029's choose tiles.
- **h2 per category:** Food · Outfits & accessories · Home · Eggs · Toys · Habitats · Reading room.
- **The grid** is a `<ul>`; each card an `<li>`. Order: by slot, then price (the tables of §2).
- **Item card** (`--surface-raised`, 1 px `--border`, `--radius-card`), top to bottom:
  1. **Picture**: a square tile the full card width, `--surface-sunken` with the album's soft
     spotlight, the item's still (§10). Habitat cards: a 16:10 tile of the empty den in that
     habitat. A chip top left for the state (below).
  2. **Name** (bold, `--fs-body`, wraps).
  3. **One small line** (`--fs-small`, `--muted`): the slot ("Head", "Left corner", "Toy"), for
     food **"Grows Biscuit by 15"**, for eggs the tier line of T-0030 §6 ("◆◆◆ Rare").
  4. **Price row:** the price pill **"30 🍪"** (small, gold outline) and, when she can't afford it,
     **"12 🍪 more"** in `--muted` beside it.
  5. **The action button**, full card width, 44 px.

**The four states** (food and eggs have only the first two):

| State | Chip on picture | Price row | Button | Card |
|---|---|---|---|---|
| **Affordable** | none | 30 🍪 | **Buy** (secondary) | plain |
| **Too expensive** (balance < price, also when below 0) | none | 30 🍪 · 12 🍪 more | **Buy**, disabled look, stays focusable (`aria-disabled`) | plain; the picture stays in full colour (she should still want it) |
| **Owned** | **✓ Owned** | (no price) | Outfits **Put on Biscuit** · Home and toys **Place in the den** · Habitats **Use this habitat** · Room **Show in the room** | plain |
| **In use** | **✓ Wearing** · **✓ In the den** · **✓ Your habitat** · **✓ In the room** | (no price) | **Take off** · **Put away** · (habitat: none, a muted line "Your habitat now") · **Hide in the room** | gold outline and wash |

"Missing amount" = price − balance (with a balance of −4 and a price of 30: "34 🍪 more"). Food's
button reads **Give to Biscuit** (affordable) instead of Buy; eggs keep **Buy**. The Cosy den card
is always owned, price "Free" never shown: just ✓ Owned / ✓ Your habitat.

"Owned" for outfits and room decorations is about her, not about a device or a pet; "In use" for
outfits is about the pet being dressed (§7), for room decorations about this device (§11).

## 6. Buying: an inline confirm, never a pop-up (D-0013)

- **Tap Buy** (affordable, not food): in that card, the price row and the button are replaced by:
  - **"Buy the bobble hat for 30 🍪?"** (`--fs-small`, bold; `tabIndex=-1`, focus moves here, so a
    held Enter can't buy by repeat);
  - **Buy** (primary) and **Cancel** (secondary) side by side (stacked when the card is narrower
    than 150 px).
  - Escape = Cancel; Cancel restores the card and focus goes back to its Buy. Only one card is in
    confirm at a time: opening another closes the first.
  - Eggs: **"Buy a rare egg for 120 🍪?"**; decorations: "Buy the snow globe for 100 🍪?".
- **Tap Buy in the confirm:** the `buy` choice `{ item, price }` is saved at once (the price as
  shown, so later price changes never change it, Goal 3); the button is disabled from the tap until
  the card has re-rendered as owned, so two quick taps can't buy twice. The pill drops at once,
  without a count-down animation. Then, per category:
  - **Outfit:** the card is **Owned**; focus goes to its **Put on Biscuit** button. Not put on by
    itself.
  - **Home or toy:** Owned; focus to **Place in the den**.
  - **Habitat:** Owned; focus to **Use this habitat**.
  - **Room decoration:** **In the room** straight away (it joins the room switched on, §11); focus
    to its **Hide in the room**.
  - **Egg:** the card goes back to affordable/too expensive (eggs can be bought again); under the
    price row a line **"🥚 Waiting in your eggs · Hatch"**, where Hatch is a link to the Den view
    that starts the hatch (T-0030 §2, oldest egg first). That line stays until the egg is hatched.
- **Food: no confirm.** It acts on the tap, like T-0029's Feed (feeding never asks a confirm): the
  `buy` choice with `{ item, price, pet }` is saved and the growth goes to that pet. In the den the
  same reaction as Feed (§5 of T-0029); in the Shop view's den too. Quick taps each count (food may
  be bought again).
- **Balance changed meanwhile** (a fix to a past day on another device): if at Buy-in-confirm time
  the balance is below the price, nothing is saved, the confirm turns back into the too-expensive
  card and the live region says **"Not enough cookies any more."**
- **Live region** (the page's one polite `role="status"`): **"Bought the bobble hat. 52 cookies
  left."** · **"Bought a rare egg. It's waiting in your eggs."** · food: **"Biscuit ate the honey
  cake. 70 cookies left."** (+ T-0029's level-up words when it levels up).

## 7. Dressing a pet

- **Whom she dresses:** in the Outfits category, the den shows the **dressed pet**: the current pet
  at first, or the pet she came from with 👗 Dress up. With 2 or more pets, the dressing strip
  starts with a radio group **"Dress"**: a row of her pets' round 48 px pictures (T-0030's stills),
  each with its name under it (one line, ellipsis); arrow keys move and pick. Picking one shows it
  in the den (200 ms cross-fade) **without** changing the current pet. Leaving the Outfits category
  shows the current pet again.
- **The dressing strip** (in the den card under the canvas), heading **"Biscuit is wearing"**
  (h3), then four rows, one per slot, in this order: **Head · Face · Neck · Back**. Each row: the
  slot word (`--muted`), the item name or **"nothing"**, and for a worn item a small **Take off**
  button. 44 px rows; at 390 the rows are two columns (Head | Face, Neck | Back).
- **Put on Biscuit** (owned card): saves a `wear` choice (key `<pet id>:<slot>`, e.g.
  `welcome:head`; pet ids may hold colons, so the slot is after the last one) with the item. One
  item per slot: whatever was in that slot comes off. The new piece appears on the pet in the den at
  once (a small pop, scale 0.8 → 1 in 200 ms; none with reduce motion). That card turns **In use**,
  the card it replaced turns **Owned**.
- **Take off** (card or strip): a `wear` choice with item `none`.
- **One item, many pets:** an outfit she owns can be worn by several of her pets at once (each pet
  has its own four slots). The button always names the dressed pet.
- **On the pet:** each piece sits on its anchor, sized by the anchor's `userData.size` (made for size
  1 and scaled), inside the part (so it moves with the head or body and scales with the stage).
  Head pieces sit on `hat` and follow its tilt; glasses on `face`, centred on the eyes, a little in
  front so they never sink in; neck pieces around `neck`; backpack and cape on `back`. Accepted
  where the base model makes it so (T-0027 review): the book dragon's backpack sits under its
  wings, the unicorn's hat sits behind the horn.
- **Shown everywhere the pet is drawn live:** the den (Den and Shop views) and the dashboard block's
  still (rendered again when an outfit changes). The pet rows, Eggs card and album keep T-0030's
  plain pictures (the album shows the species, not her pet).
- **Released pet:** its outfits go with it; the items stay hers.
- **Live region:** **"Biscuit is wearing the bobble hat."** · **"Took off the bobble hat."**

## 8. Placing home items and a toy

- **The den strip** (Home and Toys categories), heading **"In the den"** (h3), six rows: **Bed ·
  Rug · Wall · Left corner · Right corner · Toy**; each with the item name or the default
  (**"Gold cushion"**, **"Plum rug"**) or **"nothing"**, and **Put away** for a placed item. At 390
  two columns.
- **Place in the den:** saves a `place` choice (key `home:<slot>`: `home:bed`, `home:rug`,
  `home:wall`, `home:left`, `home:right`, `home:toy`) with the item; one item per slot, the old one
  goes back to Owned. It appears in the den at once (fade in 200 ms). **Put away:** item `none`;
  bed and rug go back to the gold cushion and plum rug.
- **The six spots** (the den of T-0029 seen ¾ from the front right; positions in den units, the
  cushion at 0, 0, 0): bed = the cushion's spot (the pet sits on it); rug = under it; wall = the
  back wall centre, above the creature's head height; left corner = back left on the floor; right
  corner = back right on the floor; toy = the floor in front left (the bowl stays front right). All
  six must be fully in view at 390 (Den view 300 px and Shop view 180 px) and at 1280; the developer
  may pull the camera back up to 10 % (the grown-up then fills about 54 % of the height) and nudge
  the spots. Nothing may stand in front of the pet's face.
- **The window** (`weather-window`): an arched wooden frame with a cross bar on the back wall. The
  pane follows the device clock and date only (no outside service):
  - **Sky:** day 07:00–18:00 soft blue `#9cc3e6`; dawn 05:00–07:00 and dusk 18:00–20:00 peach
    `#e8b49a` to plum; night midnight `#1f2a4a` with a gold crescent and three tiny gold stars.
  - **Weather by month:** December–February **snow**, March–April and October–November **rain**,
    May–September **sun** (a soft round sun in the day pane, nothing extra at night).
  - Rain: thin pale streaks; snow: small white dots. On a computer they fall/drift (one `Points`
    of 40 or so); on a phone and with reduce motion they hold still.
  - At night the room does not get darker; only the pane changes.
- **Reading lamp:** its shade glows (emissive) with a soft warm glow sprite on the wall; no real
  extra light on a phone (shadows and lights stay as T-0029 set them).
- **Fairy lights:** a gently drooping string across the wall with 9 small warm bulbs; on a computer
  they twinkle slowly, on a phone they hold still.
- **Live region:** **"The reading lamp is in the den."** · **"Put the reading lamp away."** · with a
  replace: **"The slide is in the den. The ball is put away."**

## 9. Habitats

- **Use this habitat:** saves a `habitat` choice (key `den`) with the habitat id (`cosy` for the
  Cosy den). The den cross-fades to it (300 ms; instant with reduce motion). It is the den's
  background for every pet; home items, toy, bowl and pet stay where they are.
- **Looks** (each replaces only the back wall, side wall and floor, plus at most four backdrop props,
  all matte, vertex colours):
  - **Cosy den** (free): as T-0029 built it.
  - **Forest:** moss-green walls `#4f6b3f` with three rounded tree trunks `#6b4a32` and leafy
    crowns `#5f8a4a` against them, a mossy floor `#55703f`, two small mushrooms (cream caps with rose
    spots) by the left wall.
  - **Beach:** a sky wall `#9cc9d9` with a sea band `#5e9bb5` at the bottom, a sand floor `#e3cfa1`, a
    shell and a leaning palm leaf at the right.
  - **Ice land:** pale icy walls `#bcd6e6` with a few ice crystals, a snow floor `#eef3f7`, three
    icicles along the top of the wall.
  - **Castle library:** a stone wall `#6b6470` with two tall arched bookcases full of coloured book
    blocks, a deep red carpet `#7a2e3a` with a gold edge.
- The light habitats (beach, ice) must keep the creature readable: check a white-ish creature
  (polar bear, Adélie penguin) in them; if it washes out, darken the floor near the cushion, not the
  creature.
- **Live region:** **"The forest is your habitat now."** (Cosy den: "The cosy den is your habitat
  now.")

## 10. Phone performance: stills in the shop, one live den

- **One live canvas per page, still.** In the Shop view it is the den (sticky). Every card picture
  is a plain image: `public/creatures/shop/<id>.webp`, transparent, 192 × 192 (habitats 320 × 200,
  opaque), rendered in advance by the same dev-only script as T-0030's stills (¾ turned, the house
  lights), `loading="lazy"`, `decoding="async"`, width and height set. Eggs reuse `egg-<tier>.webp`.
  A test checks every `SHOP` item has its picture. A picture that fails: the T-0030 "?" tile.
- Only the open category's pictures load (the panels of other categories aren't rendered).
- **The den's budget** (the fullest den: a habitat, all six spots filled with the biggest items,
  the window with weather, a shiny grown-up wearing four pieces, a full bowl):
  - **phone (`low`): at most 60 draw calls and 20,000 triangles**; computer (`high`): at most 80
    draw calls and 40,000 triangles.
  - Per piece: an outfit ≤ 300 triangles on low and 1 draw call (vertex colours in the creature's
    shared materials where it can); a home item or toy ≤ 800 triangles and ≤ 3 draw calls; a habitat
    ≤ 3,000 triangles and ≤ 6 draw calls (it replaces the den's walls and floor, not adds to them);
    the weather 1 draw call; a glow 1.
  - A unit test builds that fullest den on `low` and `high` and checks the counts (like
    `models.test.ts`); the tester also notes `renderer.info.render.calls` from the running app on a
    390 viewport in *Test* (Done when 3).
- **Movement** (D-0033 §13): on a phone nothing new idles (weather, lights and lamp hold still);
  only her taps make things pop or fade. Frame loop, dpr, quality and stopping stay as T-0029 §12.
  Building: each item model is built once and reused.

## 11. Room decorations

- **Unlocked by her purchases** (the choices log, on every device); **shown or hidden per device**
  in the room settings (D-0022), like the eight there now.
- A bought decoration **joins the room switched on, at the top of the list** (the highest shelf
  spot, so it always has a shelf; Hanna 2026-11-23, review after building), on this device and on
  every other device the first time it sees the purchase. The decorations above it move one place
  down. Older saved rooms still load: `cleanRoom` adds missing *owned* decorations at the top
  switched on, and leaves out decorations she doesn't own.
- **The 🎨 room panel** lists only owned ones, with the same checkbox and ↑↓ as the others; its names
  are the §2 names. Not owned: not in the list at all (no locked rows, no "buy in the shop").
- **The shop card's Show/Hide in the room** flips the same per-device on/off as the panel (the 3D
  room follows when she next sees the shelf). Its chip says ✓ In the room only when it's on here.
- **Reset** in the room panel switches owned decorations on again and keeps them.
- **Live region:** **"The snow globe is in your reading room."** · **"The snow globe is hidden in
  the room on this device."**

## 12. Keyboard and screen reader

- **Tab order in the Shop view:** Den/Shop switch → den card (canvas skipped) → the strip (Dress
  radio group, Take off / Put away buttons) → category chips (one stop, arrows move, Enter/Space
  opens; or automatic activation, the developer's choice, as long as focus stays on the chip) → the
  cards, each: its one button (or confirm question → Buy → Cancel).
- **The category chips** are `role="tab"` with `aria-selected` and `aria-controls` on the grid's
  `role="tabpanel"`, labelled by the h2. Changing category updates the URL (`replace`, not a new
  history entry per chip).
- **Cards:** the name is an `h3`; the picture `alt=""` (the text says it all); the state chip text
  is real text ("Owned", "Wearing").
- **Labels:**
  - Buy: **"Buy the bobble hat for 30 cookies"**; too expensive: the same label, `aria-disabled`,
    described by the "12 🍪 more" text, read as **"12 more cookies needed"**.
  - Food: **"Give Biscuit a honey cake for 12 cookies"**.
  - Eggs: "Buy a rare egg for 120 cookies".
  - Put on: **"Put the bobble hat on Biscuit"** · Take off: "Take the bobble hat off Biscuit" ·
    Place: "Place the reading lamp in the den" · Put away: "Put the reading lamp away" · Use: "Use
    the forest as your habitat" · Show/Hide: "Show the snow globe in the room" / "Hide the snow
    globe in the room".
  - Price pills: "30 cookies" (🍪 `aria-hidden`).
- **Focus moves:** Buy → the confirm question; Cancel → back to Buy; confirmed buy → the card's
  new button (§6); Take off / Put away in a card → the card's new button; in a strip → the strip's
  heading. Dress up / Arrange → the shop card's h2.
- **The canvas** stays `aria-hidden` with its hidden description, which now names what she sees:
  **"Biscuit the house cat, a baby, wearing the bobble hat and the reading glasses, on the cloud
  cushion in the forest. In the den: the window with snow, the mini bookcase and the reading
  lamp."** Short when empty: as T-0029.
- Focus ring: the house gold `:focus-visible` everywhere.

## 13. Empty, error and edge states

- **Before the welcome hatch:** no Den/Shop switch; `&shop=` in the URL shows the Den view.
- **Nothing owned in a category:** the strip shows its rows with "nothing" / the defaults; no empty
  message needed (the cards are there to buy).
- **Balance at or below 0:** every card shows too expensive (food too).
- **Offline, not signed in, a server without the route:** no difference (D-0034); purchases are
  kept on the device and sent later.
- **A purchase or outfit change on another device:** follows on the next sync, without a message.
  A `wear` or `place` of an item this device thinks she doesn't own yet is ignored until the `buy`
  arrives.
- **No WebGL:** the den card is left out (as T-0029); the strips and cards still work; nothing
  else changes.
- **Long pet names** wrap inside a card's button ("Put on Hootsworth"), and get an ellipsis in the
  Dress row; the strip heading ("Hootsworth is wearing") wraps.
- **An item removed from the shop later:** what she bought stays hers and shown (owned items are
  never taken away); it just isn't sold any more.

## 14. Wording, all in one place

| Where | Text |
|---|---|
| Switch | 🏡 Den · 🛍️ Shop |
| Den view buttons | 👗 Dress up · 🛋️ Arrange |
| Chips | 🍓 Food · 🎀 Outfits · 🛋️ Home · 🥚 Eggs · 🧶 Toys · 🌲 Habitats · 🎨 Room |
| h2 | Food · Outfits & accessories · Home · Eggs · Toys · Habitats · Reading room |
| Card lines | Head · Face · Neck · Back · Bed · Rug · Wall · Left corner · Right corner · Toy · Grows Biscuit by 15 · ◆◆◆ Rare |
| Price | 30 🍪 · 12 🍪 more |
| Buttons | Buy · Give to Biscuit · Put on Biscuit · Take off · Place in the den · Put away · Use this habitat · Show in the room · Hide in the room · Cancel |
| Chips on pictures | ✓ Owned · ✓ Wearing · ✓ In the den · ✓ Your habitat · ✓ In the room |
| Habitat in use | Your habitat now |
| Confirm | Buy the bobble hat for 30 🍪? · Buy a rare egg for 120 🍪? |
| Egg bought | 🥚 Waiting in your eggs · Hatch |
| Strips | Dress · Biscuit is wearing · nothing · In the den · Gold cushion · Plum rug |
| Item names | §2 |
| Live region | Bought the bobble hat. 52 cookies left. · Bought a rare egg. It's waiting in your eggs. · Biscuit ate the honey cake. 70 cookies left. · Not enough cookies any more. · Biscuit is wearing the bobble hat. · Took off the bobble hat. · The reading lamp is in the den. · Put the reading lamp away. · The slide is in the den. The ball is put away. · The forest is your habitat now. · The snow globe is in your reading room. · The snow globe is hidden in the room on this device. |
| Waiting for you | a bought egg joins T-0030's egg line; its reason line: **From the shop** |

## 15. Screenshots (in `docs/tasks/T-0031-screens/`)

Demo data with about 400 🍪, three pets (Biscuit current), a few things owned. `390` = 390 × 844,
`1280` = 1280 × 800; `lav` / `mid` = the wallpaper.

1. `switch-390-lav.jpg`, `switch-1280-mid.jpg`: the tab's head with the Den/Shop switch.
2. `food-390-lav.jpg`, `food-1280-mid.jpg`: the Food category.
3. `outfits-390-lav.jpg`, `outfits-390-mid.jpg`, `outfits-1280-lav.jpg`, `outfits-1280-mid.jpg`: the
   Outfits category with the dressing strip, all four card states visible (one affordable, one too
   expensive, one owned, one wearing), Biscuit dressed in the den.
4. `confirm-390-lav.jpg`, `confirm-1280-mid.jpg`: a card in the buy confirm.
5. `bought-390-lav.jpg`: right after a buy (Owned, Put on Biscuit, pill lower).
6. `dress-other-1280-lav.jpg`: the Dress row with Kiki picked, Kiki in the den.
7. `outfits-on-1280-lav.jpg` (from `/style` or a dev page): each of the 12 outfits on the cat, the
   Adélie penguin, the koala, the book dragon and the unicorn (a contact sheet).
8. `home-390-lav.jpg`, `home-1280-mid.jpg`: the Home category with the den strip, a den with all six
   spots filled.
9. `window-day-1280-lav.jpg`, `window-night-snow-390-mid.jpg`, `window-rain-1280-lav.jpg`: the window
   (a test clock or a dev seed may set the time and month).
10. `habitats-390-lav.jpg`, `habitats-1280-mid.jpg`: the Habitats category; `habitat-forest-1280-lav.jpg`,
    `habitat-beach-1280-mid.jpg`, `habitat-ice-390-lav.jpg`, `habitat-castle-1280-lav.jpg`: the den in
    each (beach and ice with a light creature).
11. `eggs-390-lav.jpg`, `eggs-1280-mid.jpg`: the Eggs category, one egg just bought ("Waiting in your
    eggs").
12. `toys-390-mid.jpg`: the Toys category with the slide in the den.
13. `room-390-lav.jpg`, `room-1280-mid.jpg`: the Reading room category; `room-panel-1280-lav.jpg`: the
    🎨 panel listing a bought decoration; `room-3d-1280-lav.jpg`, `room-3d-390-mid.jpg`: it on the 3D
    shelf.
14. `poor-390-lav.jpg`: a balance below 0, every card too expensive.
15. `block-dressed-390-lav.jpg`, `block-dressed-1280-mid.jpg`: the dashboard block with Biscuit
    dressed.
16. `den-arrange-390-lav.jpg`: the Den view with 👗 Dress up and 🛋️ Arrange.

## Questions for Hanna in the morning

I took the recommended option for each tonight; each is easy to change.

1. **The shop's place:** a **Den | Shop** switch at the top of the Creatures tab, rather than the
   shop as one more long block under the album. *Recommended: the switch.*
2. **One outfit, several pets:** a hat she bought can be worn by all her pets at the same time.
   *Recommended: yes.* Or should each piece be on one pet at a time?
3. **Food without a confirm:** a snack, cake or feast is given on the tap (like Feed); everything
   else asks "Buy … for … 🍪?" first. *Recommended: as is.*
4. **The item list and prices** (§2: 12 outfits, 9 home items, 3 toys, 4 habitats, 4 room
   decorations; all of it once ≈ half a year of reading). Anything to add, drop or make cheaper?
5. **Weather in the window by month:** snow December–February, rain March–April and
   October–November, sun May–September. *Recommended: as is.* Or mix weather day by day?
6. **A bought room decoration** appears switched on at the bottom of her decorations list.
   *Recommended: as is.*
7. **A bought egg** joins the eggs in Waiting for you ("From the shop") like a milestone egg.
   *Recommended: yes*, so it hatches the same way.

## Additions to *Done when* (for the tester)

See items 5 to 10 under *Done when*.

## Build notes (developer, 2026-11-23)

Built at night, nothing asked; where the task left a choice I took the recommended or simplest
option and list it here for the UX review and the tester.

**Where things are**

- Lib: `src/lib/creatures/shop.ts` (the 41 items and the Cosy den, categories, what `buy`, `wear`,
  `place` and `habitat` add up to in `deriveShop`, and `buyEvent` / `wearEvent` / `placeEvent` /
  `habitatEvent` that refuse before anything is saved), `numbers.ts` (`SHOP` prices, `FOOD_GROWTH`),
  `weather.ts` (sky by the clock, weather by the month), `creature.ts` (spent = feeds + purchases,
  food growth, bought eggs with the milestone eggs), `eggs.ts` (egg kind `shop`), `words.ts` (all
  T-0031 wording, the den's longer description), `room.ts` / `shelfLayout.ts` (the four bought
  decorations: in the room only when owned).
- UI: `creatures/Shop.tsx` (the Den | Shop switch, the shop card with chips, the item cards in four
  states with the inline confirm, the Dress row and both strips), `CreaturesPage.tsx` (the two
  views, Dress up and Arrange, the den's shop actions and live region), `CreaturesContext.tsx` (`buy`,
  `wear`, `place`, `setHabitat`; `useCreaturesValue` so the route can read her purchases),
  `useCreatureChoices.ts` (`buy` refuses a once-only item the stored log already has),
  `routes/index.tsx` (`&shop=<category>`, the room gets her owned decorations), `RoomPanel.tsx`
  (`useRoom(owned)`), `Decorations.tsx` (the four new decorations on the shelf), `CreaturesCard.tsx` /
  `CreatureStill.tsx` (the block's picture dressed), `styles.css` (the shop section at the end).
- 3D: `creatures/shopModels.ts`: every shop item as plain three.js (colours baked into vertex colours,
  merged per material, built once and cloned), the outfits on the anchors (`dressCreature`), the six
  spots, the four habitats and the Cosy den, the window with its sky and weather, the bowl, food (for
  the pictures only), the four room decorations, the den's camera, and `drawCost` for the budget test.
  `DenScene.tsx` now draws its room, cushion, rug and bowl from these builders too.
- Pictures: `public/creatures/shop/` (35 items + the Cosy den, 192 × 192 transparent; habitats and the
  Cosy den 320 × 200 opaque; 127 KB), made by `pnpm run render:creatures -- --shop` with T-0030's
  script and lights (`creatures/shopStills.ts`). Eggs reuse `egg-<tier>.webp`. The contact sheet of
  §15.7 comes from `pnpm run render:creatures -- --outfit-sheet <file.png>`.

**Choices taken (and deviations from *Design*)**

1. **Camera and spots (§8):** pulled back the full 10 % the design allows, and the look point lowered
   from 0.62 to 0.55 so the bed's front edge stays in view; the bowl nudged in from (0.72, −0.32) to
   (0.66, −0.36). Spots: bed (0, 0, 0), rug (0, 0, 0.05), wall (−1.7, 0, −1.58) with the window's sill at
   0.9, left corner (−1.5, 0, −0.75), right corner (0.25, 0, −1.35), toy (−0.62, 0, 0.4). A unit test
   projects every item of every spot with the den's camera at 334 × 300, 334 × 180 and 16:10: all
   fully in view. **Deviation:** the rug spot. The plum rug (T-0029) and the star rug (outer radius
   0.98) are wider than the phone's den, as the plum rug always was; only their middle shows at 390.
2. **Outfit sizes (the `hat` anchor):** the `hat` anchor's size is the free width between the ears
   (T-0027 §5: 0.18 for the foxes to 0.4 for the axolotl), not the head's, so hats are kept between
   0.26 and 0.36 wide (`outfitScale`). Neck pieces sit at 1.45 × the neck ring's radius (at 1 × they
   vanished inside the fur, seen on the first contact sheet). Every model turns its `back` anchor by π,
   so back pieces are built facing +z. Accepted as the design says: the book dragon's backpack sits
   under its wings, the unicorn's hat behind its horn (both on the contact sheet).
3. **Pet ids with colons:** a `wear` key's slot is after the last colon (`splitWearKey`); tested with
   `m:books-5:head` and `shop:<purchase id>:back`.
4. **No double buy:** the confirm's Buy ignores a second tap until the card re-renders; the hook also
   refuses a once-only item its stored log already has; and the derivation counts a once-only item
   once even if two devices both bought it (paid once). Food and eggs count every time.
5. **A bought egg's tier** comes from its purchase (`shop:<purchase id>`, `tierOf` in
   `deriveCreatures`); its hatch is then the same seeded species and shiny as a milestone egg's.
   Bought eggs wait with the milestone eggs, oldest first ("From the shop").
6. **Food** goes to the current pet (the den shows it in Food), with T-0029's feed reaction and its
   level-up words after "Biscuit ate the honey cake. 70 cookies left."
7. **Motion:** a new outfit pops (0.8 → 1, 200 ms); a placed item grows in from 90 % in 200 ms (my
   reading of "fades in"); a new habitat fades in from a soft veil in 300 ms (CSS); none of these
   with reduce motion. **Deviation:** the Dress row switches the den's pet at once, without the 200 ms
   cross-fade. Weather falls and fairy lights twinkle only on a computer without reduce motion.
8. **Room decorations:** the route now holds the creatures state (`useCreaturesValue`) and passes it
   to `CreaturesProvider`, so `useRoom(owned)` sees her purchases on every device. A decoration seen
   for the first time joins the end switched on; Reset switches owned ones on again. **Observation for
   the architect / UX:** the shelf keeps at most one decoration per shelf (as before), so on a short
   shelf the 9th or 10th decoration (where a bought one joins) has no shelf until she moves it up
   with ↑ or hides another. The 3D screenshots move the two bought ones up.
9. **Same-millisecond settings:** two setting choices of one key in the same millisecond are decided
   by the larger id (D-0034's rule); only tests can tap that fast, so they step the clock.
10. **T-0028 merged meanwhile:** its route accepts `buy`, `wear`, `place` and `habitat` and never
    drops a `buy`, so purchases sync as they are. Nothing in `deploy/nas/`, `src/server/shelf.ts`,
    `src/lib/shelfMerge.ts` or any other CODEOWNERS path is changed.

**Checks**

- Budget (unit test, `denBudget.test.ts`, the costliest habitat, item per spot, species and piece per
  slot, a shiny grown-up with its 8 sparkles, a full bowl): **low 38 draw calls, 4,879 triangles**;
  **high 59 draw calls, 16,445 triangles** (shadow casters counted twice). Every outfit 1 draw call
  and ≤ 300 triangles on low; every home item and toy ≤ 3 and ≤ 800; every habitat ≤ 6 and ≤ 3,000.
- In the browser (390 × 844, dev server, software WebGL), the fullest den (castle library, all six
  spots, Biscuit in four pieces, not shiny): **28 draw calls and about 3,890 triangles per frame**
  (WebGL draw calls counted over 30 frames on the den's canvas).
- Screenshots: all 36 files of §15 in `docs/tasks/T-0031-screens/`, from the no-backend dev server on
  port 3165 with demo data (Biscuit the house cat current, Hazel the red squirrel, Frost the polar
  bear, a few things owned; balances set with a feed where a shot needs one). In
  `room-panel-1280-lav` the shelf behind the panel hadn't finished drawing under headless software
  WebGL (it also happens without any purchase); the panel's list is the subject.

## After the review (developer, 2026-11-23)

The three must-fixes from *Review after building*:

1. **Seat height per bed (also closes F14).** `shopModels.ts`: `BED_SEAT_Y` and `seatYOf(bed?)` —
   gold cushion 0.18, cloud cushion 0.22, basket bed 0.14. `DenScene.tsx` passes the seat to the egg,
   the crack and the creature, so the pet (and the egg) stands **on top** of whichever bed she has
   placed, and a new bed changes it at once. Four new verification shots in `docs/tasks/T-0031-screens/`:
   `bed-egg-gold-cushion-390-lav.jpg`, `bed-basket-390-lav.jpg`, `bed-cloud-cushion-390-lav.jpg`. The
   `denBudget.test.ts` spot-projection test still passes.
2. **Rain visible and inside the pane.** `shopModels.ts` → `buildWindow`:
   - A rain-day sky is a little greyer: top `#8fa9bf`, bottom `#a9bccb` (triggered when
     `weather === 'rain' && sky !== 'night'`; night rain stays the night sky).
   - Rain is **thin slanted white streaks** (0.006 × 0.04 quads, tilted ~20°), merged into one
     mesh (still one draw call, no gl_PointSize cap under swiftshader to worry about). Snow stays
     as white Points as before.
   - The scatter uses rejection sampling inside the pane's arched shape (rectangle for the body,
     half-disc for the arch); the `userData.archTop` / `archR` let the DenScene clamp x when a drop
     wraps to the top on a computer, so nothing lands outside the frame.
   - New screenshots: `window-rain-1280-lav.jpg`, `window-rain-390-mid.jpg`.
3. **Bought decoration joins at the top of the 🎨 list** (Hanna 2026-11-23). `cleanRoom` in
   `src/lib/room.ts` now prepends owned decorations missing from the saved room instead of
   appending. `shop.test.ts` and `CreaturesShop.test.tsx` updated to expect the top. Design §11 and
   Done when 9 both say "at the top". Re-taken: `room-3d-1280-lav.jpg`, `room-3d-390-mid.jpg`,
   `room-panel-1280-lav.jpg` — all three without moving anything by hand (the shelf layout places
   the two bought decorations on the top shelves on its own).

Nothing else was changed and no polish from "Not required" was taken on.

**Checks (after the fixes)**

- `pnpm exec tsc --noEmit`: clean.
- `pnpm test`: **1553 passed, 22 skipped** (120 files); den budget low **38 / 4,915 triangles**, high
  **59 / 16,013 triangles**. Touched tests all pass: `shop.test.ts`, `denBudget.test.ts`,
  `CreaturesShop.test.tsx`, `CreaturesBlockDress.test.tsx`.
- `pnpm run build`: ✓.
- `pnpm exec harness check`: ✓.
- Dev server on 3165 stopped, port free.

## Review after building (2026-11-23)

UX designer, daytime; Hanna not asked (her question is in the hand-over). Looked at: the diff
(`git diff origin/main...HEAD -- src`, mainly `Shop.tsx`, `shopModels.ts`, `DenScene.tsx`,
`room.ts`, `shelfLayout.ts`, `weather.ts`), all 36 screenshots, the 36 shop pictures side by
side, and the outfit contact sheet rendered again at full size
(`pnpm run render:creatures -- --outfit-sheet`, 200 px a tile).

**Verdict: changes needed.** The shop matches the Design almost everywhere; three things must be
fixed before the tester takes it.

### Design checks

| Done when | Seen | |
|---|---|---|
| 5. Den / Shop switch, 7 categories, 41 items and prices, category in the URL | `switch-*`, every category shot; prices as §2; `?view=creatures&shop=` | ✓ |
| 6. Four card states, "N 🍪 more", inline confirm, food on the tap | `outfits-*` (all four), `poor-390-lav` (−4: "44 🍪 more" on 40), `confirm-*`, `food-*` | ✓ |
| 7. Outfits on the anchors, Dress row, dashboard block, contact sheet | `outfits-*`, `dress-other-1280-lav`, `block-dressed-*`, contact sheet | ✓ (deviations accepted below) |
| 8. Home, toy, habitat at once; six spots in view; window by clock and month | `home-*`, `toys-390-mid`, habitat shots, `window-*` | ✗ the rain (must-fix 2); feet in the bed (must-fix 1) |
| 9. Bought decoration in the 🎨 panel and on the 3D shelf | `room-*` | ✗ it joins where it has no shelf (must-fix 3) |
| 10. Keyboard and screen reader, budget | `Shop.tsx`: tablist / tab / tabpanel, the radio group "Dress", the §12 labels, Escape, focus moves; budget low 38 calls / 4,879 triangles | ✓ (the tester confirms with a keyboard) |

What matches: the switch and its gold outline on both wallpapers; the sticky den (180 px at 390,
16:10 at 1280); chips, h2s, card order and every §14 word I checked; the four states, the
missing amount below 0, "Give to Biscuit", the inline confirm with Buy and Cancel, the egg's
"🥚 Waiting in your eggs · Hatch"; both strips (two columns at 390); the window's day, night
(crescent and stars) and snow; the four habitats, with the polar bear still readable on the beach
and the ice; the dashboard block dressed; the 36 pictures, which match §2's looks (small
differences, like the dragon plush's cream rather than gold wings, are fine).

### The developer's deviations

1. **Camera pulled back the full 10 %, look point lowered** — accepted. That is inside what §8
   allows, and all six spots show at 390 (Shop view) and at 1280 (`home-*`). The window sits at
   the left of the back wall rather than in the middle; also accepted, because in the middle it
   would sit behind her pet's head.
2. **Rugs wider than the phone den** — accepted. The plum rug was always like that, and a rug
   going off the edge still reads as a rug (`home-390-lav`: only the star's lower tip is cut).
3. **Hat and neck sizes** — accepted. The hats sit between the ears as little hats and read well
   on every species; on the penguin and the koala they look a bit small, but nothing sinks or
   floats. The neck pieces at 1.45 × read as worn, not as rings in the air. The book dragon's
   cape sits under its wings, the same as its backpack does (an accepted case).
4. **No cross-fade in the Dress row** — accepted. The switch is instant, the strip's heading and
   the buttons change with it, and nothing jumps around the den. Not worth the extra code.
5. **One decoration per shelf, so a bought one may have no shelf** — **not accepted** (must-fix
   3). She pays 60–100 🍪, the card says "✓ In the room", and on a normal shelf nothing appears
   until she finds the ↑ buttons in the 🎨 panel. That breaks the promise of the purchase.

### Must fix

1. **The creature stands on top of its bed, not in it (this also fixes F14).** `DenScene.tsx`
   puts the creature and the egg at `SEAT = 0.1`, but the gold cushion's top is at about 0.18
   (unchanged from main, so the shop didn't make the gold cushion worse: that is F14). The new
   **cloud cushion** makes it worse: its middle puff's top is at about 0.22, so her pet's feet
   sink about 40 % deeper than they do now (the basket bed's cream is at about 0.14, a little
   too). Fix: the seat height per bed (gold cushion, cloud cushion, basket bed), taken from each
   bed's own top where the feet are. The creature and the egg go to that height, and a new bed
   changes it at once. Check the egg and a grown-up on each bed in a screenshot, and that the six
   spots still pass the projection test. This is a small change, so do it here and close F14 with
   it (say so in the PR).
2. **The rain has to be visible, and all weather stays inside the pane.** In
   `window-rain-1280-lav` the window looks like a plain day sky: 40 pale `#dbe9f5` dots of 0.02
   on a `#9cc3e6`–`#b9d6ee` pane barely show, and they are dots, not streaks. It is November, so
   this is what Hanna sees first. Fix: (a) a rain-day sky a little greyer (e.g. `#8fa9bf` to
   `#a9bccb`), and (b) thin streaks that read on it: short slanted lines in white at about 0.8
   opacity, still one draw call, held still on a phone. Also, the scatter fills a rectangle
   `W × 0.92` up to `H + 0.8 R`, but the arch narrows at the top, so drops land on the wall
   outside the frame (one shows top right in that shot). Keep every rain and snow point inside
   the pane's shape. New screenshot: `window-rain-1280-lav.jpg`, plus a 390 one.
3. **A bought decoration always gets a shelf.** Replace §11's "joins at the end" with "joins
   switched on **at the top** of the decorations list". `computeLayout` always makes room for
   the first decoration, and the others move one place down. This applies on this device and on
   every other device the first time it sees the purchase (`cleanRoom`, the shop's Buy). Reset
   keeps its order rule. Done when 9 is updated to match. Redo `room-3d-1280-lav` and
   `room-3d-390-mid` without moving anything by hand, plus `room-panel-1280-lav` showing it at the
   top.

**Not required** (polish, the developer's choice): in the den strip at 390, rows without a Put
away button are shorter than rows with one (`toys-390-mid`), so the two columns don't line up;
the "Dress" label of the radio group is only for screen readers; and at 1280 the chips wrap
"Room" onto a second row. Leave each as it is if it costs more than a line or two of CSS.

# Test

# Log

- 2026-11-22 architect: wrote CR3 from Hanna's brief (food, outfits, home, eggs, toys, habitats,
  room decorations); all item models on normal agents from Fable's anchor points. Size: full.
- 2026-11-23 ux-designer: designed (Den | Shop switch, seven categories, 41 items with prices
  balanced at ≈ 75 🍪 a week, card states, inline buy confirm, dressing any pet at the T-0027
  anchors, six den spots and the weather window, four habitats, room decorations unlocked by
  purchase and shown per device, stills only with one live den at ≤ 60 draw calls / 20,000
  triangles on a phone, keyboard and screen reader, wording, screenshots); Done when 5–10 added.
  Hanna not asked (night): 7 questions for the morning under *Design*. Hand-over to the developer.
- 2026-11-23 developer: built CR3 on branch `t-0031-creature-shop`: the Den | Shop switch with the
  category in the URL (`&shop=`, chips replace, the switch pushes), the shop card with seven
  categories and the 41 items with prices in `SHOP`, the four card states with "N 🍪 more", the inline
  buy confirm (Escape cancels, a double tap buys once), food given on the tap, dressing any pet on the
  T-0027 anchors (the Dress row, one per slot, shown in the den and on the dashboard block), the six
  den spots for home items and a toy, four habitats and the Cosy den, the window's sky and weather from
  the clock and month, bought eggs hatching like milestone eggs, four room decorations that join the 🎨
  panel and the 3D shelf on every device and show or hide per device, keyboard and screen reader
  labels and the live region's words; 36 pre-rendered shop pictures from the same models. Purchases
  are `buy` / `wear` / `place` / `habitat` choices in the existing log (D-0034). Choices and
  deviations under *Build notes* (nothing asked). Checks: `tsc --noEmit` no output; `pnpm test`
  1553 passed, 9 skipped (119 files), of which new: `shop.test.ts` 26, `CreaturesShop.test.tsx` 20,
  `denBudget.test.ts` 12, `CreaturesBlockDress.test.tsx` 1, `stills.test.ts` +1; den budget low 38
  calls / 4,879 triangles, high 59 / 16,445; browser at 390: 28 calls, ~3,890 triangles a frame;
  `pnpm run build` ✓; `harness check` ✓ (tasks, decisions, engineers, generated files). Dev server on
  3165 stopped, port free. Draft PR #255. Remaining: the UX review, the tester, and Hanna's look at the shop on the
  live site.
- 2026-11-23 ux-designer: reviewed: changes needed. Accepted: the camera pull-back, rugs wider
  than the phone den, hat and neck sizes, no cross-fade in the Dress row. Must fix: (1) the
  creature on top of each bed (the cloud cushion swallows its feet deeper; fixes F14 too), (2) rain
  visible and all weather inside the pane, (3) a bought decoration joins at the top of the list so
  it always has a shelf (Done when 9 updated). Back to the developer. Remaining: the fixes, the
  tester, and Hanna's look at the shop on the live site.
- 2026-11-23 developer: applied the three must-fixes from the review in one commit. (1) Seat
  height per bed (`BED_SEAT_Y` in `shopModels.ts`, `seatYOf(bed?)`): gold cushion 0.18, cloud
  cushion 0.22, basket bed 0.14; passed into the egg, the crack and the creature in `DenScene.tsx`;
  closes backlog F14. (2) Rain: rainy-day sky `#8fa9bf`/`#a9bccb` and short slanted white streaks
  (merged into one mesh so it stays one draw call, no `gl_PointSize` to fight in swiftshader);
  scatter uses rejection sampling inside the pane's arched shape; `archTop`/`archR` keep drops
  clamped inside the arch after wrapping on a computer. (3) `cleanRoom` prepends owned
  decorations at the top (Design §11 updated, Hanna 2026-11-23). Tests updated and all 1553 pass;
  den budget low 38 / 4,915 triangles, high 59 / 16,013; `tsc --noEmit` clean; `pnpm run build` ✓;
  `harness check` ✓. New screenshots: `bed-egg-gold-cushion-390-lav`, `bed-basket-390-lav`,
  `bed-cloud-cushion-390-lav`, `window-rain-390-mid`; re-taken: `window-rain-1280-lav`,
  `room-3d-1280-lav`, `room-3d-390-mid`, `room-panel-1280-lav`. One commit, one CI run (Hanna
  asked to save build minutes). Remaining: the tester and Hanna's look at the shop on the live site.
