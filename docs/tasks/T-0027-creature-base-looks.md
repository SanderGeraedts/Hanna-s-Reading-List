---
id: T-0027
title: "Design the base 3D look of the 20 book creatures, each once by a Fable agent"
description: "First step of the book creatures (D-0033): the species list with rarity, IUCN Red List category and source in the code, and one cute low-poly 3D base model per creature, designed once per animal by an agent on the Fable model; shown on the unlinked /style page; nothing in the app links to them yet."
status: Open
size: full
depends_on: []
decisions: [D-0002, D-0017, D-0020, D-0022, D-0033]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

Hanna wants a reading game with cute 3D creatures (koala/cat style) she collects by reading
([the brief](../book-creatures-brief.md), D-0033). Every later creature task builds on their looks,
so this task makes them first:

1. **The species list** in the code (`src/lib/creatures/species.ts`): the 20 creatures below, each
   with an id, a name, its tier, for a real animal the scientific name, IUCN Red List category,
   assessment year where known and source, and whether it has a shiny variant. Order: commons first,
   so the first egg is common.
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
| 3 | `capybara` | Capybara | *Hydrochoerus hydrochaeris* | Least Concern (2016) | common | no | [Mammal Diversity Database](https://www.mammaldiversity.org/taxon/1001209), [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/capybara) |
| 4 | `red-squirrel` | Eurasian red squirrel | *Sciurus vulgaris* | Least Concern | common | no | [Mammal Diversity Database](https://www.mammaldiversity.org/taxon/1001701) |
| 5 | `adelie-penguin` | Adélie penguin | *Pygoscelis adeliae* | Least Concern | common | yes | [BirdLife DataZone factsheet](https://datazone.birdlife.org/species/factsheet/adelie-penguin-pygoscelis-adeliae/summary) |
| 6 | `hedgehog` | European hedgehog | *Erinaceus europaeus* | Near Threatened (2024) | uncommon | yes | [IUCN press release Oct 2024](https://iucn.org/press-release/202410/more-one-three-tree-species-worldwide-faces-extinction-iucn-red-list), [Mammal Society](https://mammal.org.uk/press-hub/breaking-european-hedgehog-listed-as-near-threatened-on-iucn-red-listnbsp) |
| 7 | `otter` | Eurasian otter | *Lutra lutra* | Near Threatened (2022) | uncommon | no | [IUCN SSC Otter Specialist Group](https://otterspecialistgroup.org/osg-newsite/?p=788) (Loy et al. 2022, e.T12419A218069689) |
| 8 | `platypus` | Platypus | *Ornithorhynchus anatinus* | Near Threatened (2016) | uncommon | yes | [Mammal Diversity Database](https://mammaldiversity.org/taxon/1000001), [Australian Museum](https://australian.museum/Platypus) |
| 9 | `koala` | Koala | *Phascolarctos cinereus* | Vulnerable (2016) | rare | yes | [Mongabay, May 2026: latest IUCN assessment still Vulnerable](https://news.mongabay.com/2026/05/australias-new-national-park-links-habitat-to-protect-koalas/), [IFAW](https://www.ifaw.org/international/journal/koala-faq) |
| 10 | `giant-panda` | Giant panda | *Ailuropoda melanoleuca* | Vulnerable (2016) | rare | no | [Smithsonian's National Zoo](https://www.nationalzoo.si.edu/animals/news/giant-panda-status-upgraded-endangered-vulnerable) |
| 11 | `polar-bear` | Polar bear | *Ursus maritimus* | Vulnerable (2015) | rare | no | [IUCN SSC Polar Bear Specialist Group](https://www.iucn-pbsg.org/iucn-redlist/), [IUCN press release](https://www.iucn.org/content/new-assessment-highlights-climate-change-most-serious-threat-polar-bear-survival-iucn-red-list) |
| 12 | `red-panda` | Red panda | *Ailurus fulgens* | Endangered (2015) | very rare | yes | [GBIF (IUCN)](https://gbif.org/species/113392444), [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/red-panda) |
| 13 | `emperor-penguin` | Emperor penguin | *Aptenodytes forsteri* | Endangered (2026) | very rare | no | [IUCN press release, 9 April 2026: Near Threatened → Endangered](https://iucn.org/node/46369), [Smithsonian](https://www.smithsonianmag.com/smart-news/as-their-antarctic-habitat-melts-away-emperor-penguins-are-now-considered-an-endangered-species-180988520/) |
| 14 | `ring-tailed-lemur` | Ring-tailed lemur | *Lemur catta* | Endangered (since 2012) | very rare | no | [National Geographic](https://www.nationalgeographic.com/animals/mammals/facts/ring-tailed-lemur), [Mongabay](https://news.mongabay.com/2013/12/madagascars-most-famous-lemur-facing-big-threats/) |
| 15 | `african-penguin` | African penguin | *Spheniscus demersus* | Critically Endangered (2024) | epic | no | [BirdLife DataZone factsheet](https://datazone.birdlife.org/species/factsheet/african-penguin-spheniscus-demersus/summary), [SANCCOB](https://sanccob.co.za/news/african-penguin-newly-classified-as-critically-endangered-as-breeding-pairs-fall-below-10000/) |
| 16 | `axolotl` | Axolotl | *Ambystoma mexicanum* | Critically Endangered (2020) | epic | yes | [AmphibiaWeb (cites the 2020 IUCN assessment)](https://amphibiaweb.org/species/3842) |
| 17 | `book-dragon` | Book dragon | fantasy | — | legendary | yes | — |
| 18 | `library-owl` | Library owl | fantasy | — | legendary | no | — |
| 19 | `bookmark-fox` | Bookmark fox (ribbon-bookmark tails) | fantasy | — | legendary | no | — |
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
   legendary with no category; the first in the list is common; exactly the 10 shiny species of
   D-0033 have `shiny: true`.
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

## Questions to re-ask Hanna in the morning

Hanna was asleep (22:30–08:00 rule): each was taken with the recommended option. Ask her again
when she's back.

1. **Emperor penguin** is now Endangered on the Red List (since April 2026), so it is very rare, not
   uncommon as in her example. Options: follow the Red List (taken) / keep her example. 
2. **The 20 creatures** above, with three penguins (one per level). Options: this list (taken) /
   swap a penguin or another animal for one she'd rather have.
3. **The fantasy four**: book dragon, library owl, bookmark fox, starlight unicorn. Options: these
   (taken) / other names or creatures.
4. **Which have a shiny**: 10 of 20 (listed above). Options: these 10 (taken) / all 20 / fewer.
5. **Cookie speed**: 1 🍪 per 5 minutes of reading or listening (about every 3 pages), +10 for a
   finished book, so a common egg (60 🍪) is about a week at 45 minutes a day, close to her example
   prices. Options: this (taken) / faster / slower.
6. **Egg prices**: common 60, uncommon 90, rare 120, very rare 160, epic 200, legendary 300.
   Options: these (taken) / her example 50 / 100 / 150.
7. **Welcome gift**: a common egg plus the cookies of her last 30 days of reading, at most 150.
   Options: this (taken) / all past reading at a lower rate / a fixed amount.
8. **First creature**: a surprise among the five commons (not always the cat). Options: surprise
   (taken) / always the cat / she picks.
9. **Duplicates**: turn into cookies = half the egg's price; power-up = +3 levels. Options: these
   (taken) / other amounts.
10. **Release a pet**: there is no way to release or delete a pet at all for now (nothing can be
    lost). Options: none (taken, most cautious) / a release with the shiny-style confirmation.
11. **"Missing you"**: after 3 days without reading. Options: 3 days (taken) / 2 / 5.
12. **"Sleepy late at night"** starts at 22:30. Options: 22:30 (taken) / 22:00 / 23:00.
13. **The Creatures tab** is a new page tab next to Calendar (the planned Stats tab would make six).
    Options: a tab (taken) / reached only from its dashboard block.
14. **Before Sander's part is live**, choices (names, purchases...) stay on the device where she
    made them and move into her account once it is. Options: this (taken) / wait with the whole
    game until Sander's part is live.
15. **Bought room decorations** belong to her on every device, but shown or hidden per device like
    the other decorations (D-0022). Options: this (taken) / shown everywhere at once.

# Design

For the UX designer, before step A: a one-page style sheet in this section that every Fable agent
gets: proportions (big head, short body, round shapes; baby → grown-up), eyes (one shared style),
outline or not, palette rules on both wallpapers, the pose (sitting, facing the viewer, ¾ turn), and
the size check at 120 px. After the build: the review of the four screenshots (Done when 4).

# Test

# Log

- 2026-11-22 architect: wrote the task from Hanna's agreed brief; picked the 20 creatures and
  checked each real animal's Red List category (emperor penguin moved to Endangered in April 2026;
  koala Vulnerable); split modelling into a Fable step (one agent per creature, base look only) and
  a normal-agent step; recorded D-0033 and D-0034; 15 questions taken with the recommended option
  for the morning. Size: full (new data, new 3D models, visible on /style).
