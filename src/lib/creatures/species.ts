/**
 * The 20 book creatures (D-0033, T-0027): who they are, how rare they are and
 * their colours. Rarity of a real animal is its IUCN Red List category, checked
 * by hand and kept here with its source (no live lookup, D-0033 §4). When the
 * Red List changes a category, change it here; the tier follows from it.
 *
 * Order matters: the five commons come first (she picks her first creature
 * from them, D-0033 §3), then the tiers from uncommon to legendary.
 */

export type SpeciesId =
  | 'cat'
  | 'red-fox'
  | 'capybara'
  | 'red-squirrel'
  | 'adelie-penguin'
  | 'hedgehog'
  | 'otter'
  | 'platypus'
  | 'koala'
  | 'giant-panda'
  | 'polar-bear'
  | 'red-panda'
  | 'emperor-penguin'
  | 'ring-tailed-lemur'
  | 'african-penguin'
  | 'axolotl'
  | 'book-dragon'
  | 'library-owl'
  | 'bookmark-fox'
  | 'starlight-unicorn'

export type Tier = 'common' | 'uncommon' | 'rare' | 'very rare' | 'epic' | 'legendary'
export const TIERS: readonly Tier[] = ['common', 'uncommon', 'rare', 'very rare', 'epic', 'legendary']

/** IUCN Red List categories used here; `domestic` is an animal that is not on the list at all. */
export type RedListCategory =
  | 'domestic'
  | 'Least Concern'
  | 'Near Threatened'
  | 'Vulnerable'
  | 'Endangered'
  | 'Critically Endangered'

/** D-0033 §4: the Red List decides a real animal's tier. */
export const TIER_OF_CATEGORY: Record<RedListCategory, Tier> = {
  domestic: 'common',
  'Least Concern': 'common',
  'Near Threatened': 'uncommon',
  Vulnerable: 'rare',
  Endangered: 'very rare',
  'Critically Endangered': 'epic',
}

/**
 * The colour slots every creature model paints with (T-0027 Design §6–7).
 * sRGB hex; the 3D builder converts them. A shiny is the same model built with
 * the shiny palette.
 */
export interface CreaturePalette {
  /** main fur, feathers or skin */
  body: string
  /** tummy, muzzle, inner ear, face */
  belly: string
  /** the species' marking: mask, socks, stripes, bill, horn */
  accent: string
  /** a second marking (same as accent when the species has none) */
  accent2: string
  /** '#111114' for every species */
  eye: string
  /** nose, beak or bill tip */
  nose: string
}

export const EYE = '#111114'

export interface RedList {
  category: RedListCategory
  /** year of the assessment, where known */
  year?: number
  /** where the category was checked (pages that cite the Red List; iucnredlist.org refuses robots) */
  sources: string[]
}

export interface Species {
  id: SpeciesId
  name: string
  tier: Tier
  /** real animals only */
  scientificName?: string
  /** real animals only; fantasy creatures have none */
  redList?: RedList
  /** every creature has a shiny variant (D-0033 §5) */
  shiny: true
  palette: CreaturePalette
  shinyPalette: CreaturePalette
}

/** Shorthand for a palette row of Design §7: body, belly, accent, accent2, nose. */
function pal(body: string, belly: string, accent: string, accent2: string, nose: string): CreaturePalette {
  return { body, belly, accent, accent2, eye: EYE, nose }
}

export const SPECIES: readonly Species[] = [
  // ---- common -------------------------------------------------------------
  {
    id: 'cat',
    name: 'House cat',
    tier: 'common',
    scientificName: 'Felis catus',
    redList: { category: 'domestic', sources: ['https://mammaldiversity.org/taxon/1005985'] },
    shiny: true,
    palette: pal('#e8b07a', '#f6ead8', '#c97f45', '#e8a9a4', '#d98a8a'),
    shinyPalette: pal('#f2eee8', '#fffaf0', '#d9a85b', '#e8a9a4', '#d98a8a'),
  },
  {
    id: 'red-fox',
    name: 'Red fox',
    tier: 'common',
    scientificName: 'Vulpes vulpes',
    redList: {
      category: 'Least Concern',
      sources: ['https://canids.org/species/view/PREKLP237241', 'https://eunis.eea.europa.eu/species/11350'],
    },
    shiny: true,
    palette: pal('#df7a35', '#f7efe4', '#3a2a24', '#3a2a24', '#2b2a2f'),
    shinyPalette: pal('#c9ccd6', '#fbfaf7', '#5a5f6e', '#5a5f6e', '#2b2a2f'),
  },
  {
    id: 'capybara',
    name: 'Capybara',
    tier: 'common',
    scientificName: 'Hydrochoerus hydrochaeris',
    redList: {
      category: 'Least Concern',
      year: 2016,
      sources: [
        'https://www.mammaldiversity.org/taxon/1001209',
        'https://www.nationalgeographic.com/animals/mammals/facts/capybara',
      ],
    },
    shiny: true,
    palette: pal('#a87a52', '#c49a70', '#6e4d33', '#6e4d33', '#4a3628'),
    shinyPalette: pal('#d9a95e', '#efd3a0', '#a8763a', '#a8763a', '#4a3628'),
  },
  {
    id: 'red-squirrel',
    name: 'Eurasian red squirrel',
    tier: 'common',
    scientificName: 'Sciurus vulgaris',
    redList: { category: 'Least Concern', sources: ['https://www.mammaldiversity.org/taxon/1001701'] },
    shiny: true,
    palette: pal('#b5481f', '#f3e6d2', '#8f3816', '#8f3816', '#3a2a24'),
    shinyPalette: pal('#3e3a48', '#f3e6d2', '#d9a85b', '#d9a85b', '#2b2a2f'),
  },
  {
    id: 'adelie-penguin',
    name: 'Adélie penguin',
    tier: 'common',
    scientificName: 'Pygoscelis adeliae',
    redList: {
      category: 'Least Concern',
      sources: ['https://datazone.birdlife.org/species/factsheet/adelie-penguin-pygoscelis-adeliae/summary'],
    },
    shiny: true,
    palette: pal('#33343f', '#f7f7f4', '#f7f7f4', '#e7a3a0', '#2b2a2f'),
    shinyPalette: pal('#6e4f8f', '#fbf6ee', '#d9a85b', '#e7a3a0', '#2b2a2f'),
  },
  // ---- uncommon -----------------------------------------------------------
  {
    id: 'hedgehog',
    name: 'European hedgehog',
    tier: 'uncommon',
    scientificName: 'Erinaceus europaeus',
    redList: {
      category: 'Near Threatened',
      year: 2024,
      sources: [
        'https://iucn.org/press-release/202410/more-one-three-tree-species-worldwide-faces-extinction-iucn-red-list',
        'https://mammal.org.uk/press-hub/breaking-european-hedgehog-listed-as-near-threatened-on-iucn-red-listnbsp',
      ],
    },
    shiny: true,
    palette: pal('#8a6a4e', '#e8d4b8', '#5e4634', '#5e4634', '#2b2a2f'),
    shinyPalette: pal('#e8c9a0', '#fff4ea', '#d9a85b', '#d9a85b', '#2b2a2f'),
  },
  {
    id: 'otter',
    name: 'Eurasian otter',
    tier: 'uncommon',
    scientificName: 'Lutra lutra',
    redList: {
      category: 'Near Threatened',
      year: 2022,
      sources: ['https://otterspecialistgroup.org/osg-newsite/?p=788'],
    },
    shiny: true,
    palette: pal('#7a5236', '#d9bfa0', '#5e3d27', '#5e3d27', '#2b2a2f'),
    shinyPalette: pal('#7a5a8a', '#efe0d6', '#5a3f6a', '#5a3f6a', '#2b2a2f'),
  },
  {
    id: 'platypus',
    name: 'Platypus',
    tier: 'uncommon',
    scientificName: 'Ornithorhynchus anatinus',
    redList: {
      category: 'Near Threatened',
      year: 2016,
      sources: ['https://mammaldiversity.org/taxon/1000001', 'https://australian.museum/Platypus'],
    },
    shiny: true,
    palette: pal('#8a6440', '#c9a27a', '#5a5c66', '#5a5c66', '#2b2a2f'),
    shinyPalette: pal('#5fa8a0', '#cfe8e2', '#d9a85b', '#d9a85b', '#2b2a2f'),
  },
  // ---- rare ---------------------------------------------------------------
  {
    id: 'koala',
    name: 'Koala',
    tier: 'rare',
    scientificName: 'Phascolarctos cinereus',
    redList: {
      category: 'Vulnerable',
      year: 2016,
      sources: [
        'https://news.mongabay.com/2026/05/australias-new-national-park-links-habitat-to-protect-koalas/',
        'https://www.ifaw.org/international/journal/koala-faq',
      ],
    },
    shiny: true,
    palette: pal('#9196a0', '#ece6dc', '#ece6dc', '#ece6dc', '#2b2a2f'),
    shinyPalette: pal('#dcb882', '#fbf3e3', '#fbf3e3', '#fbf3e3', '#5a3e2a'),
  },
  {
    id: 'giant-panda',
    name: 'Giant panda',
    tier: 'rare',
    scientificName: 'Ailuropoda melanoleuca',
    redList: {
      category: 'Vulnerable',
      year: 2016,
      sources: ['https://www.nationalzoo.si.edu/animals/news/giant-panda-status-upgraded-endangered-vulnerable'],
    },
    shiny: true,
    palette: pal('#f4f1ea', '#f4f1ea', '#2e2c30', '#2e2c30', '#2b2a2f'),
    shinyPalette: pal('#fbf3e3', '#fbf3e3', '#b07a30', '#b07a30', '#2b2a2f'),
  },
  {
    id: 'polar-bear',
    name: 'Polar bear',
    tier: 'rare',
    scientificName: 'Ursus maritimus',
    redList: {
      category: 'Vulnerable',
      year: 2015,
      sources: [
        'https://www.iucn-pbsg.org/iucn-redlist/',
        'https://www.iucn.org/content/new-assessment-highlights-climate-change-most-serious-threat-polar-bear-survival-iucn-red-list',
      ],
    },
    shiny: true,
    palette: pal('#f3efe6', '#f3efe6', '#e3d9c6', '#e3d9c6', '#2b2a2f'),
    shinyPalette: pal('#cfe6e0', '#f3faf7', '#9d86d1', '#d9a85b', '#2b2a2f'),
  },
  // ---- very rare ----------------------------------------------------------
  {
    id: 'red-panda',
    name: 'Red panda',
    tier: 'very rare',
    scientificName: 'Ailurus fulgens',
    redList: {
      category: 'Endangered',
      year: 2015,
      sources: [
        'https://gbif.org/species/113392444',
        'https://www.nationalgeographic.com/animals/mammals/facts/red-panda',
      ],
    },
    shiny: true,
    palette: pal('#c1552a', '#f7efe4', '#3a2622', '#8a3a1c', '#2b2a2f'),
    shinyPalette: pal('#e0a64e', '#fffaf0', '#5a3b2a', '#b07a30', '#2b2a2f'),
  },
  {
    id: 'emperor-penguin',
    name: 'Emperor penguin',
    tier: 'very rare',
    scientificName: 'Aptenodytes forsteri',
    redList: {
      category: 'Endangered',
      year: 2026,
      sources: [
        'https://iucn.org/node/46369',
        'https://www.smithsonianmag.com/smart-news/as-their-antarctic-habitat-melts-away-emperor-penguins-are-now-considered-an-endangered-species-180988520/',
      ],
    },
    shiny: true,
    palette: pal('#3a3d48', '#f7f5ef', '#f2b23e', '#fbe7b0', '#2b2a2f'),
    shinyPalette: pal('#46508f', '#f7f5ef', '#f4d68c', '#fbe7b0', '#2b2a2f'),
  },
  {
    id: 'ring-tailed-lemur',
    name: 'Ring-tailed lemur',
    tier: 'very rare',
    scientificName: 'Lemur catta',
    redList: {
      category: 'Endangered',
      year: 2012,
      sources: [
        'https://www.nationalgeographic.com/animals/mammals/facts/ring-tailed-lemur',
        'https://news.mongabay.com/2013/12/madagascars-most-famous-lemur-facing-big-threats/',
      ],
    },
    shiny: true,
    palette: pal('#a19a94', '#f4f1ea', '#2b2a2f', '#f4f1ea', '#2b2a2f'),
    shinyPalette: pal('#8f7fa8', '#f4f1ea', '#4a3a5e', '#f4f1ea', '#2b2a2f'),
  },
  // ---- epic ---------------------------------------------------------------
  {
    id: 'african-penguin',
    name: 'African penguin',
    tier: 'epic',
    scientificName: 'Spheniscus demersus',
    redList: {
      category: 'Critically Endangered',
      year: 2024,
      sources: [
        'https://datazone.birdlife.org/species/factsheet/african-penguin-spheniscus-demersus/summary',
        'https://sanccob.co.za/news/african-penguin-newly-classified-as-critically-endangered-as-breeding-pairs-fall-below-10000/',
      ],
    },
    shiny: true,
    palette: pal('#33343f', '#f7f5ef', '#2b2a2f', '#e88a8a', '#2b2a2f'),
    shinyPalette: pal('#7a5a2e', '#fbf3e3', '#d9a85b', '#e88a8a', '#2b2a2f'),
  },
  {
    id: 'axolotl',
    name: 'Axolotl',
    tier: 'epic',
    scientificName: 'Ambystoma mexicanum',
    redList: {
      category: 'Critically Endangered',
      year: 2020,
      sources: ['https://amphibiaweb.org/species/3842'],
    },
    shiny: true,
    palette: pal('#f4b6c4', '#fbd9e0', '#e0607e', '#e0607e', '#d98a8a'),
    shinyPalette: pal('#f5d27a', '#fbebc0', '#e98a6a', '#e98a6a', '#d98a8a'),
  },
  // ---- legendary (fantasy) ------------------------------------------------
  {
    id: 'book-dragon',
    name: 'Book dragon',
    tier: 'legendary',
    shiny: true,
    palette: pal('#6f9a7c', '#f0e2c0', '#d9a85b', '#8a3a4a', '#2b2a2f'),
    shinyPalette: pal('#8f6fb8', '#f6ecd6', '#d9a85b', '#4a5aa8', '#2b2a2f'),
  },
  {
    id: 'library-owl',
    name: 'Library owl',
    tier: 'legendary',
    shiny: true,
    palette: pal('#8a6a52', '#efe2cc', '#5e4634', '#d9a85b', '#d9a85b'),
    shinyPalette: pal('#3f4a7a', '#dfe3f5', '#2b2f4f', '#f4d68c', '#d9a85b'),
  },
  {
    id: 'bookmark-fox',
    name: 'Bookmark fox',
    tier: 'legendary',
    shiny: true,
    palette: pal('#f3e9d8', '#fffaf0', '#b0413e', '#d9a85b', '#2b2a2f'),
    shinyPalette: pal('#f2d9a0', '#fbf0d6', '#9a5fb5', '#5f86d9', '#2b2a2f'),
  },
  {
    id: 'starlight-unicorn',
    name: 'Starlight unicorn',
    tier: 'legendary',
    shiny: true,
    palette: pal('#fbf6ee', '#fbf6ee', '#d9a85b', '#9d86d1', '#e8a9a4'),
    shinyPalette: pal('#4a5aa8', '#dfe3f5', '#f4d68c', '#f4d68c', '#e8a9a4'),
  },
]

const BY_ID = new Map<SpeciesId, Species>(SPECIES.map((s) => [s.id, s]))

export function speciesById(id: SpeciesId): Species {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`Unknown creature: ${id}`)
  return s
}

export function isSpeciesId(x: unknown): x is SpeciesId {
  return typeof x === 'string' && BY_ID.has(x as SpeciesId)
}

/** The card's label: the category in words, or that a domestic animal isn't on the list. */
export function redListLabel(s: Species): string {
  if (!s.redList) return 'Fantasy creature'
  if (s.redList.category === 'domestic') return 'Domestic, not on the Red List'
  return s.redList.category
}
