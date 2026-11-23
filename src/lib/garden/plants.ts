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
  { genres: ['Fantasy', 'Mythology'], long: 'oak', medium: 'sapling', short: 'sapling' },
  { genres: ['Romance'], long: 'climbing-rose', medium: 'rose', short: 'wild-rose' },
  { genres: ['Thriller', 'Crime', 'Horror', 'Mystery'], long: 'bramble', medium: 'thornbush', short: 'thornbush' },
  { genres: ['Science fiction', 'Dystopian'], long: 'pine', medium: 'pine', short: 'pine' },
  { genres: ['Historical fiction', 'Classics'], long: 'holly', medium: 'holly', short: 'holly' },
  { genres: ['Non-fiction', 'Biography', 'Self-help'], long: 'fern', medium: 'fern', short: 'moss' },
  { genres: ['Humour', 'Adventure', 'Young adult', "Children's"], long: 'sunflower', medium: 'sunflower', short: 'daisy' },
  { genres: ['Poetry'], long: 'snowdrop', medium: 'snowdrop', short: 'snowdrop' },
  { genres: ['Graphic novel'], long: 'lavender', medium: 'lavender', short: 'lavender' },
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
