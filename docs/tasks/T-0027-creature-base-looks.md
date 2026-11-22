---
id: T-0027
title: "Design the base 3D look of the 20 book creatures, each once by a Fable agent"
description: "First step of the book creatures (D-0033): the species list with rarity, IUCN Red List category and source in the code, and one cute low-poly 3D base model per creature, designed once per animal by an agent on the Fable model; shown on the unlinked /style page; nothing in the app links to them yet."
status: Doing
size: full
depends_on: []
decisions: [D-0002, D-0017, D-0020, D-0022, D-0033]
raised_on: 2026-11-22
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/241"]
---

# Goal

Hanna wants a reading game with cute 3D creatures (koala/cat style) she collects by reading
([the brief](../book-creatures-brief.md), D-0033). Every later creature task builds on their looks,
so this task makes them first:

1. **The species list** in the code (`src/lib/creatures/species.ts`): the 20 creatures below, each
   with an id, a name, its tier, for a real animal the scientific name, IUCN Red List category,
   assessment year where known and source, and its shiny palette (every creature has one). Order:
   commons first; she picks her first creature from those five (D-0033 §3).
2. **One base model per creature**: a cute, chunky, low-poly look built from three.js primitives
   (no model files, no new package, D-0002), designed **once per animal by an agent on the Fable
   model**. Each model is a function that builds a `THREE.Group` from a shared set of parameters, so
   later tasks can grow, recolour, dress and animate it without Fable.
3. **A "Creatures" section on the unlinked /style page** showing all 20 slowly turning, on both
   wallpapers, so Hanna and the UX designer can see them. Nothing in the app links to them yet.

## The 20 creatures (verified 2026-11-22)

iucnredlist.org refuses automated reading (403), so each category was checked in sources that cite
the Red List: the IUCN's own press releases, BirdLife International (the Red List authority for
birds), the IUCN SSC specialist groups, or databases quoting the assessment. **The developer
re-checks each one on iucnredlist.org in a browser before merging** and notes the date in *Log*.

| # | id | Creature | Scientific name | Red List (year) | Tier | Shiny | Source |
|---|---|---|---|---|---|---|---|
| 1 | `cat` | House cat | *Felis catus* | Not on the list (domestic) | common | yes | [Mammal Diversity Database: Not Evaluated, domesticated](https://mammaldiversity.org/taxon/1005985) |
| 2 | `red-fox` | Red fox | *Vulpes vulpes* | Least Concern | common | yes | [IUCN SSC Canid Specialist Group](https://canids.org/species/view/PREKLP237241), [EUNIS (IUCN)](https://eunis.eea.europa.eu/species/11350) |
| 3 | `capybara` | Capybara | *Hydrochoerus hydrochaeris* | Least Concern (2016) | common | yes | [Mammal Diversity Database](https://www.mammaldiversity.org/taxon/1001209), [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/capybara) |
| 4 | `red-squirrel` | Eurasian red squirrel | *Sciurus vulgaris* | Least Concern | common | yes | [Mammal Diversity Database](https://www.mammaldiversity.org/taxon/1001701) |
| 5 | `adelie-penguin` | Adélie penguin | *Pygoscelis adeliae* | Least Concern | common | yes | [BirdLife DataZone factsheet](https://datazone.birdlife.org/species/factsheet/adelie-penguin-pygoscelis-adeliae/summary) |
| 6 | `hedgehog` | European hedgehog | *Erinaceus europaeus* | Near Threatened (2024) | uncommon | yes | [IUCN press release Oct 2024](https://iucn.org/press-release/202410/more-one-three-tree-species-worldwide-faces-extinction-iucn-red-list), [Mammal Society](https://mammal.org.uk/press-hub/breaking-european-hedgehog-listed-as-near-threatened-on-iucn-red-listnbsp) |
| 7 | `otter` | Eurasian otter | *Lutra lutra* | Near Threatened (2022) | uncommon | yes | [IUCN SSC Otter Specialist Group](https://otterspecialistgroup.org/osg-newsite/?p=788) (Loy et al. 2022, e.T12419A218069689) |
| 8 | `platypus` | Platypus | *Ornithorhynchus anatinus* | Near Threatened (2016) | uncommon | yes | [Mammal Diversity Database](https://mammaldiversity.org/taxon/1000001), [Australian Museum](https://australian.museum/Platypus) |
| 9 | `koala` | Koala | *Phascolarctos cinereus* | Vulnerable (2016) | rare | yes | [Mongabay, May 2026: latest IUCN assessment still Vulnerable](https://news.mongabay.com/2026/05/australias-new-national-park-links-habitat-to-protect-koalas/), [IFAW](https://www.ifaw.org/international/journal/koala-faq) |
| 10 | `giant-panda` | Giant panda | *Ailuropoda melanoleuca* | Vulnerable (2016) | rare | yes | [Smithsonian's National Zoo](https://www.nationalzoo.si.edu/animals/news/giant-panda-status-upgraded-endangered-vulnerable) |
| 11 | `polar-bear` | Polar bear | *Ursus maritimus* | Vulnerable (2015) | rare | yes | [IUCN SSC Polar Bear Specialist Group](https://www.iucn-pbsg.org/iucn-redlist/), [IUCN press release](https://www.iucn.org/content/new-assessment-highlights-climate-change-most-serious-threat-polar-bear-survival-iucn-red-list) |
| 12 | `red-panda` | Red panda | *Ailurus fulgens* | Endangered (2015) | very rare | yes | [GBIF (IUCN)](https://gbif.org/species/113392444), [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/red-panda) |
| 13 | `emperor-penguin` | Emperor penguin | *Aptenodytes forsteri* | Endangered (2026) | very rare | yes | [IUCN press release, 9 April 2026: Near Threatened → Endangered](https://iucn.org/node/46369), [Smithsonian](https://www.smithsonianmag.com/smart-news/as-their-antarctic-habitat-melts-away-emperor-penguins-are-now-considered-an-endangered-species-180988520/) |
| 14 | `ring-tailed-lemur` | Ring-tailed lemur | *Lemur catta* | Endangered (since 2012) | very rare | yes | [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/ring-tailed-lemur), [Mongabay](https://news.mongabay.com/2013/12/madagascars-most-famous-lemur-facing-big-threats/) |
| 15 | `african-penguin` | African penguin | *Spheniscus demersus* | Critically Endangered (2024) | epic | yes | [BirdLife DataZone factsheet](https://datazone.birdlife.org/species/factsheet/african-penguin-spheniscus-demersus/summary), [SANCCOB](https://sanccob.co.za/news/african-penguin-newly-classified-as-critically-endangered-as-breeding-pairs-fall-below-10000/) |
| 16 | `axolotl` | Axolotl | *Ambystoma mexicanum* | Critically Endangered (2020) | epic | yes | [AmphibiaWeb (cites the 2020 IUCN assessment)](https://amphibiaweb.org/species/3842) |
| 17 | `book-dragon` | Book dragon | fantasy | — | legendary | yes | — |
| 18 | `library-owl` | Library owl | fantasy | — | legendary | yes | — |
| 19 | `bookmark-fox` | Bookmark fox (ribbon-bookmark tails) | fantasy | — | legendary | yes | — |
| 20 | `starlight-unicorn` | Starlight unicorn | fantasy | — | legendary | yes | — |

Tiers: 5 common, 3 uncommon, 3 rare, 3 very rare, 2 epic, 4 legendary. Two corrections to the
examples in the brief, following her rule that the Red List decides: the **emperor penguin** is
no longer Near Threatened but **Endangered** since 9 April 2026 (very rare), and the **koala** is
Vulnerable (rare), not common. Penguins appear three times on purpose (Adélie common, emperor very
rare, African epic): the same family at three Red List levels.

The card label is the category in words ("Vulnerable"); for the house cat "Domestic, not on the
Red List". Each entry keeps its source URL and year for the card's small source line (T-0030).

# Done when

1. `pnpm test` passes and includes `src/lib/creatures/species.test.ts`, which checks: exactly 20
   species with unique ids; tiers 5/3/3/3/2/4; every real animal has a scientific name, a Red List
   category that matches its tier by D-0033's mapping, and a source URL; fantasy ones are
   legendary with no category; the first five in the list are the commons; all 20 have
   `shiny: true` and a shiny palette (D-0033 §5).
2. A test builds every base model with default parameters and finds: a `THREE.Group`, at most
   **3,000 triangles** and **12 draw calls** per creature (phone budget), the named anchor points
   every model must have (`head`, `hat`, `face`, `neck`, `back`, `paw`, `seat`), and that the model
   stands on y = 0 and is about 1 unit tall.
3. On `pnpm run dev`, `/style` shows a **Creatures** section with all 20 turning slowly, each with
   its name, tier and Red List label, on the lavender and the midnight wallpaper, at 390 × 844 and
   1280 × 800. Screenshots of all four in `docs/tasks/T-0027-screens/`.
4. The UX designer confirms in *Design* that the 20 read as one family (same style, proportions,
   eye style) and that each animal is recognisable at the size of a dashboard block (about 120 px).
5. *Log* lists the Fable agents' reported token totals, one line per creature and a total.
6. (UX) The model test also finds, for every creature: at most **1,500 triangles on `low`**; the
   required parts `part:body`, `part:head`, `part:eyes`, `part:armL`, `part:armR` (Design §5);
   every anchor with a `userData.size` above 0; a bounding box 0.95–1.15 high, at most 1.1 wide;
   and no colour literal in `src/components/creatures/models/*.ts` (all colours come from the
   palette, so a shiny is a palette swap).
7. (UX) In the screenshots, building a creature with another palette (one shiny from Design §7)
   changes every visible colour except the eyes, glints and blush.

# Notes

## The modelling step is split in two (D-0033 §14)

**Step A: Fable, base looks only.** For each of the 20 creatures the developer starts **one** agent
with the Agent tool and `model: "fable"`. Its brief: the UX designer's style sheet (below), the
shared parameter type and anchor names (written by the developer first, in
`src/components/creatures/model.ts`), and that one creature's row from the table. It writes one file,
`src/components/creatures/models/<id>.ts`, exporting `build<Name>(p: CreatureParams): THREE.Group`,
and returns its token count. Nothing else: no growth stages, no shiny palettes, no outfits, no
animation, no wiring, no tests. A creature whose look Hanna or the UX designer wants changed later
goes back to a Fable agent for that creature only.

**Step B: normal agents (default model), everything else.** The developer (not on Fable) writes the
shared `model.ts` before step A and, after it: the species list and its test, the triangle/draw-call
test, the /style section, and fixes that don't change the look (e.g. a missing anchor point,
merging meshes to fit the budget). Growth stages, shiny colours, outfits and animations are later
tasks (T-0029 to T-0033), also on normal agents, working from Fable's files.

Fable's usage can't be watched from here: keep each Fable brief to one creature, and record each
agent's reported tokens in *Log*.

## Shared parameters (developer writes these first)

`CreatureParams`: palette (body, belly, accent, eye, nose, shiny override later), `stage`
(`baby | young | grown`, used later by T-0029 to change head/body proportions; Fable designs the
grown-up look and states how its parts should scale), and quality (`low` for phones, `high` for
computers). Anchor points are named empty `Object3D`s on the group. Materials: `MeshStandardMaterial`
or `MeshToonMaterial`, flat colours, no textures from outside, so the colours follow D-0020's
warmth on both wallpapers (D-0022).

## Where things are

- 3D on the shelf and in decorations: `src/components/Decorations.tsx`, `BookNook.tsx`, `nook3d.ts`
  (procedural three.js like this task's).
- The /style page: `src/routes/style.tsx` (unlinked, D-0020).
- No model files and no new package; three.js and react-three-fiber are already there.

## Questions re-asked: Hanna's answers (2026-11-22)

While Hanna slept, the architect and the UX designer took 19 questions with the recommended option.
She answered them all on 2026-11-22; D-0033, the brief and T-0028 to T-0033 follow her answers.

**Kept as taken:** follow the Red List (emperor penguin very rare, koala rare); the 20 creatures as
listed, with three penguins; the fantasy four; cookie speed 1 🍪 per 5 minutes plus 10 per finished
book; egg prices 60 / 90 / 120 / 160 / 200 / 300; duplicates half the egg price or +3 levels;
missing-you after 3 days, sleepy from 22:30; the own Creatures tab; choices kept on the device until
they can be saved with her account; bought room decorations shown or hidden per device; the
apricot cat, a little smaller than the koala on the shelf, and everyone sitting like a plush toy;
the gold, purple and night-sky shiny colours.

**Changed by Hanna:**

1. **Welcome gift**: just a common egg, **no starting cookies** (D-0033 §3).
2. **First creature**: **she chooses** it from the five commons; it is not a surprise (D-0033 §3,
   T-0029).
3. **Releasing a pet is possible, with care**: a clear confirm step; for a shiny also the "This is a
   shiny!" warning and press-and-hold (D-0033 §9, T-0030). Tests cover it.
4. **All 20 creatures get a shiny**, not 10 (D-0033 §5; the ten new shiny palettes are in Design
   §7).
5. **Saving her choices without a server change**: Hanna and Sander asked to look again, harder.
   The architect did; the answer, in plain words, is in T-0028 (*Why it needs the server*).

# Design

UX designer, 2026-11-22, before step A. This is **the style sheet every Fable agent gets** (with
the shared `model.ts` and its creature's row from the table and from *The 20 at a glance* below).
Goal: 20 animals built by 20 different agents read as **one family of plush toys** that sits next
to the shelf's koala and sleeping cat (`src/components/Decorations.tsx`). Those two set the look:
smooth round primitives, soft matte fur (`roughness: 1`), tiny glossy black bead eyes, pink blush
cheeks, no outline, no mouth, warm muted colours. After the build, the review of the screenshots
goes under *Review* (Done when 4).

## 1. The family look in one breath

A chubby plush that **sits upright facing you**: an egg-shaped body, a round head as wide as the
body resting right on it (no neck), two stubby feet pointing forward, short arms resting on the
tummy, a lighter tummy patch, two small glossy bead eyes with a white glint, pink blush, a small
nose. What makes each species is **its silhouette**: ears, tail, snout or beak, and one or two
markings. Never realism: no claws, teeth, whiskers, fur texture or thin spiky detail.

## 2. Proportions and scale

Each model is built in **model units: about 1 unit tall**, origin at the bottom centre under the
hips (y = 0 is the floor), facing **+z**, symmetric left/right except the tail. The shelf and den
scale the whole group; a model never knows where it stands.

Grown-up, in model units (the koala decoration × 4, eyes a little bigger):

| Part | Shape | Centre (x, y, z) | Size |
|---|---|---|---|
| Body | sphere | 0, 0.31, 0 | r 0.29, scale [1, 1.08, 0.88]: bottom at ≈ 0, top ≈ 0.62 |
| Tummy patch (belly colour) | sphere | 0, 0.29, 0.18 | r 0.19, scale [0.95, 1.15, 0.55] |
| Feet | 2 spheres | ±0.17, 0.075, 0.20 | r 0.11, scale [1, 0.7, 1.35] |
| Arms | 2 capsules | shoulder ±0.21, 0.42, 0.13 | r 0.075, length 0.18, resting on the tummy (koala: rot [-0.9, 0, ±0.75]) |
| Head | sphere | 0, 0.66, 0.03 | r 0.27, scale [1.08, 0.98, 0.95]: width ≈ 0.58, top ≈ 0.92 |
| Eyes | 2 spheres | ±0.105, 0.68, on the face surface | r 0.04 (≈ 0.15 of the head radius), slightly sunk in |
| Eye glint | 2 spheres | eye centre + (±0.012 outward, +0.014, +0.03) | r 0.012, white |
| Blush | 2 squashed spheres | ±0.17, 0.62, on the surface | r 0.05, scale [1, 0.7, 0.3] |
| Nose | per species | ≈ 0, 0.64, front of the face | small (r ≈ 0.03) unless the species says otherwise |

Rules that keep the family together:

- **Height:** bounding box 0.95 to 1.10 units including ears; horns, ear tufts and an upright tail
  may reach 1.15. Head top (without ears) between 0.88 and 0.95.
- **Head : body** about 1 : 1 in width; the head is about 45 % of the height. Long animals (otter,
  capybara, platypus) stay sitting plushes: their length shows in snout, tail and a slightly wider
  body (scale x up to 1.15), never by lying down.
- **Width** at most 0.75 without tail, wings or ribbons; with them at most 1.1. Depth at most 0.8
  with tail.
- **Eyes are the same on all 20**: size, height, spacing, black `eye` colour and white glint. Only
  the owl may have a facial disc around them (§7); nobody gets bigger, coloured or anime eyes.
- Ears, snouts and tails come from the species line; every other number above stays within ±10 %.

**On the shelf** (one shelf row is 0.44 high, about 0.41 inside): the placement group scales a
**grown-up to 0.22 world units tall** (the koala decoration is 0.25, a book about 0.2–0.3), a
**young one to 0.17** and a **baby to 0.12**. A hat adds up to 0.06, still well below the shelf
above. The model stands at the front of the board and is turned a little toward the viewer like the
koala (`rotY` between −0.25 and 0.15); that ¾ turn belongs to the placement, never to the model.

**Stages** (built by T-0029 in the shared builder from these factors, not by Fable; Fable builds
the grown-up only and tags the parts):

| Stage | Head | Body | Arms, feet | Tail | Eyes | Extras (horns, wings, ribbons, gills, tufts, mane) | Shelf height |
|---|---|---|---|---|---|---|---|
| baby | × 1.18 | × 0.85 | × 0.8 | × 0.75 | × 1.15 | × 0.7 | 0.12 |
| young | × 1.08 | × 0.93 | × 0.9 | × 0.9 | × 1.07 | × 0.85 | 0.17 |
| grown | × 1 | × 1 | × 1 | × 1 | × 1 | × 1 | 0.22 |

Each part scales around its own pivot (§5), then the whole model is put back on y = 0.

## 3. Construction and budget (phone first)

- **three.js primitives only**: `SphereGeometry`, `CapsuleGeometry`, `CylinderGeometry`,
  `ConeGeometry`, `TorusGeometry`, `BoxGeometry`, and for flat shapes (a star, a ribbon end, a
  wing) `ShapeGeometry`/`ExtrudeGeometry` with at most 12 points. No model files, no textures, no
  canvas painting, no new package.
- **Smooth, not faceted** (`flatShading: false`), like the decorations: "low-poly" means low
  segment counts, not a faceted look. Exception: small cone ears may have 4 sides, like the
  sleeping cat's.
- **Segments come only from the shared `SEG` table** in `model.ts`, never typed in:

  | Size | Use | high (sphere w × h) | low |
  |---|---|---|---|
  | `L` | body, head | 16 × 12 | 10 × 8 |
  | `M` | tummy, feet, ears, snout, tail ball | 10 × 8 | 8 × 6 |
  | `S` | eyes, nose, inner ears, markings | 8 × 6 | 6 × 4 |
  | `XS` | glints, blush, tiny spots | 6 × 4 | 5 × 3 |

  Cylinders, cones, capsules, tori: 12 radial segments high, 8 low (capsule caps 3 / 2).
- **Per creature**: at most **40 primitives** before merging; at most **3,000 triangles on `high`**
  and **1,500 on `low`**; at most **12 draw calls** after the shared merge (aim for 8–10). The
  shared body above (body, tummy, feet, arms, head, eyes, glints, blush, nose, two ears with
  insides) is about 2,200 triangles on high, which leaves about 800 for the species' own features.
- **Low quality** also drops meshes tagged `userData.detail = true` (small spots, inner-ear
  patches, the third tail ring and the like). The creature must still be recognisable without them.

**Materials (shared rules).** Fable never makes a material or writes a colour. It takes the
palette slot materials from `creatureMaterials(p)` (`m.body`, `m.belly`, `m.accent`, `m.accent2`,
`m.eye`, `m.nose`, `m.glint`, `m.blush`). The shared `finishCreature` then bakes each slot's colour
into vertex colours and merges every part's meshes into one mesh per **material kind**:

| Kind | Slots | Material (one instance shared by every creature) |
|---|---|---|
| `matte` | body, belly, accent, accent2 | `MeshStandardMaterial`, `vertexColors`, roughness 1, metalness 0 |
| `gloss` | eye, glint, nose | the same with roughness 0.2 |
| `satin` | accent or accent2 on a mesh tagged `userData.satin = true` (gold horns, hooves, ribbons, beaks) | roughness 0.45, metalness 0.25; use on at most two parts |
| `blush` | blush | colour `#e8a6a6`, transparent, opacity 0.55, roughness 1, no shadow |

So a shiny is the same model built with another palette, and a den full of pets shares four
materials. Everything casts and receives shadows except eyes, glints and blush. Colours are given
as sRGB hex; the builder converts them with `THREE.Color` (colour management stays on).

## 4. Face, expression and neutral pose

- **Eyes**: §2. Black glossy beads (`#111114`, the koala's), each with one white glint up and
  outward. On a dark face (panda patches, penguins, otter) the glint keeps them readable; the eye
  colour never changes.
- **Blush**: always, same place, same colour: the family's signature.
- **Nose**: a small rounded nose in the `nose` colour; beaks and bills are the nose slot (or
  `accent` when the species line says), built as a rounded cone or flattened sphere, never sharp.
- **No mouth** in the base model (koala rule). Expressions (happy ^ ^, sleepy, sad) are made later
  by squashing or swapping the `eyes` part.
- **Neutral pose**: sitting upright, head straight, looking straight ahead along +z, arms resting
  on the tummy (penguins: flippers down along the sides, 15° out; dragon and owl: wing-arms folded
  against the sides), feet forward. The tail lies behind and curls out to the creature's left (+x),
  so it shows in the silhouette from the front. Wings, ribbons and a mane point up and back, never
  forward over the face.

## 5. Parts, pivots and anchors

The model is a `THREE.Group` named with the species id. Its children are **part groups**, named
exactly as below, each **positioned at its joint** so that rotating it moves the part naturally.
Meshes go inside a part; nothing else on the root but parts and the `seat` anchor.

| Part | Pivot (its group position) | Holds | Required |
|---|---|---|---|
| `part:body` | 0, 0.31, 0 (body centre) | body, tummy, feet, markings, back spines, hooves | yes |
| `part:head` | 0, 0.56, 0.02 (where head meets body) | head, snout, nose, ears, horns, mane, blush | yes |
| `part:eyes` | inside `part:head`, at the eyes' height, x = 0 | both eyes and glints | yes |
| `part:armL`, `part:armR` | the shoulders | arm or flipper or wing-arm | yes |
| `part:tail` | where the tail meets the body | tail(s), ribbon tails | if the species has a tail |
| `part:wings` | between the shoulder blades | real wings (book dragon only) | no |

`L` and `R` are the creature's own left (+x) and right (−x). Ears stay inside the head (one draw
call), so later animation moves head, eyes, arms, tail and wings, and squashes the body.

**Anchors** are empty `THREE.Object3D`s with exactly these names (found with `getObjectByName`),
each with `userData.size` in model units so outfits can size themselves per species:

| Anchor | Inside | Where | `userData.size` |
|---|---|---|---|
| `seat` | root | 0, 0, 0: where it sits on a cushion or a pile of books | body width |
| `neck` | `part:body` | the ring where head meets body (≈ y 0.56), centred, y up | ring radius (for a scarf or bow) |
| `back` | `part:body` | middle of the back surface (≈ 0, 0.36, −0.25), facing −z | back width (backpack) |
| `head` | `part:head` | the head sphere's centre | head radius |
| `hat` | `part:head` | the top of the skull between the ears, on the surface, y up | free width between the ears |
| `face` | `part:head` | the face surface at eye height, facing +z | outer width of the two eyes (glasses) |
| `paw` | `part:armR` | the front tip of the right paw | paw radius (holds a sign or a tiny book) |

Tags Fable sets on meshes for the shared builder: `userData.stageRole = 'extra'` on horns, wings,
ribbons, gills, ear tufts and manes; `userData.detail = true` on what low quality may drop;
`userData.satin = true` (see §3).

## 6. The shared interface (developer writes `model.ts` first)

This keeps the architect's `build<Name>(p: CreatureParams): THREE.Group` and `CreatureParams`
(palette, stage, quality), with one more palette slot (`accent2`) and one extra export per file.

```ts
// src/components/creatures/model.ts (developer, before step A)
export type CreatureStage = 'baby' | 'young' | 'grown'
export type CreatureQuality = 'low' | 'high'
export interface CreaturePalette {
  body: string     // main fur, feathers or skin
  belly: string    // tummy, muzzle, inner ear, face
  accent: string   // the species' marking: mask, socks, stripes, bill, horn
  accent2: string  // a second marking (same as accent when the species has none)
  eye: string      // '#111114' for every species
  nose: string     // nose, beak or bill tip
}
export interface CreatureParams { palette: CreaturePalette; stage: CreatureStage; quality: CreatureQuality }
export const ANCHORS = ['seat', 'neck', 'back', 'head', 'hat', 'face', 'paw'] as const
export const PARTS = ['part:body', 'part:head', 'part:eyes', 'part:armL', 'part:armR', 'part:tail', 'part:wings'] as const
export const SEG: Record<CreatureQuality, Record<'L' | 'M' | 'S' | 'XS', [number, number]>> // §3
export function radial(q: CreatureQuality): number // 12 or 8
export function creatureMaterials(p: CreatureParams): Record<'body' | 'belly' | 'accent' | 'accent2' | 'eye' | 'nose' | 'glint' | 'blush', THREE.Material>
export function anchor(name: (typeof ANCHORS)[number], size: number): THREE.Object3D
export interface CreatureModel { id: SpeciesId; palette: CreaturePalette; build: (p: CreatureParams) => THREE.Group }
/** The only way the app gets a creature: default palette, build, stage factors (T-0029), low-quality drop, merge, checks. */
export function makeCreature(id: SpeciesId, opts: { stage?: CreatureStage; quality?: CreatureQuality; palette?: CreaturePalette }): THREE.Group
```

```ts
// src/components/creatures/models/<id>.ts (Fable, one file per creature, imports only three and ../model)
export function buildRedFox(p: CreatureParams): THREE.Group { /* parts, meshes, anchors, tags */ }
export const redFox: CreatureModel = { id: 'red-fox', palette: { /* §7 row */ }, build: buildRedFox }
```

The developer adds `models/index.ts` (the 20 in species order) and `finishCreature` (merge per part
and kind, shadows, dispose of the parts' geometries). A Fable file never merges, animates, reads
`p.stage` (it builds the grown-up whatever the stage) or touches anything outside its file.

## 7. Palettes, shinies and both wallpapers

Rules for every palette:

- Warm and muted, like the koala and cat (no neon, no pure white `#fff` or pure black body): fur
  whites are cream (`#f3efe6`–`#fbf6ee`), blacks are soft (`#2b2a2f` for small parts; a black
  **body** no darker than `#30313b`, always with a light tummy facing the viewer).
- **Readable on both wallpapers**: no body colour in the lavender band of the wall (`#a990cf` to
  `#ece4f5`) and none in the midnight band (`#0f1536` to `#2a3670`). Lavender and purple are fine
  for accents (mane, wings), Hanna's favourite colour.
- The gold accent `#d9a85b` (the app's one accent) is the fantasy creatures' colour: gold on the
  legendaries tells they are special.
- Everyone: `eye` `#111114`, glint white, blush `#e8a6a6`.

**Shiny**: the same model with a whole other palette (body, belly, accent, accent2; eyes and blush
stay), clearly a different hue at 120 px, not just lighter, plus a soft gold sparkle that T-0030
adds around it. The shiny palettes below are the design; T-0030 puts them in code. **All 20 have
a shiny** (Hanna, 2026-11-22); the architect added the second ten (capybara, red squirrel, otter,
giant panda, polar bear, emperor penguin, ring-tailed lemur, African penguin, library owl, bookmark
fox) as gold, purple and night-sky twists within the rules above. The UX designer checks them at
the review (Done when 7) and may adjust a hex within the same twist.

| id | body | belly | accent | accent2 | nose | shiny (body / belly / accent / accent2 / nose) |
|---|---|---|---|---|---|---|
| `cat` | `#e8b07a` apricot | `#f6ead8` | `#c97f45` tabby stripes | `#e8a9a4` inner ears | `#d98a8a` | snow and gold: `#f2eee8` / `#fffaf0` / `#d9a85b` / `#e8a9a4` / `#d98a8a` |
| `red-fox` | `#df7a35` | `#f7efe4` | `#3a2a24` socks, ear backs | `#3a2a24` | `#2b2a2f` | silver fox: `#c9ccd6` / `#fbfaf7` / `#5a5f6e` / `#5a5f6e` / `#2b2a2f` |
| `capybara` | `#a87a52` | `#c49a70` | `#6e4d33` snout top | `#6e4d33` | `#4a3628` | gold: `#d9a95e` / `#efd3a0` / `#a8763a` / `#a8763a` / `#4a3628` |
| `red-squirrel` | `#b5481f` chestnut | `#f3e6d2` | `#8f3816` tufts, tail edge | `#8f3816` | `#3a2a24` | black and gold: `#3e3a48` / `#f3e6d2` / `#d9a85b` / `#d9a85b` / `#2b2a2f` |
| `adelie-penguin` | `#33343f` | `#f7f7f4` | `#f7f7f4` eye ring | `#e7a3a0` feet | `#2b2a2f` | plum: `#6e4f8f` / `#fbf6ee` / `#d9a85b` / `#e7a3a0` / `#2b2a2f` |
| `hedgehog` | `#8a6a4e` spines | `#e8d4b8` face, tummy | `#5e4634` spine tips | `#5e4634` | `#2b2a2f` | blonde: `#e8c9a0` / `#fff4ea` / `#d9a85b` / `#d9a85b` / `#2b2a2f` |
| `otter` | `#7a5236` | `#d9bfa0` | `#5e3d27` | `#5e3d27` | `#2b2a2f` | plum: `#7a5a8a` / `#efe0d6` / `#5a3f6a` / `#5a3f6a` / `#2b2a2f` |
| `platypus` | `#8a6440` | `#c9a27a` | `#5a5c66` bill, feet | `#5a5c66` | `#2b2a2f` | opal: `#5fa8a0` / `#cfe8e2` / `#d9a85b` / `#d9a85b` / `#2b2a2f` |
| `koala` | `#9196a0` (the decoration's) | `#ece6dc` | `#ece6dc` ear fluff | `#ece6dc` | `#2b2a2f` | honey: `#dcb882` / `#fbf3e3` / `#fbf3e3` / `#fbf3e3` / `#5a3e2a` |
| `giant-panda` | `#f4f1ea` | `#f4f1ea` | `#2e2c30` ears, patches, limbs | `#2e2c30` | `#2b2a2f` | gold panda: `#fbf3e3` / `#fbf3e3` / `#b07a30` / `#b07a30` / `#2b2a2f` |
| `polar-bear` | `#f3efe6` | `#f3efe6` | `#e3d9c6` muzzle | `#e3d9c6` | `#2b2a2f` | aurora: `#cfe6e0` / `#f3faf7` / `#9d86d1` / `#d9a85b` / `#2b2a2f` |
| `red-panda` | `#c1552a` | `#f7efe4` face | `#3a2622` legs, tear marks | `#8a3a1c` tail rings | `#2b2a2f` | amber: `#e0a64e` / `#fffaf0` / `#5a3b2a` / `#b07a30` / `#2b2a2f` |
| `emperor-penguin` | `#3a3d48` | `#f7f5ef` | `#f2b23e` ear patches, beak stripe | `#fbe7b0` chest wash | `#2b2a2f` | night sky: `#46508f` / `#f7f5ef` / `#f4d68c` / `#fbe7b0` / `#2b2a2f` |
| `ring-tailed-lemur` | `#a19a94` | `#f4f1ea` face, rings | `#2b2a2f` eye patches, rings, snout | `#f4f1ea` | `#2b2a2f` | amethyst: `#8f7fa8` / `#f4f1ea` / `#4a3a5e` / `#f4f1ea` / `#2b2a2f` |
| `african-penguin` | `#33343f` | `#f7f5ef` | `#2b2a2f` chest band, spots | `#e88a8a` eye patch | `#2b2a2f` | bronze and gold: `#7a5a2e` / `#fbf3e3` / `#d9a85b` / `#e88a8a` / `#2b2a2f` |
| `axolotl` | `#f4b6c4` | `#fbd9e0` | `#e0607e` gills | `#e0607e` | `#d98a8a` | gold: `#f5d27a` / `#fbebc0` / `#e98a6a` / `#e98a6a` / `#d98a8a` |
| `book-dragon` | `#6f9a7c` sage | `#f0e2c0` belly plates, pages | `#d9a85b` horns, spikes (satin) | `#8a3a4a` book-cover wings | `#2b2a2f` | amethyst: `#8f6fb8` / `#f6ecd6` / `#d9a85b` / `#4a5aa8` / `#2b2a2f` |
| `library-owl` | `#8a6a52` | `#efe2cc` facial disc, chest | `#5e4634` tufts, wing tips | `#d9a85b` chest chevrons | `#d9a85b` beak | night owl: `#3f4a7a` / `#dfe3f5` / `#2b2f4f` / `#f4d68c` / `#d9a85b` |
| `bookmark-fox` | `#f3e9d8` paper cream | `#fffaf0` | `#b0413e` ribbon red (satin) | `#d9a85b` ribbon gold (satin) | `#2b2a2f` | gilded page, plum and blue ribbons: `#f2d9a0` / `#fbf0d6` / `#9a5fb5` / `#5f86d9` / `#2b2a2f` (ribbons lightened at the review, 2026-11-23: `#6e4f8f` / `#4a5aa8` vanished on midnight) |
| `starlight-unicorn` | `#fbf6ee` pearl | `#fbf6ee` | `#d9a85b` horn, hooves, star (satin) | `#9d86d1` lavender mane, tail | `#e8a9a4` | night sky: `#4a5aa8` / `#dfe3f5` / `#f4d68c` / `#f4d68c` / `#e8a9a4` |

## 8. The 20 at a glance (key silhouette features)

The silhouette test: filled solid black at 120 px, each must still be recognisable from the
others. These are the features that carry it; everything else follows §2–§5.

1. **`cat`**: two upright pointed cone ears (4-sided, pink inside), small pink triangle nose, three
   short accent stripes on the forehead and three on the back, a long tail curling up at the +x
   side with a ringed tip. Rounder face than the fox, no snout.
2. **`red-fox`**: big triangular ears with dark backs, a pointed cream-tipped snout (cone, 0.14
   long), cream chest and cheeks, dark socks on feet and arm tips, a very big bushy tail (stretched
   sphere, cream tip) sweeping round to the front at +x.
3. **`capybara`**: the calm one: wide barrel body (x 1.15), boxy head (sphere scaled [1.1, 0.95,
   1.2]) with a long flat blunt snout and a darker top, tiny round ears high on the head, eyes 0.02
   higher than usual (still the same eyes), no visible tail.
4. **`red-squirrel`**: pointed ears with tall accent ear tufts (`extra`), small snout, a huge
   S-shaped tail standing up behind it taller than the head (two or three stacked stretched
   spheres), cream tummy.
5. **`adelie-penguin`**: the small round penguin (body scale [1, 1.1, 0.9], head merged into body
   with a slight dip), all-dark head and back, white front from the chin down, a **white ring
   around each eye**, short dark beak, pink feet, flippers down.
6. **`hedgehog`**: a cream face with a pointed little snout and a round black nose, small round
   ears; the back of the head and the whole back covered by a dome of 20–28 short rounded cones
   (spines, 5 radial, brown with darker tips) that makes a round spiky outline; cream tummy.
7. **`otter`**: sleek: smaller rounded head with a wide cream muzzle and a round dark nose, tiny
   round ears low on the sides, arms held together in front of the chest (like holding a pebble,
   but empty), a thick tapering tail lying on the floor and curving to +x.
8. **`platypus`**: a broad flat duck bill (flattened sphere [1.3, 0.35, 1.0], slate) sticking out
   0.18 at the front, no visible ears, webbed slate feet, a flat paddle tail (squashed sphere)
   behind on the floor. The head is a bit smaller than usual (−10 %).
9. **`koala`**: exactly the decoration made big: huge round fluffy ears with cream insides, the
   big dark oval nose (r 0.085, scale [0.8, 1.2, 0.7]), arms hugging the tummy, no tail.
10. **`giant-panda`**: cream with black round ears, **black teardrop eye patches** tilted down and
    out (eyes sit on them), black arms and feet, a black band over the shoulders, tiny white tail.
11. **`polar-bear`**: all cream, small round ears, a longer rounded muzzle (0.12) in a slightly
    warmer cream with a black nose; bigger, flatter feet. Recognised by the muzzle and the white.
12. **`red-panda`**: big pointed ears with cream rims, a cream face mask with dark **tear marks**
    from eyes to cheeks, dark legs and arms, a long fat tail with 4–5 alternating rings (`accent2`).
13. **`emperor-penguin`**: the tall one: pear body (scale [0.95, 1.18, 0.9]), smaller dark head on
    top, **golden-yellow ear patches** behind the eyes fading into the pale-yellow chest, a long
    slim slightly curved beak with an orange stripe. Flippers down.
14. **`ring-tailed-lemur`**: a pointed fox-like face (white) with **black eye patches** (the eyes sit on
    them) and a black snout, rounded ears, and a very long upright tail with 6–7 black and white
    rings rising in a question-mark curve above its head (the tallest silhouette, up to 1.15).
15. **`african-penguin`**: middle-sized penguin with a white face stripe arching from the beak over
    the eye to the chest, a **pink patch above each eye**, a black band across the white chest and
    a few black chest spots (`detail`). Same body as Adélie but slightly slimmer.
16. **`axolotl`**: a wide round head (x 1.15) with three feathery gill fronds on each side (capsules
    fanning out and up, `extra`, deep pink), a friendly face of just eyes and blush (no mouth),
    a tail with a soft fin behind; no ears, no nose (nose slot unused).
17. **`book-dragon`**: sage green with a cream plated belly, two small gold horns and three gold
    back spikes, a pointed tail with a little gold spade; its **wings are an open book** on its back
    (`part:wings`): two flat cover boards in `accent2` with a cream page block between them, opened
    in a V, poking up behind the head.
18. **`library-owl`**: a round body and head almost in one (head merged lower), two upright **ear
    tufts**, a heart-shaped cream facial disc around the eyes (the only creature with something
    around its eyes; eyes the normal size), small gold beak, gold chevron "page edge" marks on the
    chest, wings as folded arms with dark tips, no tail showing.
19. **`bookmark-fox`**: a cream paper fox (fox head and ears, gold inner ears), and instead of one
    tail **three ribbon bookmarks** (flat strips 0.06 wide, red–gold–red, satin) fanning up and back
    from the tail base, each with a V-notched end. Tells it from the red fox at once.
20. **`starlight-unicorn`**: a pearl pony head (longer muzzle, small pointed ears), a **spiral gold
    horn** (cone with 3 torus rings) between the ears, a lavender mane in 4–5 round tufts down the
    back of the head and a matching tufty tail, gold hooves as the feet, and one small gold star on its left flank
    (`detail`).

## 9. Both wallpapers, the shelf and the den

- **One look everywhere.** Colours never change with the wallpaper or the room. On the shelf the
  creature stands against the bookcase's wooden back, lit by the room's warm light; in the den
  and on `/style` the same lights are used (warm hemisphere + soft ambient + warm key light from
  the top left, as in `BookshelfScene.tsx`), plus **one soft back light** (`#fff3e0`, about 0.5)
  from behind and above, so dark backs (penguins, otter) keep a light edge on the midnight
  wallpaper.
- **On the shelf** (T-0033): grown-up 0.22 high, §2. Quality `low` and no shadows on a phone, like
  the decorations; `high` with shadows on a computer. It sits still like the koala unless T-0033
  animates it.
- **In the den** (T-0029, T-0032): the same model and materials, seen a little from above (about
  10° down) and ¾ turned. Their size there and the den itself are designed in those tasks.
- **On `/style`** (this task): a **Creatures** section with one 3D canvas (not 20: browsers allow
  only about 16 canvases) showing all 20 in a grid in species order, each slowly turning (one turn
  in about 12 s), with its name, tier and Red List label as normal text under it. On 390 px: 3 per
  row, each tile about 120 × 120 px (the size check of Done when 4). On 1280 px: 5 per row, tiles
  160 px. The section sits on the page's wallpaper and follows the wallpaper set in the 🎨 Room
  panel; the screenshots are made once with lavender and once with midnight. The canvas stops
  turning when the page is hidden.

## 10. What Fable hands in

Per creature: the one file of §6, which builds with defaults inside the budget of §3, with all
required parts and anchors, and a short comment at the top listing its primitives, its tagged
`extra` and `detail` meshes and its estimated triangle count. If something in this style sheet
cannot be met for its animal, the agent says so in its reply instead of breaking the family rule.

## Review after building (2026-11-23)

UX designer. Looked at the 16 screenshots in `docs/tasks/T-0027-screens/`, read the 20 model
files, and on the no-backend dev server (`vite dev --port 3143`, stopped afterwards) took each
tile at 2× from four sides (0°, 90°, 180°, 270° of the turn), on lavender, and the shinies on
midnight. Every must-fix number below was tried in the working copy, checked on screen and with
the model test (all 102 passed), and then reverted: this review changes no code.

**Verdict: changes needed.** Five small must-fix items, all positions, sizes, a deleted
mesh pair or two palette hexes. The family and 16 of the 20 animals pass as built.

### Family (Done when 4)

**Pass.** All 20 read as one family next to the cat and the koala decoration: the same chubby
egg body with a lighter tummy, the head as wide as the body with no neck, stubby forward feet,
the same small black bead eyes with a white glint, pink blush, no mouth, matte plush finish and
warm muted colours. No one has bigger or coloured eyes; the owl's facial disc is the only thing
around eyes, as designed. Silhouettes are carried by ears, tails, snouts and markings, as §1 asks.

### Recognisable at about 120 px (Done when 4)

Checked on the 390 px shots (tiles about 120 px) and the 2× closeups.

- **Clear as built (16):** cat, red fox, red squirrel, Adélie penguin, hedgehog, otter,
  platypus, koala, giant panda, polar bear, red panda, emperor penguin, ring-tailed lemur,
  axolotl, book dragon, library owl. The platypus, hedgehog, lemur, owl and dragon are
  especially strong.
- **Not yet (4), fixed by must-fix 1–5:** the **capybara** reads as a brown bear from the front
  (round ears on top, a short round muzzle); the **starlight unicorn** reads as a cream pig or
  cat from the front (the mane hides straight behind the head, the two pink nostrils on a flat
  muzzle say "pig"); the **bookmark fox**'s side ribbons stick out sideways at waist height and
  read as two little red wings, and the gold one is a thin stick behind the head; the **African
  penguin** is recognisable, but its chest band with three spots inside reads as a smiling face
  on its tummy, which breaks the family's "no mouth" rule.

### Penguins and foxes

- **The three penguins differ clearly:** Adélie the small round one with white eye rings and
  pink feet; emperor the tall one with golden ear patches and the yellow chest; African the
  slim one with the white face band and the black chest band. Pass.
- **Bookmark fox vs red fox:** clearly different (paper cream vs orange, ribbons vs one bushy
  tail). Pass once must-fix 1 makes the ribbons show.

### Wallpapers and shinies (Done when 7)

- **Normal colours:** all 20 stand out on lavender and on midnight; the dark backs (penguins,
  otter) keep a light edge on midnight from the back light. Pass.
- **Shinies:** all 20 are clearly a different hue from their normal colours, not just lighter.
  Every colour the shiny palette changes changes; eyes, glints and blush stay. (Where §7 keeps
  a slot the same on purpose, like the cat's inner ears, the Adélie's feet or most noses, that
  is the design, not a miss.) One fail: on midnight the **bookmark fox's shiny ribbons** (plum
  `#6e4f8f`, blue `#4a5aa8`) disappear into the wall, and the ribbons are what make it a
  bookmark fox: must-fix 2. The shiny library owl (`#3f4a7a`) and emperor penguin (`#46508f`)
  are dim on midnight but readable through their light disc and tummy; T-0030's gold sparkle
  will help them. Not blocking.

### The integrator's notes

- **Book dragon's arms on its tummy** (Design §4 said folded at the sides): **accepted.** It
  matches the family's plush pose and the book wings already carry its silhouette. §4's
  "wing-arms folded against the sides" now holds for the owl only.
- **Book dragon's `back` anchor under the book wings:** **accepted** for the base model. Note
  for the outfits task (T-0031): a backpack on the dragon would collide with the book; that
  task decides (no backpack for the dragon, or hide the book while one is worn).
- **Unicorn's `hat` anchor near the horn:** **must-fix 3** (a hat there would sit on the horn).
- **Unicorn's satin on three parts** (hooves, horn, flank star; §3 says at most two):
  **accepted.** All three are the same gold, it costs no draw call, and it does not look shinier
  than the other legendaries. Read §3's limit as "at most two satin draw calls".
- **Red panda's dark tummy:** **accepted.** True to the animal; the cream face mask and ear rims
  give it the light front the family needs, and it reads on both wallpapers.
- **Emperor penguin 1.08 tall:** **accepted.** Within §2's 1.10 and it is what tells it from the
  other two penguins.
- **Penguins' stub tails:** **accepted.** Seen only from behind; they don't change the front
  silhouette.
- **Tight budgets** (lemur 2,960, red panda 2,932, unicorn 2,936 triangles; hedgehog at the
  40-primitive cap): **accepted.** All inside the test's limits; must-fix 3 lowers the unicorn to
  2,864. These four have no room for more parts: later changes to them must swap, not add.

### Must-fix (developer, normal agent, no Fable needed)

Each is a small edit in one file; the numbers were tried and pass the model test.

1. **`src/components/creatures/models/bookmark-fox.ts`, the `ribbons` table:** the two red
   side ribbons fan up beside the head instead of out at the waist.
   - `[0.7, 0.36, 0.24, 0.45, m.accent]` → `[0.45, 0.52, 0.26, 0.2, m.accent]`
   - `[-0.7, 0.36, 0.24, -0.45, m.accent]` → `[-0.45, 0.52, 0.26, -0.2, m.accent]`
   - The gold middle ribbon stays. Result: 0.82 wide × 1.08 tall.
2. **`src/lib/creatures/species.ts`, `bookmark-fox` `shinyPalette`:** accent `#6e4f8f` →
   `#9a5fb5`, accent2 `#4a5aa8` → `#5f86d9` (same plum-and-blue twist, readable on both
   wallpapers; §7's row is updated to match).
3. **`src/components/creatures/models/starlight-unicorn.ts`:**
   - Mane tufts (the four `[x, y, z, r]` rows): the mane falls down the creature's left side
     (+x, the tail's side) so it shows from the front:
     `[0.17, 0.32, -0.08, 0.085]`, `[0.24, 0.22, -0.13, 0.09]`, `[0.27, 0.09, -0.14, 0.085]`,
     `[0.24, -0.03, -0.12, 0.075]`.
   - Delete the two nostril meshes (the `for` loop that makes `nostril`). The `nose` slot is then
     unused, like the axolotl's. Update the top comment (29 primitives, 9 draw calls, no
     nostrils in the `detail` list).
   - `hat` anchor: `hat.position.set(0, 0.348, -0.08)` and add `hat.rotation.x = -0.35`, so a
     hat sits on the skull behind the horn. Size stays 0.22.
   - Result: 2,864 / 1,288 triangles, 9 draw calls, 0.71 × 1.11.
4. **`src/components/creatures/models/capybara.ts`:** a longer blunt snout and ears set back.
   - snout: `m.body, [0, 0.02, 0.3], [0, 0, 0], [1.05, 0.77, 1]` →
     `m.body, [0, 0.02, 0.32], [0, 0, 0], [1.1, 0.85, 1.25]`
   - darker snout top: `m.accent, [0, 0.1, 0.34], [0, 0, 0], [0.85, 0.35, 0.9]` →
     `m.accent, [0, 0.115, 0.34], [0, 0, 0], [1.0, 0.3, 1.5]`
   - nose: `[0, 0.07, 0.435]` → `[0, 0.06, 0.5]`
   - ears: `[s * 0.165, 0.35, -0.02]` → `[s * 0.17, 0.35, -0.07]`; inner ears
     `[s * 0.165, 0.352, 0.01]` → `[s * 0.17, 0.352, -0.04]`. Keep the ears at y 0.35: lower
     ears drop the model below 0.95 tall.
   - Result: 0.72 × 0.97 × **0.80 deep**, exactly at the depth limit; don't push the snout
     further forward.
5. **`src/components/creatures/models/african-penguin.ts`, the three chest spots:** below the
   band instead of inside it: `[-0.06, 0.0]`, `[0.055, -0.07]`, `[0.03, 0.05]` →
   `[-0.07, -0.11]`, `[0.08, -0.13]`, `[0.01, -0.16]`.

Then re-take the screenshots with the same script (all 16) and run the model test.

### Nice to have (not blocking, untested)

- Emperor penguin: the pale-yellow chest wash floats as an oval mid-chest; it would read more
  like the real fade if it sat higher and wider, joining the ear patches (try y 0.21 → 0.25 and
  scale x 1 → 1.25 in `emperor-penguin.ts`).
- Red squirrel: the dark tail tip on its own ball looks a little like a lollipop; painting it
  `m.body` would make the tail one bushy S.

### Re-review (2026-11-23)

**Verdict: pass.** Commit 11382ff makes must-fix 1–5 exactly as written: the diff of the
four model files and `species.ts` matches the review line for line, and the unicorn's top
comment is updated. These are the same numbers I checked at 2× from four sides before.
The 16 new screenshots show:

- **Bookmark fox:** the red ribbons rise beside the head and the gold one stands above it.
  It reads as a ribbon-tailed fox, not a winged cat. On midnight the shiny ribbons
  (`#9a5fb5`, `#5f86d9`) now show clearly.
- **Starlight unicorn:** the lavender mane shows down its left side from the front, and with
  the nostrils gone the muzzle looks like a pony's. The horn is clear. The shiny's gold mane
  stands out on midnight.
- **Capybara:** a longer, blunter snout with the darker top and the ears set back. In the ¾
  view it reads as a capybara, not a bear.
- **African penguin:** the spots sit below the chest band, so it no longer reads as a face on
  its tummy.

The other 16 creatures are unchanged. The family and both wallpapers still pass. Hand-over to
the tester.

### Hand-over

Back to the developer for must-fix 1–5 (done; see *Re-review*). When the new screenshots match, the UX designer only
needs a quick look at the four changed tiles before the tester; nothing else needs a new review.

## Modelling brief for Fable agents

Developer, 2026-11-22. Each Fable agent gets this brief, *Design* §1–§10 above, and its one
creature's row from the table, §7 and §8. The shared code and one finished example exist:

- `src/components/creatures/model.ts`: the shared interface (read it; don't change it).
- `src/components/creatures/models/cat.ts`: **the example to copy**: same structure, same
  helpers, same comment at the top.

**Your file.** Exactly one new file: `src/components/creatures/models/<id>.ts`, with `<id>` from
the table (e.g. `red-fox.ts`). It exports two things, named from the id
(`red-fox` → `RedFox` / `redFox`, `starlight-unicorn` → `StarlightUnicorn` / `starlightUnicorn`):

```ts
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, orientBetween, sphere, torus } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildRedFox(p: CreatureParams): THREE.Group { /* ... */ }
export const redFox: CreatureModel = { id: 'red-fox', build: buildRedFox }
```

The registry finds the file by its name: don't edit `models/index.ts` or anything else.

**The interface** (all from `../model`):

- `p.quality` (`'low' | 'high'`) goes into every geometry; `p.stage` is never read (always build the
  grown-up); `p.palette` is only used through `creatureMaterials(p)`.
- `const m = creatureMaterials(p)`: paint every mesh with one of `m.body`, `m.belly`, `m.accent`,
  `m.accent2`, `m.eye`, `m.nose`, `m.glint`, `m.blush`. Nothing else.
- Geometry only through the helpers, which take their segments from `SEG`:
  `sphere(r, 'L' | 'M' | 'S' | 'XS', q)`, `capsule(r, length, q)` (along y; the caps add `r` at each
  end), `cone(r, h, q, sides?)` (`sides` 4 for small ears, 3 for a triangle nose),
  `cylinder(rTop, rBottom, h, q)`, `torus(r, tube, q, arc?)` (round the z axis). For a flat shape
  (star, ribbon end, wing) `new THREE.ShapeGeometry` / `ExtrudeGeometry` with at most 12 points.
- `mesh(geometry, material, position?, rotation?, scale?)` and `group(name, position?, rotation?)`;
  `orientBetween(obj, a, b)` puts `obj` between two points with its +y along them and returns the
  distance (see the cat's tail).
- Parts are groups named `part:body`, `part:head`, `part:eyes` (inside `part:head`), `part:armL`,
  `part:armR`, and if it has them `part:tail`, `part:wings`, at the pivots of §5. Helper groups
  inside a part (an ear with its inner ear) are fine. On the root only parts and `seat`.
- Anchors: `anchor('seat' | 'neck' | 'back' | 'head' | 'hat' | 'face' | 'paw', size)`, size above 0,
  in the part §5 names, then `.position.set(...)` (and a rotation for `back`).
- Tags on meshes: `userData.detail = true` (dropped on low), `userData.stageRole = 'extra'` (horns,
  wings, ribbons, gills, tufts, mane), `userData.stageRole = 'foot'` (feet; added by the developer
  so stages can shrink feet with the arms), `userData.satin = true` (at most two parts, on
  `accent`/`accent2`).
- Mirror by position (`s * x` for `s` in −1, 1), never by a negative scale.

**The budget** (checked by the test): at most 40 meshes; after the shared merge at most **3,000
triangles on high**, **1,500 on low**, **12 draw calls**; bounding box 0.95–1.15 tall, at most 1.1
wide and 0.8 deep; bottom on y = 0. The cat, with the full shared body, is **2,638 / 1,154
triangles and 8 draw calls**: the shared body costs most of the budget, so keep species features on
`M`/`S`/`XS` segments, prefer one stretched sphere over several, and tag small markings `detail`.
Each extra material kind in a part (gloss nose, blush, satin) is one more draw call.

**Don't touch:** `model.ts`, `models/index.ts`, `cat.ts` or any other creature's file, the species
list (`src/lib/creatures/species.ts`), the tests, `/style`, `package.json` or anything outside your
one file. No colour literal (`#…`, `0x…`, `rgb(`), no `THREE.Color`, no `new THREE.…Material`, no
merging, no animation, no `p.stage`, no import except `three` and `../model`: the test fails on
each. If the style sheet can't be met for your animal, say so in your reply instead.

**Test your own file** (from `C:\Users\User\hrl-creatures`, Git Bash):

```bash
export PATH="/c/Program Files/nodejs:$PATH:$APPDATA/npm"
pnpm exec vitest run src/components/creatures/models.test.ts -t <id> --silent=false
pnpm exec tsc --noEmit
```

The test prints a line `model <id>: <high> / <low> tris, <calls> calls, <w> wide × <h> tall × <d> deep`. Both commands must pass. The registry loads every file in `models/`, so while other agents are writing theirs a run can fail on *their* half-written file: check the error names your file, otherwise wait a minute and run again. Reply with the
file path, that line, and your token count.

## Developer notes (step B, part 1)

Taken at night with the recommended option, without asking Hanna (all reversible):

1. **Palettes live only in the species list** (`src/lib/creatures/species.ts`, `palette` and
   `shinyPalette` for all 20), not in each model file as Design §6 sketched (`CreatureModel` has
   `id` and `build`). Reason: Done when 6 forbids any colour literal in the model files, and one
   place for the colours means the shiny of T-0030 is just `shinyPalette`.
2. **`makeCreature` lives in `models/index.ts`** (re-exported from `src/components/creatures`),
   not in `model.ts`: the model files import `model.ts`, so `model.ts` importing the models would
   be an import cycle. The registry finds model files by name (`import.meta.glob`), so the Fable
   agents never edit a shared file.
3. **Geometry helpers in `model.ts`** (`sphere`, `capsule`, `cone`, `cylinder`, `torus`, `mesh`,
   `group`, `orientBetween`) so segment counts can only come from `SEG`.
4. **Stages:** `STAGE_SCALE` holds Design §2's table and `applyStage` a first version (body round
   its centre, the other parts follow the body and scale round their pivots; eyes, feet and extras
   get their own factor). T-0029 refines it. Feet are tagged `stageRole: 'foot'` for it.
5. **Merged meshes** are named `mesh:<part>:<kind>` (e.g. `mesh:body:matte`) so they are not taken
   for parts.
6. **The model test** waits for all 20 with `EXPECT_ALL_MODELS = false`; set it to `true` after
   step A.
7. **/style:** one canvas behind a grid of tiles, Lavender/Midnight buttons that change the
   wallpaper for this page only (the saved room stays), and a Shiny switch for Done when 7.

## Developer notes (step B, part 2)

Taken at night with the recommended option, without asking Hanna (all reversible):

8. **Precise bounding box.** `inspectCreature` and `finishCreature`'s "stand it on y = 0" now
   measure with `Box3.setFromObject(root, true)` (vertex-precise). The plain box measures each
   geometry's own box after rotation, so it over-measures rotated parts (one agent saw `red-fox`
   fail the raw "bottom at y = 0" check that way). No model was changed to work around it.
9. **Shared `front(c, r, x, y)`** (z of an ellipsoid's front surface at x, y) moved into
   `model.ts`; the five files that had an identical local copy (african-penguin, axolotl,
   emperor-penguin, red-panda, ring-tailed-lemur) import it now. Their test numbers are unchanged.
   Later Fable briefs may use it.
10. **Screenshots** are of the Creatures section only, at exactly 390 × 844 and 1280 × 800, in
    viewport-sized parts down the section (`-1`, `-2`: the WebGL canvas paints only what is on
    screen). Time is frozen with Playwright's clock and moved on a few frames, so every creature
    shows its ¾ start pose instead of a random point of the turn. Shiny shots on both wallpapers
    at both sizes (Done when 7). No black silhouette shots: Done when does not ask for them; the
    UX designer can ask.
11. **Fable token log per batch, not per creature.** Step A ran as four Fable agents of four or
    five creatures each (one creature per file), not one agent per creature as *Notes* planned;
    the agents reported one total per batch, so Done when 5's "one line per creature" can only
    list the creatures per batch. Per-creature numbers were not reported and are not invented.

# Test

Tester, 2026-11-23, on `83d031e` (branch `t-0027-book-creatures`, draft PR #241).

**CI's run, read, not repeated.** Run 45081995103 (attempt 1, no re-runs): `checks / checks`
pass. `harness check`: 34 tasks, index in step; 38 decisions, 3 overrules valid; generated files
current. `pnpm test`: `Test Files 95 passed | 1 skipped (96)`, `Tests 1028 passed | 9 skipped
(1037)`; no retry in the log. `pnpm run build`: client and server built. `e2e` and `shards`
skipped (this project's CI passes no e2e command; the same on `main`). Netlify deploy preview
ready.

**Run here, from clean.** `pnpm install --frozen-lockfile`: done. `pnpm exec harness check`: all
four ✓. `pnpm test` (Done when 1, 2, 6): `Test Files 95 passed | 1 skipped (96)`, `Tests 1028
passed | 9 skipped (1037)`, the same as CI. `pnpm exec tsc --noEmit`: clean. `pnpm run build`:
built. The creature tests five times, shuffled, no retries (`vitest run src/components/creatures
src/lib/creatures --sequence.shuffle --retry=0`): `3 passed (3)`, `172 passed (172)` all five
times.

**Code read (targeted).**
- `model.ts`: the merge bakes each slot colour into a `color` attribute per vertex, merges per
  part and kind into the four shared materials, flips the winding of mirrored parts, and disposes
  the raw geometries, the clones and the slot materials that were drawn with. Bounds use
  `setFromObject(root, true)` (vertex-precise) in both `finishCreature` and `inspectCreature`.
  `front()` is the ellipsoid surface formula, clamped at 0 outside the outline. `disposeCreature`
  frees geometries only and leaves the shared materials alone, as it should.
- `species.ts`: 20 species, tiers 5/3/3/3/2/4 in order, commons first, all with `shiny: true`
  and a shiny palette whose body differs; 15 wild animals with scientific name, category, year
  where known and https sources; the cat `domestic`; the four fantasy ones legendary with no
  category. `speciesById` throws on an unknown id.
- Registry (`models/index.ts`): finds model files by name with `import.meta.glob`; `makeCreature`
  throws `No model for creature <id> yet`. The model test checks every file is found and all 20
  exist.

**Tried to break it.** New test file `src/components/creatures/creatures.stress.test.ts`
(62 tests, the gaps the model test left):
- every creature × 3 stages × 2 qualities × plain and shiny (240 builds): within budget (1,500
  low / 3,000 high triangles, ≤ 12 draw calls), on y = 0, at most 1.15 tall, only the shared
  materials, no NaN vertex, a vertex colour on every vertex: **pass**;
- leaks: every geometry made while building is either in the finished creature or disposed,
  every slot material that was drawn with is disposed, `disposeCreature` frees every geometry
  left and never a shared material; then all 20 built and disposed 10 times over (200 builds):
  no geometry left alive, the four shared materials unchanged: **pass**. I made sure the test
  bites: removing any of the three dispose calls (raw geometries, slot materials, or half of
  `disposeCreature`) fails 21 tests;
- an unknown id (`unicorn-cat`): `modelFor` gives undefined, `makeCreature` and `speciesById`
  throw a clear error: **pass**;
- no colour of its own in any model file: no hex, `rgb()`, `0x…`, `THREE.Color`, `.color.set…`,
  `emissive` or `vertexColors` (on top of the model test's check): **pass**; a grep of the 20
  files finds no colour literal at all.

Finding, not blocking: `creatureMaterials()` makes all eight slot materials, but
`finishCreature` disposes only the ones a mesh used, so a creature that never paints with, say,
`accent2` leaves that material undisposed. It is never drawn, so it holds nothing on the GPU and
the garbage collector takes it (the test pins exactly that: only unused slot materials stay).
T-0029 may dispose all eight to be tidy.

**/style in Chrome** (no-backend `vite dev --port 3145`, playwright-core; stopped afterwards and
the port checked free): at 390 × 844 (touch) and 1280 × 800, on lavender and midnight, plain and
shiny: 20 tiles with the right names, none "Not modelled yet", every tile's square has a drawn
creature (each square's screenshot 5.3–22 KB; samples looked at by eye), the wallpaper attribute
follows the buttons. 30 fast Shiny/wallpaper flips and a live 1280 ↔ 390 resize: no page error,
WebGL context not lost. Console: no error from the page or the creatures; only `favicon.ico`
404 on the dev server and r3f's `THREE.Clock` deprecation warning, which the home page shows too
(both already on `main`). The home page loads no creature module.

**Bundle (code splitting).** All creature code sits in the `/style` route chunk only (the
species ids and `No model for creature` appear in `style-*.js` and no other chunk).
`style-*.js` grows from 5.89 kB to 63.70 kB (15.53 kB gzip); the home page's chunks go from
`index` 342.04 + `routes` 1,406.86 + `StarRating` 25.41 kB (main's CI) to `index` 342.04 +
`routes` 476.89 + `RoomPanel` 955.82 kB: +0.44 kB (+0.24 kB gzip), the same code split
differently because `/style` now shares `useRoom`. No page without creatures grew.

**Done when.** 1, 2 and 6: the tests pass (above). 3: seen myself on 3145, screenshots in
`docs/tasks/T-0027-screens/`. 4 and 7: the UX designer's review and re-review pass. 5: the Fable
tokens are logged per batch of four or five creatures with a total (595,975), not per creature,
because the agents reported only batch totals (*Developer notes* 11); recorded as it is, not
invented.

**Verdict: passed.** The PR stays a **draft** on purpose: the 15 Red List categories still need
a person to check them on iucnredlist.org (the site refuses automated reading), or Hanna's OK on
the cited sources. Once that is done and noted here, it is ready to go: mark it ready and it
merges itself when green.

# Log

- 2026-11-22 architect: wrote the task from Hanna's agreed brief; picked the 20 creatures and
  checked each real animal's Red List category (emperor penguin moved to Endangered in April 2026;
  koala Vulnerable); split modelling into a Fable step (one agent per creature, base look only) and
  a normal-agent step; recorded D-0033 and D-0034; 15 questions taken with the recommended option
  for the morning. Size: full (new data, new 3D models, visible on /style).
- 2026-11-22 ux-designer: designed. Style sheet for the Fable agents in *Design* (proportions in
  model units, budget 3,000/1,500 triangles and 12 draw calls, shared vertex-colour materials,
  parts and anchors, the shared `model.ts` interface, 20 palettes with 10 shiny palettes, a
  silhouette line per creature, wallpapers, shelf and den); Done when 6–7 added; questions 16–19
  taken with the recommended option for the morning. Hand-over to the developer: write `model.ts`
  as Design §6, then step A.
- 2026-11-22 architect: Hanna answered the 19 questions; kept all but four: the welcome gift is
  just an egg, she chooses her first creature from the commons, releasing a pet is possible with a
  confirm step (and the shiny warning with hold), and all 20 creatures get a shiny (ten more
  palettes added to Design §7, gold / purple / night-sky). D-0033, the brief and T-0028 to T-0030
  updated. Saving her choices without a server change looked at again: see T-0028.
- 2026-11-22 developer: step B part 1 on branch t-0027-book-creatures: the species list with palettes and shiny palettes for all 20 and its test (`src/lib/creatures/species.ts`); the shared `src/components/creatures/model.ts` (types, `SEG`, `radial`, geometry helpers, `creatureMaterials`, `anchor`, `ANCHORS`/`PARTS`, `STAGE_SCALE` and `applyStage`, vertex-colour bake and merge per part and kind in `finishCreature`); `makeCreature` and a file-name registry in `models/index.ts`; the model test (Done when 2 and 6) in `src/components/creatures/models.test.ts`; the Creatures section on /style; the house cat as the example model. Check: `pnpm test` 93 files passed, 883 tests passed (10 skipped, among them the all-20 check until step A); `model cat: 2638 / 1154 tris, 8 / 8 calls, 0.75 wide × 1.00 tall × 0.61 deep`; `tsc --noEmit` clean; `harness check` passed. /style seen in headless Chrome: the cat turns in its tile on lavender. Choices taken without asking: *Developer notes* above. Modelling brief for the Fable agents written. Remaining: step A (19 Fable models, tokens in *Log*), the four screenshots, the UX review, the Red List re-check on iucnredlist.org in a browser before merging, and the PR.
- 2026-11-22 developer: step A done by four Fable agents (one file per creature, the 19 new model files in `src/components/creatures/models/`). Fable tokens as reported, per agent: batch 1 (red-fox, capybara, red-squirrel, adelie-penguin, hedgehog) 138,665; batch 2 (otter, platypus, koala, giant-panda, polar-bear) 145,830; batch 3 (red-panda, emperor-penguin, ring-tailed-lemur, african-penguin, axolotl) 181,225; batch 4 (book-dragon, library-owl, bookmark-fox, starlight-unicorn) 130,255; **total 595,975 (about 596,000)**. The cat was written by the developer (no Fable tokens). Per-creature numbers were not reported (*Developer notes* 11).
- 2026-11-22 developer: step B part 2. Reviewed the 19 files against the Modelling brief (no colour literal, budget, parts, anchors, tags: all met; the test checks each). `EXPECT_ALL_MODELS = true`; bounding boxes now vertex-precise (`setFromObject(root, true)`) in `inspectCreature` and `finishCreature`; shared `front()` in `model.ts` for the five files that copied it. No model file changed its look. Check: `pnpm exec vitest run src/components/creatures src/lib/creatures`: 2 files, 110 tests passed; `pnpm test`: 93 files passed (1 skipped), 979 tests passed (9 skipped); `tsc --noEmit` clean; `pnpm run build` built; `harness check` passed. The model lines (high / low triangles, high / low draw calls, size):
  - `cat` 2638 / 1154, 8 / 8, 0.75 × 1.00 × 0.61; `red-fox` 2516 / 1220, 8 / 8, 0.83 × 1.02 × 0.70; `capybara` 2296 / 1056, 7 / 7, 0.72 × 0.97 × 0.73; `red-squirrel` 2392 / 1176, 8 / 8, 0.82 × 1.13 × 0.74; `adelie-penguin` 2296 / 1036, 8 / 8, 0.76 × 0.96 × 0.74
  - `hedgehog` 2716 / 1380, 7 / 7, 0.74 × 1.02 × 0.74; `otter` 2532 / 1200, 8 / 8, 0.78 × 0.96 × 0.65; `platypus` 2116 / 992, 8 / 7, 0.82 × 0.96 × 0.76; `koala` 2344 / 1144, 7 / 7, 0.75 × 0.97 × 0.60; `giant-panda` 2716 / 1276, 8 / 8, 0.67 × 0.98 × 0.66
  - `polar-bear` 2416 / 1144, 8 / 8, 0.71 × 0.97 × 0.73; `red-panda` 2932 / 1444, 8 / 8, 0.92 × 0.98 × 0.71; `emperor-penguin` 2476 / 1160, 8 / 8, 0.69 × 1.08 × 0.71; `ring-tailed-lemur` 2960 / 1360, 8 / 8, 0.82 × 1.11 × 0.71; `african-penguin` 2608 / 1156, 8 / 8, 0.65 × 0.97 × 0.68
  - `axolotl` 2524 / 1208, 7 / 7, 0.95 × 0.98 × 0.72; `book-dragon` 2604 / 1244, 11 / 10, 0.95 × 1.05 × 0.66; `library-owl` 2436 / 1192, 8 / 8, 0.72 × 0.98 × 0.58; `bookmark-fox` 2000 / 1000, 9 / 9, 0.93 × 1.08 × 0.76; `starlight-unicorn` 2936 / 1288, 10 / 9, 0.71 × 1.11 × 0.69
- 2026-11-22 developer: notes from the Fable agents for the UX review (design judgement left to the UX designer): the book dragon's arms rest on its tummy, not folded at its sides as Design §4 says for wing-arms; the dragon's `back` anchor sits under the book wings; the unicorn's `hat` anchor sits near its horn; the red panda has a dark tummy on purpose (real red pandas are dark underneath); the emperor penguin is 1.08 tall (the tall one); the Adélie, African and emperor penguins have stub tails; the hedgehog is at the 40-primitive cap; the lemur's (2,960) and the red panda's (2,932) triangle budgets are tight. Found in review: the unicorn tags `satin` on three parts (hooves, horn, flank star), one more than Design §3's "at most two"; it costs no extra draw call, left as built for the UX designer.
- 2026-11-22 developer: screenshots of the /style Creatures section in `docs/tasks/T-0027-screens/` (`390-…` at 390 × 844, `1280-…` at 1280 × 800; lavender, midnight, and `-shiny` on both; `-1`/`-2` are the top and bottom of the section). All 20 tiles render (none "Not modelled yet"), no page errors and no failed requests. Taken on the no-backend dev server (`vite dev --port 3141`), stopped afterwards and the port checked free.
- 2026-11-22 developer: Red List re-check on iucnredlist.org in a real browser (Chrome through playwright-core, `channel: 'chrome'`): **the site still refuses automated access**. Headless gets Cloudflare's "Just a moment…" (403) at once. Headed Chrome got through twice: the species search now asks for a login ("Advanced Search is available to signed-in users"), and the red fox's page by taxon number opened on its *Mediterranean regional* assessment (Least Concern, 2008, e.T23062A9413836), not the global one. After that every page, headed, with a kept profile, after an 8-minute pause and 25 s between pages, got Cloudflare's challenge (403) again. I did not try to disguise the automation or to log in. The categories in the table stay as cited from the sources that quote the Red List (*The 20 creatures*). Remaining: a person opens the 15 real animals on iucnredlist.org by hand before merging and notes the date here.
- 2026-11-22 developer: Remaining: the UX review (Done when 4 and 7, *Review*), the Red List check by hand (above), and the tester.
- 2026-11-23 ux-designer: reviewed: changes needed. The family passes (Done when 4) and 16 of 20 are recognisable at 120 px; five must-fix items (bookmark fox ribbons and its shiny ribbon colours, unicorn mane, nostrils and hat anchor, capybara snout and ears, African penguin chest spots), each tried on the dev server and with the model test, then reverted. Integrator notes accepted except the unicorn's hat anchor. §7's bookmark-fox shiny row updated. Back to the developer. Remaining: must-fix 1–5 and new screenshots, a quick UX look at the four changed tiles, the Red List check by hand, and the tester.
- 2026-11-23 developer: must-fix 1–5 from *Review after building* applied exactly, no Fable: bookmark-fox side ribbons up beside the head; bookmark-fox shiny ribbons `#9a5fb5` / `#5f86d9` in `species.ts`; starlight-unicorn mane down its left side, nostrils removed (nose slot unused), `hat` at (0, 0.348, −0.08) with `rotation.x = −0.35`, top comment updated; capybara longer snout, wider darker top, nose forward, ears set back; african-penguin chest spots below the band. The two optional tweaks were left alone. Check: `vitest run src/components/creatures src/lib/creatures` 2 files, 110 tests passed; `model bookmark-fox: 2000 / 1000 tris, 9 / 9 calls, 0.82 wide × 1.08 tall × 0.76 deep`; `model starlight-unicorn: 2864 / 1288 tris, 9 / 9 calls, 0.71 wide × 1.11 tall × 0.68 deep`; `model capybara: 2296 / 1056 tris, 7 / 7 calls, 0.72 wide × 0.97 tall × 0.80 deep`; `model african-penguin: 2608 / 1156 tris, 8 / 8 calls, 0.65 wide × 0.97 tall × 0.68 deep` (all as the review expected); `tsc --noEmit` clean. All 16 screenshots re-taken with the same script on `vite dev --port 3141` (no errors, all 20 tiles render), vite stopped and the port checked free. Lesson added to `docs/lessons.md`. Remaining: a quick UX look at the four changed tiles, the Red List check by hand, and the tester.
- 2026-11-23 ux-designer: reviewed: pass. Re-review of must-fix 1–5 (commit 11382ff, new screenshots): bookmark fox ribbons and shiny ribbons, unicorn mane, muzzle and hat anchor, capybara snout and ears, African penguin chest spots all as specified and readable at 120 px on both wallpapers. Hand-over to the tester. Remaining: the Red List check by hand on iucnredlist.org, and the tester.
- 2026-11-23 tester: passed. CI green on the first attempt; tests, build and `harness check` re-run here; 62 new tests in `creatures.stress.test.ts` (all stages × qualities × plain/shiny, leaks over 200 builds, unknown id, colour writes); /style seen at 390 and 1280 on both wallpapers with no page errors; creature code only in the /style chunk. Not marked ready: it waits for the Red List check. Remaining: a person opens the 15 wild animals on iucnredlist.org by hand (or Hanna OKs the cited sources) and notes the date here; then mark PR #241 ready and it merges itself.
