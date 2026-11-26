import type { Book } from '../library'
import { localDay } from '../library'
import { sleepReadIds } from '../sleepSeries'
import { allFinishes } from '../stats'
import type { ChoiceEvent } from '../creatures/choices'
import {
  BEE_CAP,
  BEE_PER_BLOOM,
  BIRD_CAP,
  BIRD_FROM_PLANTS,
  BUTTERFLY_CAP,
  BUTTERFLY_PER_BLOOM,
  EARLIER_YEAR,
  GARDEN_ITEMS,
  itemSpec,
  GROWN_FROM,
  GROW_READING_DAYS,
  REREAD_CAP,
  REREAD_STEP,
  SPROUT_SCALE,
  SPOTS_PER_BED,
  VISITOR_CAP,
  VISITOR_CAP_PHONE,
  YOUNG_FROM,
} from './numbers'
import type { GardenItemId } from './numbers'
import { blooming, kindOf } from './plants'
import type { PlantKind } from './plants'
import { seasonOf } from './seasons'
import type { Season } from './seasons'
import { arrange, savedItems } from './spots'
import type { Spot } from './spots'
import { weatherOf } from './weather'
import type { GardenWeather } from './weather'
import { nextScenery, readingSoFar, sceneryFor } from './scenery'
import type { NextScenery, SceneryId } from './scenery'
import { NO_GIFTS, doneToday, kindnessGifts } from './kindness'
import type { KindnessGifts, KindnessId } from './kindness'

/**
 * The reading garden, worked out from her shelf and her reading log (T-0060,
 * D-0050 §1): every finished book is a plant, the book decides its kind, her
 * reading grows it, a re-read makes it bigger, and only where things stand is
 * ever saved (D-0052). Nothing of the creatures is read or written here.
 */

export type Stage = 'sprout' | 'young' | 'grown'

export interface Plant {
  /** the book's id; also its key in the choice log */
  id: string
  book: Book
  kind: PlantKind
  /** the year garden it belongs to; 0 for finishes with no day */
  year: number
  /** the day it was first finished, when known */
  since?: string
  /** how often the book has been finished (a re-read grows this plant, D-0050 §5) */
  reads: number
  /** 0..1, from the reading days since it was finished */
  growth: number
  stage: Stage
  /** how big it is drawn, 1 being a full-grown plant read once */
  scale: number
  /** a sleep read: night-blooming (D-0050 §6) */
  night: boolean
  /** showing flowers in this season */
  blooming: boolean
  /** in flower today because she watered it (D-0083 §3); gone again tomorrow */
  watered?: boolean
  /** where it stands: its own place in the order she finished the books */
  bed: number
  spot: number
}

export interface Visitors {
  bees: number
  butterflies: number
  birds: number
}

export interface YearGarden {
  /** the reading year, or 0 for the garden of finishes with no day */
  year: number
  /** "2026" or "Earlier" */
  label: string
  beds: number
  plants: Plant[]
  /** the items standing in this garden: item → slot */
  items: Map<GardenItemId, number>
  /** how many plants show flowers right now */
  blooming: number
  visitors: Visitors
}

export interface NextUnlock {
  item: GardenItemId
  name: string
  books: number
  toGo: number
}

export interface Garden {
  today: string
  season: Season
  /** the day's weather, invented from the day and never fetched (D-0083 §1) */
  weather: GardenWeather
  /** the scenery that has arrived with her reading, in the order it arrived (D-0083 §2) */
  scenery: SceneryId[]
  /** the next piece of scenery on its way, or null when it has all arrived */
  nextScenery: NextScenery | null
  /** the small kindnesses already done today (D-0083 §3) */
  kindness: KindnessId[]
  /** what today's kindnesses gave the garden; all zeros on a day she did none */
  gifts: KindnessGifts
  /** the year gardens, newest year first, "Earlier" last */
  years: YearGarden[]
  /** every plant, all years */
  plants: number
  /** finished books all time, which is what unlocks the garden items */
  finished: number
  unlocked: GardenItemId[]
  /** the unlocked items that show right now: a seasonal one only in its own season (T-0066) */
  available: GardenItemId[]
  /** the next item to unlock, or null when she has them all */
  next: NextUnlock | null
}

export interface GardenOptions {
  /** the device's day; the season follows it */
  today?: string
  /** a phone sees fewer visitors (D-0051) */
  phone?: boolean
  /**
   * Look at the garden in another season than the real one (D-0071). It
   * changes what is in bloom and nothing else: it is never saved, and the
   * dashboard's block never passes it.
   */
  season?: Season
  /**
   * Look at the garden in another weather than the day's own (D-0083 §1). Like
   * the season and the night it is a **look**: never saved, and the dashboard's
   * block never passes it.
   */
  weather?: GardenWeather
}

/** Every day she read something, oldest first (a day with a share of more than nothing). */
export function readingDayList(books: readonly Book[]): string[] {
  const days = new Set<string>()
  for (const b of books) for (const [day, share] of Object.entries(b.readingLog ?? {})) if (share > 0) days.add(day)
  return [...days].sort()
}

/**
 * Growth 0..1 for a plant finished on `since`, from the reading days after it
 * (D-0050 §4). `logged` is whether the book itself has a reading log: a book
 * finished before the app kept one (and a finish with no day at all) starts
 * fully grown, so old years are not a field of sprouts.
 */
export function growthOf(since: string | undefined, readingDays: readonly string[], logged = true): number {
  if (!since || !logged || readingDays.length === 0) return 1
  let read = 0
  for (const day of readingDays) if (day > since) read++
  return Math.min(1, read / GROW_READING_DAYS)
}

export const stageOf = (growth: number): Stage => (growth < YOUNG_FROM ? 'sprout' : growth < GROWN_FROM ? 'young' : 'grown')

/** How big a plant is drawn: from a sprout up to full size, plus a step per re-read. */
export function scaleOf(growth: number, reads: number): number {
  const grown = SPROUT_SCALE + (1 - SPROUT_SCALE) * growth
  const extra = 1 + REREAD_STEP * Math.min(REREAD_CAP, Math.max(0, reads - 1))
  return grown * extra
}

const yearLabel = (year: number) => (year === EARLIER_YEAR ? 'Earlier' : String(year))

/**
 * Visitors for a garden (T-0063 §3): they come by themselves, they are never a
 * score. `extra` is what today's kindnesses brought (D-0083 §3): a bird that
 * came for the seed is a guest on top of the cap, so the kindness is always
 * visible — a gift that might be swallowed by a cap would be no gift at all.
 */
export function visitorsFor(
  plants: number,
  inBloom: number,
  items: ReadonlyMap<GardenItemId, number>,
  phone = false,
  extra: Readonly<{ birds?: number; butterflies?: number }> = {},
): Visitors {
  const water = items.has('birdbath') || items.has('pond')
  let bees = Math.min(BEE_CAP, Math.floor(inBloom / BEE_PER_BLOOM))
  let butterflies = Math.min(BUTTERFLY_CAP, Math.floor(inBloom / BUTTERFLY_PER_BLOOM))
  let birds = plants > 0 ? Math.min(BIRD_CAP, (plants >= BIRD_FROM_PLANTS ? 1 : 0) + (water ? 1 : 0)) : 0
  const cap = phone ? VISITOR_CAP_PHONE : VISITOR_CAP
  // over the cap the quietest leave first: butterflies, then bees, then the birds
  let over = bees + butterflies + birds - cap
  while (over > 0) {
    if (butterflies > 0) butterflies--
    else if (bees > 0) bees--
    else if (birds > 0) birds--
    else break
    over--
  }
  return { bees, butterflies: butterflies + (extra.butterflies ?? 0), birds: birds + (extra.birds ?? 0) }
}

/** The whole garden. `log` is her choice log (D-0052); without it the garden is the tidy default. */
export function deriveGarden(books: readonly Book[], log: readonly ChoiceEvent[] = [], opts: GardenOptions = {}): Garden {
  const today = opts.today ?? localDay()
  const season = opts.season ?? seasonOf(today) ?? 'winter'
  const sleep = sleepReadIds(books as Book[])
  const readingDays = readingDayList(books)
  const items = savedItems(log)

  // one plant per finished book: its first finish decides the year, every finish counts as a read
  const first = new Map<string, { book: Book; since?: string; reads: number }>()
  for (const f of allFinishes(books as Book[])) {
    const had = first.get(f.book.id)
    if (!had) first.set(f.book.id, { book: f.book, since: f.day, reads: 1 })
    else {
      had.reads++
      if (f.day && (!had.since || f.day < had.since)) had.since = f.day
    }
  }

  const byYear = new Map<number, Array<{ book: Book; since?: string; reads: number }>>()
  for (const p of first.values()) {
    const year = p.since ? Number(p.since.slice(0, 4)) : EARLIER_YEAR
    const list = byYear.get(year) ?? []
    list.push(p)
    byYear.set(year, list)
  }

  const years: YearGarden[] = []
  for (const [year, list] of byYear) {
    // the order the plants were finished in: that order is what gives each one its own spot
    list.sort((a, b) => (a.since ?? '').localeCompare(b.since ?? '') || a.book.addedAt - b.book.addedAt || a.book.id.localeCompare(b.book.id))
    // in the order she finished the books, and only that (D-0071 §1)
    const { spots, beds } = arrange(list.map((p) => ({ id: p.book.id })))
    const mine = items.get(year) ?? new Map<GardenItemId, number>()
    const plants = list.map((p): Plant => {
      const kind = kindOf(p.book)
      const night = sleep.has(p.book.id)
      const growth = growthOf(p.since, readingDays, Object.keys(p.book.readingLog ?? {}).length > 0)
      const at: Spot = spots.get(p.book.id) ?? { bed: 0, spot: 0 }
      return {
        id: p.book.id,
        book: p.book,
        kind,
        year,
        since: p.since,
        reads: p.reads,
        growth,
        stage: stageOf(growth),
        scale: scaleOf(growth, p.reads),
        night,
        blooming: blooming(kind, season, { night, reads: p.reads }),
        bed: at.bed,
        spot: at.spot,
      }
    })
    const inBloom = plants.filter((p) => p.blooming).length
    years.push({
      year,
      label: yearLabel(year),
      beds,
      plants,
      items: mine,
      blooming: inBloom,
      visitors: visitorsFor(plants.length, inBloom, mine, opts.phone),
    })
  }
  // newest year first, "Earlier" last
  years.sort((a, b) => (a.year === EARLIER_YEAR ? 1 : b.year === EARLIER_YEAR ? -1 : b.year - a.year))

  /**
   * Today's kindnesses (D-0083 §3), in the garden she is reading in now: the
   * year of today, or her newest garden when she hasn't finished anything this
   * year. One garden, because watering one plant is watering one plant, not
   * every plant of every year she has ever read.
   */
  const gifts = kindnessGifts(log, today)
  const kindness = [...doneToday(log, today)]
  const thisYear = Number(today.slice(0, 4))
  const tended = years.find((y) => y.year === thisYear) ?? years[0]
  if (tended && (gifts.bloom > 0 || gifts.birds > 0 || gifts.butterflies > 0)) {
    // the watering: the first plant of the garden that isn't already in flower comes into flower
    let water = gifts.bloom
    if (water > 0)
      tended.plants = tended.plants.map((p) => (!p.blooming && water-- > 0 ? { ...p, blooming: true, watered: true } : p))
    tended.blooming = tended.plants.filter((p) => p.blooming).length
    tended.visitors = visitorsFor(tended.plants.length, tended.blooming, tended.items, opts.phone, {
      birds: gifts.birds,
      butterflies: gifts.butterflies,
    })
  }

  const finished = first.size
  const unlocked: GardenItemId[] = GARDEN_ITEMS.filter((i) => finished >= i.books).map((i) => i.id)
  // a seasonal item is unlocked for good, but only stands in the garden in its own season
  const available = unlocked.filter((id) => {
    const season_ = itemSpec(id).season
    return season_ === null || season_ === season
  })
  const nextItem = GARDEN_ITEMS.find((i) => finished < i.books)
  // what her reading has brought to the garden all by itself (D-0083 §2)
  const so = readingSoFar(finished, readingDays.length)
  return {
    today,
    season,
    weather: opts.weather ?? weatherOf(today),
    scenery: sceneryFor(so),
    nextScenery: nextScenery(so),
    kindness,
    gifts: kindness.length ? gifts : NO_GIFTS,
    years,
    plants: first.size,
    finished,
    unlocked,
    available,
    next: nextItem ? { item: nextItem.id, name: nextItem.name, books: nextItem.books, toGo: nextItem.books - finished } : null,
  }
}

/** The year garden to show first: this year when she has one, else the newest. */
export function startYear(garden: Garden, today = garden.today): number | null {
  if (!garden.years.length) return null
  const year = Number(today.slice(0, 4))
  return garden.years.some((y) => y.year === year) ? year : garden.years[0].year
}

export const yearOf = (garden: Garden, year: number | null): YearGarden | null => garden.years.find((y) => y.year === year) ?? null

/** The spots of a bed that have no plant, as spot numbers. */
export function freeSpots(year: YearGarden, bed: number): number[] {
  const taken = new Set(year.plants.filter((p) => p.bed === bed).map((p) => p.spot))
  return [...Array(SPOTS_PER_BED).keys()].filter((s) => !taken.has(s))
}
