import type { Season } from './seasons'

/**
 * Every number of the reading garden in one place (T-0060, D-0050 §3, §4, §7,
 * §8, D-0051 §6). Tunable here without a new decision; the rules around them
 * (that the book decides the kind, that she decides the spot, that nothing ever
 * dies) are D-0050's.
 */

// ---- the beds (D-0050 §7) ----------------------------------------------------------------

/** Spots in one bed: 4 across, 3 down. */
export const BED_COLUMNS = 4
export const BED_ROWS = 3
export const SPOTS_PER_BED = BED_COLUMNS * BED_ROWS

/** The year garden of finishes with no day at all; shown as "Earlier". */
export const EARLIER_YEAR = 0

// ---- growth (D-0050 §4) ------------------------------------------------------------------

/** Reading days after the finish day for a plant to reach full size. */
export const GROW_READING_DAYS = 20
/** Growth (0..1) at which a plant stops being a sprout and at which it is grown. */
export const YOUNG_FROM = 0.2
export const GROWN_FROM = 0.65
/** How big a sprout is drawn, as a share of full size, and the smallest a plant is ever drawn. */
export const SPROUT_SCALE = 0.3

// ---- re-reads (D-0050 §5) ----------------------------------------------------------------

/** Each re-read makes the plant this much bigger… */
export const REREAD_STEP = 0.12
/** …up to this many re-reads (a fifth read is as big as it gets). */
export const REREAD_CAP = 4

// ---- the book's length (D-0050 §3) --------------------------------------------------------

/** A book with no length at all counts as this many pages (as the creatures, D-0033 §2). */
export const DEFAULT_PAGES = 280
/** A page is about this many minutes (as the creatures). */
export const MINUTES_PER_PAGE = 1.5
/** Up to this many pages (or the same in minutes) a book is short; up to the next one, medium. */
export const SHORT_PAGES = 200
export const LONG_PAGES = 450

// ---- garden items (D-0050 §8) -------------------------------------------------------------

/**
 * A garden item. `season` is null for an item that stands all year; a seasonal
 * item is unlocked by reading like any other and is never lost, but only shows
 * in its own season.
 */
export interface GardenItemSpec {
  readonly id: string
  readonly name: string
  readonly books: number
  readonly season: Season | null
}

/** In order of what unlocks first: `next` reads this list from the front. */
export const GARDEN_ITEMS = [
  { id: 'path', name: 'Path', books: 5, season: null },
  { id: 'bench', name: 'Bench', books: 10, season: null },
  { id: 'birdbath', name: 'Birdbath', books: 15, season: null },
  { id: 'seedlings', name: 'Seed tray', books: 20, season: 'spring' },
  { id: 'pond', name: 'Pond', books: 25, season: null },
  { id: 'parasol', name: 'Parasol', books: 30, season: 'summer' },
  { id: 'lanterns', name: 'Lanterns', books: 35, season: null },
  { id: 'leaves', name: 'Leaf pile', books: 40, season: 'autumn' },
  { id: 'greenhouse', name: 'Greenhouse', books: 50, season: null },
  { id: 'snowman', name: 'Snowman', books: 60, season: 'winter' },
  { id: 'fountain', name: 'Fountain', books: 75, season: null },
  { id: 'arch', name: 'Rose arch', books: 100, season: null },
  { id: 'swing', name: 'Tree swing', books: 150, season: null },
  { id: 'dovecote', name: 'Dovecote', books: 200, season: null },
  { id: 'gate', name: 'Garden gate', books: 300, season: null },
] as const satisfies readonly GardenItemSpec[]

export type GardenItemId = (typeof GARDEN_ITEMS)[number]['id']

export const ITEM_IDS: readonly GardenItemId[] = GARDEN_ITEMS.map((i) => i.id)

export const itemSpec = (id: GardenItemId): GardenItemSpec => GARDEN_ITEMS.find((i) => i.id === id) ?? GARDEN_ITEMS[0]

/**
 * Places an item can stand in, along the bottom of a year garden: six in a
 * small garden, one more per bed after the first, up to fourteen. A big
 * reading year holds more furniture; a small one stays uncluttered (T-0066).
 */
export const ITEM_SLOTS = 6
export const MAX_ITEM_SLOTS = 14
export const itemSlotsFor = (beds: number) => Math.max(ITEM_SLOTS, Math.min(MAX_ITEM_SLOTS, ITEM_SLOTS - 1 + Math.max(1, beds)))

export const isItemId = (x: unknown): x is GardenItemId => typeof x === 'string' && (ITEM_IDS as readonly string[]).includes(x)

// ---- the cover signs (T-0066) ---------------------------------------------------------------

/** A plant finished within this many days gets a little sign with the book's cover. */
export const SIGN_DAYS = 30
/** Never more than this many signs in one garden, so a busy month stays fast. */
export const SIGN_MAX = 8

// ---- visitors (D-0050 §9, T-0063 §3) -------------------------------------------------------

/** One bee per this many plants in bloom, and never more than the cap. */
export const BEE_PER_BLOOM = 4
export const BEE_CAP = 3
/** One butterfly per this many plants in bloom. */
export const BUTTERFLY_PER_BLOOM = 8
export const BUTTERFLY_CAP = 3
/** Birds come from this many plants; a birdbath or a pond brings one more. */
export const BIRD_FROM_PLANTS = 15
export const BIRD_CAP = 2
/** At most this many visitors in all, and on a phone. */
export const VISITOR_CAP = 6
export const VISITOR_CAP_PHONE = 3

// ---- the views (D-0051 §6) ------------------------------------------------------------------

/** Plants past this many in one garden are drawn as the simplest shape of their family in 3D. */
export const DETAILED_PLANTS = 12
/** Press this long on a phone before a plant lifts, so the garden can still be scrolled (T-0063 §4). */
export const HOLD_MS = 250
