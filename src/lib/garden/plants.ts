import type { Book } from '../library'
import { listenOnly } from '../listening'
import { DEFAULT_PAGES, LONG_PAGES, MINUTES_PER_PAGE, SHORT_PAGES } from './numbers'
import type { Season } from './seasons'

/**
 * The plant catalogue (T-0060, D-0050 §3): what a finished book turns into.
 * The **book** decides the kind — its first matching genre and its length — and
 * Hanna decides where it goes. Sixteen kinds in four families, so both views
 * draw four shapes with the kind's colours and trimmings rather than sixteen
 * pictures (D-0051 §2, §3).
 *
 * Tunable here without a new decision; that the book decides is D-0050's.
 */

/** How a plant is drawn: the four shapes both views know. */
export type PlantFamily = 'tree' | 'shrub' | 'flower' | 'fern'

/** How long the book is, by pages (or the same in minutes for a book she only listens to). */
export type BookLength = 'short' | 'medium' | 'long'

export interface PlantKind {
  id: string
  /** what she sees: "Oak", "Climbing rose" */
  name: string
  family: PlantFamily
  /** how tall it is drawn at full growth, 0..1 of a spot's height */
  height: number
  /** green all winter (D-0050: nothing ever looks dead) */
  evergreen: boolean
  /** the seasons it shows flowers in (a night-blooming plant flowers in all of them anyway) */
  blooms: readonly Season[]
  /** thorn spikes (the dark and thorny ones) */
  thorns?: boolean
  /** red berries, in winter above all */
  berries?: boolean
  /** leaf colour in summer, and in autumn when it turns */
  leaf: string
  autumnLeaf: string
  /** flower colour, used for blossom too */
  flower: string
  /** trunk, stem or frond stalk */
  stem: string
}

const KIND_LIST: readonly PlantKind[] = [
  // trees
  {
    id: 'oak',
    name: 'Oak',
    family: 'tree',
    height: 1,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#4e7f4a',
    autumnLeaf: '#c6893f',
    flower: '#e8d9b0',
    stem: '#6b4a32',
  },
  {
    id: 'sapling',
    name: 'Sapling',
    family: 'tree',
    height: 0.62,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#5d9152',
    autumnLeaf: '#d2a24c',
    flower: '#f0e2bd',
    stem: '#7a5739',
  },
  {
    id: 'birch',
    name: 'Birch',
    family: 'tree',
    height: 0.92,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#6fa05a',
    autumnLeaf: '#e0b957',
    flower: '#efe6cb',
    stem: '#d8cdbb',
  },
  {
    id: 'pine',
    name: 'Pine',
    family: 'tree',
    height: 0.95,
    evergreen: true,
    blooms: [],
    leaf: '#2f5f45',
    autumnLeaf: '#2f5f45',
    flower: '#9fb8a4',
    stem: '#5b3f2c',
  },
  // shrubs
  {
    id: 'holly',
    name: 'Holly',
    family: 'shrub',
    height: 0.6,
    evergreen: true,
    blooms: ['spring', 'winter'],
    berries: true,
    leaf: '#2d6243',
    autumnLeaf: '#2d6243',
    flower: '#e8e3d2',
    stem: '#55402f',
  },
  {
    id: 'climbing-rose',
    name: 'Climbing rose',
    family: 'shrub',
    height: 0.86,
    evergreen: false,
    blooms: ['spring', 'summer', 'autumn'],
    thorns: true,
    leaf: '#4f7a45',
    autumnLeaf: '#b8864a',
    flower: '#e2748c',
    stem: '#5f6b3d',
  },
  {
    id: 'rose',
    name: 'Rose',
    family: 'shrub',
    height: 0.56,
    evergreen: false,
    blooms: ['spring', 'summer', 'autumn'],
    thorns: true,
    leaf: '#4f7a45',
    autumnLeaf: '#b8864a',
    flower: '#e07f94',
    stem: '#5f6b3d',
  },
  {
    id: 'bramble',
    name: 'Bramble',
    family: 'shrub',
    height: 0.72,
    evergreen: false,
    blooms: ['summer'],
    thorns: true,
    berries: true,
    leaf: '#3c5b3b',
    autumnLeaf: '#8c5f3c',
    flower: '#cfc4dd',
    stem: '#4a3b31',
  },
  {
    id: 'thornbush',
    name: 'Thornbush',
    family: 'shrub',
    height: 0.5,
    evergreen: false,
    blooms: [],
    thorns: true,
    leaf: '#3f5340',
    autumnLeaf: '#7d5a3a',
    flower: '#bdb3c9',
    stem: '#473a33',
  },
  // flowers
  {
    id: 'wild-rose',
    name: 'Wild rose',
    family: 'flower',
    height: 0.4,
    evergreen: false,
    blooms: ['spring', 'summer'],
    leaf: '#5a8a4d',
    autumnLeaf: '#b58a4c',
    flower: '#f0a7b8',
    stem: '#5f7a42',
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    family: 'flower',
    height: 0.78,
    evergreen: false,
    blooms: ['summer', 'autumn'],
    leaf: '#5c8a3f',
    autumnLeaf: '#b9893f',
    flower: '#e9c15a',
    stem: '#5c7a3a',
  },
  {
    id: 'daisy',
    name: 'Daisies',
    family: 'flower',
    height: 0.3,
    evergreen: false,
    blooms: ['spring', 'summer', 'autumn'],
    leaf: '#619150',
    autumnLeaf: '#a88c4c',
    flower: '#f4efe0',
    stem: '#5f8248',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    family: 'flower',
    height: 0.46,
    evergreen: false,
    blooms: ['spring', 'summer'],
    leaf: '#7f9a74',
    autumnLeaf: '#9a9268',
    flower: '#a98ed0',
    stem: '#75896b',
  },
  {
    id: 'snowdrop',
    name: 'Snowdrops',
    family: 'flower',
    height: 0.3,
    evergreen: false,
    // the winter flower that keeps the garden alive (D-0050 §6, T-0064)
    blooms: ['winter', 'spring'],
    leaf: '#6a9a6a',
    autumnLeaf: '#6a9a6a',
    flower: '#f2f5ef',
    stem: '#5f8a5f',
  },
  // ferns
  {
    id: 'fern',
    name: 'Fern',
    family: 'fern',
    height: 0.54,
    evergreen: false,
    blooms: [],
    leaf: '#4a7f52',
    autumnLeaf: '#9c8143',
    flower: '#cfd8bd',
    stem: '#46663f',
  },
  {
    id: 'moss',
    name: 'Moss cushion',
    family: 'fern',
    height: 0.24,
    evergreen: true,
    blooms: [],
    leaf: '#5a8a4a',
    autumnLeaf: '#5a8a4a',
    flower: '#d6e0c4',
    stem: '#4d7340',
  },
  // more trees (T-0066)
  {
    id: 'olive',
    name: 'Olive tree',
    family: 'tree',
    height: 0.8,
    evergreen: true,
    blooms: ['spring', 'summer'],
    leaf: '#7f9579',
    autumnLeaf: '#7f9579',
    flower: '#efeadb',
    stem: '#6f6153',
  },
  {
    id: 'yew',
    name: 'Yew',
    family: 'tree',
    height: 0.88,
    evergreen: true,
    blooms: [],
    berries: true,
    leaf: '#2b4a39',
    autumnLeaf: '#2b4a39',
    flower: '#b9c6b6',
    stem: '#4a3328',
  },
  {
    id: 'cypress',
    name: 'Cypress',
    family: 'tree',
    height: 0.98,
    evergreen: true,
    blooms: [],
    leaf: '#2c4f3f',
    autumnLeaf: '#2c4f3f',
    flower: '#9db0a3',
    stem: '#4f3a2c',
  },
  {
    id: 'willow',
    name: 'Willow',
    family: 'tree',
    height: 0.96,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#88a86a',
    autumnLeaf: '#d7bf63',
    flower: '#e9e5c6',
    stem: '#6a5440',
  },
  {
    id: 'beech',
    name: 'Beech',
    family: 'tree',
    height: 1,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#5a8248',
    autumnLeaf: '#b96f38',
    flower: '#e6dcbe',
    stem: '#7b6a58',
  },
  {
    id: 'cherry',
    name: 'Cherry tree',
    family: 'tree',
    height: 0.84,
    evergreen: false,
    blooms: ['spring'],
    berries: true,
    leaf: '#5d8c4f',
    autumnLeaf: '#c9713f',
    flower: '#f3c3d2',
    stem: '#6d4a3a',
  },
  {
    id: 'apple',
    name: 'Apple tree',
    family: 'tree',
    height: 0.8,
    evergreen: false,
    blooms: ['spring'],
    berries: true,
    leaf: '#578545',
    autumnLeaf: '#c08a3f',
    flower: '#f6e3e6',
    stem: '#6b4b35',
  },
  {
    id: 'maple',
    name: 'Maple',
    family: 'tree',
    height: 0.94,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#5f8f4c',
    autumnLeaf: '#cf5f36',
    flower: '#e3d7a8',
    stem: '#6b4a34',
  },
  {
    id: 'hawthorn',
    name: 'Hawthorn',
    family: 'tree',
    height: 0.82,
    evergreen: false,
    blooms: ['spring', 'summer'],
    thorns: true,
    berries: true,
    leaf: '#4b7444',
    autumnLeaf: '#a97741',
    flower: '#f0eade',
    stem: '#5b4231',
  },
  {
    id: 'rowan',
    name: 'Rowan',
    family: 'tree',
    height: 0.88,
    evergreen: false,
    blooms: ['spring', 'summer'],
    berries: true,
    leaf: '#4f7f4b',
    autumnLeaf: '#c06a35',
    flower: '#efe9d6',
    stem: '#63503f',
  },
  {
    id: 'cedar',
    name: 'Cedar',
    family: 'tree',
    height: 1,
    evergreen: true,
    blooms: [],
    leaf: '#39614a',
    autumnLeaf: '#39614a',
    flower: '#a9bdab',
    stem: '#5d4231',
  },
  {
    id: 'magnolia',
    name: 'Magnolia',
    family: 'tree',
    height: 0.82,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#58814f',
    autumnLeaf: '#b5924b',
    flower: '#f4e2ee',
    stem: '#6a5344',
  },
  {
    id: 'chestnut',
    name: 'Chestnut',
    family: 'tree',
    height: 0.96,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#4d7c43',
    autumnLeaf: '#bb7c36',
    flower: '#f1e8d3',
    stem: '#6b4c36',
  },
  {
    id: 'elm',
    name: 'Elm',
    family: 'tree',
    height: 0.98,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#55803f',
    autumnLeaf: '#c49a3f',
    flower: '#e7ddb9',
    stem: '#6d5640',
  },
  // more shrubs (T-0066)
  {
    id: 'laurel',
    name: 'Laurel',
    family: 'shrub',
    height: 0.64,
    evergreen: true,
    blooms: ['spring'],
    leaf: '#34664a',
    autumnLeaf: '#34664a',
    flower: '#e7e8d5',
    stem: '#55402f',
  },
  {
    id: 'blackthorn',
    name: 'Blackthorn',
    family: 'shrub',
    height: 0.66,
    evergreen: false,
    blooms: ['spring'],
    thorns: true,
    berries: true,
    leaf: '#3d5c3e',
    autumnLeaf: '#8a6340',
    flower: '#eef0ea',
    stem: '#403229',
  },
  {
    id: 'juniper',
    name: 'Juniper',
    family: 'shrub',
    height: 0.54,
    evergreen: true,
    blooms: [],
    berries: true,
    leaf: '#44705c',
    autumnLeaf: '#44705c',
    flower: '#b6c6c0',
    stem: '#4d3d32',
  },
  {
    id: 'hydrangea',
    name: 'Hydrangea',
    family: 'shrub',
    height: 0.58,
    evergreen: false,
    blooms: ['summer', 'autumn'],
    leaf: '#4e7d49',
    autumnLeaf: '#9a8347',
    flower: '#9db7dd',
    stem: '#5c6f44',
  },
  {
    id: 'peony',
    name: 'Peony',
    family: 'shrub',
    height: 0.5,
    evergreen: false,
    blooms: ['spring', 'summer'],
    leaf: '#4f7a4a',
    autumnLeaf: '#a07c46',
    flower: '#e9a9bd',
    stem: '#5a6f42',
  },
  {
    id: 'sage',
    name: 'Sage',
    family: 'shrub',
    height: 0.44,
    evergreen: true,
    blooms: ['summer'],
    leaf: '#8a9b85',
    autumnLeaf: '#8a9b85',
    flower: '#b3a4d2',
    stem: '#6d7a63',
  },
  // more flowers (T-0066)
  {
    id: 'bluebells',
    name: 'Bluebells',
    family: 'flower',
    height: 0.32,
    evergreen: false,
    blooms: ['spring'],
    leaf: '#5f9158',
    autumnLeaf: '#9a8c4e',
    flower: '#7f8fd4',
    stem: '#5c8450',
  },
  {
    id: 'foxglove',
    name: 'Foxglove',
    family: 'flower',
    height: 0.56,
    evergreen: false,
    blooms: ['summer'],
    leaf: '#55804c',
    autumnLeaf: '#96834a',
    flower: '#c689c4',
    stem: '#55774a',
  },
  {
    id: 'thistle',
    name: 'Thistle',
    family: 'flower',
    height: 0.42,
    evergreen: false,
    blooms: ['summer', 'autumn'],
    thorns: true,
    leaf: '#7e8f78',
    autumnLeaf: '#8e8458',
    flower: '#9a7fc0',
    stem: '#6f7f6a',
  },
  {
    id: 'poppy',
    name: 'Poppies',
    family: 'flower',
    height: 0.38,
    evergreen: false,
    blooms: ['spring', 'summer'],
    leaf: '#6b9456',
    autumnLeaf: '#a4874a',
    flower: '#d4553f',
    stem: '#63894c',
  },
  {
    id: 'marigolds',
    name: 'Marigolds',
    family: 'flower',
    height: 0.34,
    evergreen: false,
    blooms: ['summer', 'autumn'],
    leaf: '#5d8c48',
    autumnLeaf: '#a8873f',
    flower: '#e8963f',
    stem: '#5a8245',
  },
  {
    id: 'violets',
    name: 'Violets',
    family: 'flower',
    height: 0.26,
    evergreen: false,
    blooms: ['spring', 'autumn'],
    leaf: '#4f7f4a',
    autumnLeaf: '#8d8049',
    flower: '#8a6bb5',
    stem: '#4e7a48',
  },
  // more ferns (T-0066)
  {
    id: 'toadstools',
    name: 'Toadstools',
    family: 'fern',
    height: 0.22,
    evergreen: true,
    blooms: [],
    leaf: '#8a5a4e',
    autumnLeaf: '#8a5a4e',
    flower: '#e4d8cd',
    stem: '#cdbfae',
  },
  {
    id: 'hosta',
    name: 'Hosta',
    family: 'fern',
    height: 0.4,
    evergreen: false,
    blooms: ['summer'],
    leaf: '#6f9b6a',
    autumnLeaf: '#9d9253',
    flower: '#d9cfe6',
    stem: '#55794f',
  },
]

export const PLANT_KINDS: Record<string, PlantKind> = Object.fromEntries(KIND_LIST.map((k) => [k.id, k]))
export const PLANT_KIND_IDS: readonly string[] = KIND_LIST.map((k) => k.id)

export const plantKind = (id: string): PlantKind => PLANT_KINDS[id] ?? PLANT_KINDS.daisy

/**
 * The genres that lead to a family of plants, in the order a book's genres are
 * read: the **first** genre of the book that matches decides. The three ids are
 * for a long, a medium and a short book.
 */
const GENRE_RULES: ReadonlyArray<{ genres: readonly string[]; long: string; medium: string; short: string }> = [
  { genres: ['Fantasy'], long: 'oak', medium: 'sapling', short: 'bluebells' },
  { genres: ['Mythology'], long: 'olive', medium: 'laurel', short: 'violets' },
  { genres: ['Romance'], long: 'climbing-rose', medium: 'rose', short: 'wild-rose' },
  { genres: ['Science fiction'], long: 'pine', medium: 'juniper', short: 'hosta' },
  { genres: ['Dystopian'], long: 'cypress', medium: 'juniper', short: 'thistle' },
  { genres: ['Mystery'], long: 'hawthorn', medium: 'blackthorn', short: 'foxglove' },
  { genres: ['Thriller'], long: 'bramble', medium: 'thornbush', short: 'thistle' },
  { genres: ['Crime'], long: 'yew', medium: 'blackthorn', short: 'toadstools' },
  { genres: ['Horror'], long: 'cypress', medium: 'thornbush', short: 'toadstools' },
  { genres: ['Historical fiction'], long: 'beech', medium: 'holly', short: 'violets' },
  { genres: ['Classics'], long: 'cedar', medium: 'laurel', short: 'snowdrop' },
  { genres: ['Adventure'], long: 'rowan', medium: 'juniper', short: 'marigolds' },
  { genres: ['Young adult'], long: 'cherry', medium: 'hydrangea', short: 'poppy' },
  { genres: ["Children's"], long: 'apple', medium: 'hydrangea', short: 'daisy' },
  { genres: ['Humour'], long: 'chestnut', medium: 'sage', short: 'sunflower' },
  { genres: ['Graphic novel'], long: 'maple', medium: 'lavender', short: 'poppy' },
  { genres: ['Poetry'], long: 'magnolia', medium: 'peony', short: 'snowdrop' },
  { genres: ['Biography'], long: 'willow', medium: 'sage', short: 'hosta' },
  { genres: ['Self-help'], long: 'elm', medium: 'hydrangea', short: 'marigolds' },
  { genres: ['Non-fiction'], long: 'elm', medium: 'fern', short: 'moss' },
]

/** A book with no genre the list knows follows its length alone. */
const NO_GENRE = { long: 'birch', medium: 'fern', short: 'daisy' } as const

const positive = (n: number | undefined) => (n && n > 0 ? n : undefined)

/**
 * The book's length in pages: its own pages, the listening time turned into
 * pages for a book she only listens to, and 280 pages when it has neither
 * (the same fallback as the creatures, D-0033 §2).
 */
export function lengthPages(book: Book): number {
  const pages = positive(book.pages)
  const minutes = positive(book.minutes)
  if (listenOnly(book)) {
    const m = minutes ?? pages
    return m ? m / MINUTES_PER_PAGE : DEFAULT_PAGES
  }
  if (pages) return pages
  if (minutes) return minutes / MINUTES_PER_PAGE
  return DEFAULT_PAGES
}

export function bookLength(book: Book): BookLength {
  const pages = lengthPages(book)
  if (pages <= SHORT_PAGES) return 'short'
  if (pages < LONG_PAGES) return 'medium'
  return 'long'
}

/** The kind of plant a book becomes: its first matching genre and its length. */
export function kindOf(book: Book): PlantKind {
  const size = bookLength(book)
  for (const genre of book.genres ?? []) {
    const rule = GENRE_RULES.find((r) => r.genres.includes(genre))
    if (rule) return plantKind(rule[size])
  }
  return plantKind(NO_GENRE[size])
}

/**
 * Whether a plant shows flowers in a season: its kind's own bloom seasons, a
 * night-blooming sleep read (always), and a re-read, which flowers again
 * (D-0050 §5) — in every season but winter, where only the evergreens, the
 * winter flowers and the night-bloomers keep going (T-0064).
 */
export function blooming(kind: PlantKind, season: Season, opts: { night?: boolean; reads?: number } = {}): boolean {
  if (opts.night) return true
  if (kind.blooms.includes(season)) return true
  return (opts.reads ?? 1) > 1 && season !== 'winter' && kind.family !== 'fern'
}
