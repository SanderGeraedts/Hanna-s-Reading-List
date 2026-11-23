import type { Book } from '../library'
import { SIGN_DAYS, SIGN_MAX, SPOTS_PER_BED } from './numbers'
import type { YearGarden } from './garden'

/**
 * The little signs with a book's cover (T-0066, from Hanna): a plant she
 * finished in the last month gets a sign beside it with the cover on it, and
 * the book she is reading **now** gets one too — standing on the empty spot its
 * plant will take when she finishes it, because a book that isn't finished has
 * no plant (D-0050 §2) and nothing here may invent one.
 *
 * Only the recent ones, and never more than a handful: a cover is a picture,
 * and a hundred pictures at once is what makes a phone crawl. Nothing here is
 * saved: a sign is worked out, like everything else in the garden (D-0050 §1).
 */

export interface Sign {
  /** the book's id; for a finished book it is also its plant's */
  id: string
  title: string
  /** the cover to show; a book without one gets a blank sign */
  cover?: string
  bed: number
  spot: number
  /** she is reading it now: it has no plant yet, only the spot waiting for it */
  reading: boolean
}

/** At most this many books-in-progress get a sign at once. */
export const FIT_READING = 3

/** How many days back a `yyyy-mm-dd` day is from `today`, or null when it isn't a day. */
export function daysBack(today: string, day: string | undefined): number | null {
  if (!day) return null
  const a = Date.parse(`${today}T00:00:00Z`)
  const b = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((a - b) / 86400000)
}

/**
 * The signs of a year garden: the plants finished within `days` of today, the
 * most recently finished first, capped at `max`. A plant with no finish day at
 * all (the "Earlier" garden) never gets a sign.
 */
export function signsFor(year: YearGarden, today: string, days = SIGN_DAYS, max = SIGN_MAX): Sign[] {
  const recent: Array<{ sign: Sign; back: number }> = []
  for (const plant of year.plants) {
    const back = daysBack(today, plant.since)
    if (back === null || back < 0 || back > days) continue
    recent.push({
      sign: { id: plant.id, title: plant.book.title, cover: plant.book.coverUrl, bed: plant.bed, spot: plant.spot, reading: false },
      back,
    })
  }
  recent.sort((a, b) => a.back - b.back || a.sign.title.localeCompare(b.sign.title))
  return recent.slice(0, Math.max(0, max)).map(({ sign }) => sign)
}

/** The spots of a year garden with no plant on them, bed by bed, first first. */
export function emptySpots(year: YearGarden): Array<{ bed: number; spot: number }> {
  const taken = new Set(year.plants.map((p) => `${p.bed}:${p.spot}`))
  const out: Array<{ bed: number; spot: number }> = []
  for (let bed = 0; bed < year.beds; bed++)
    for (let spot = 0; spot < SPOTS_PER_BED; spot++) if (!taken.has(`${bed}:${spot}`)) out.push({ bed, spot })
  return out
}

/**
 * Signs for the books she is reading now, standing on the empty spots their
 * plants will take. They go only in the garden of the running year — an older
 * year is finished reading — and only as far as the empty spots reach.
 */
export function readingSigns(books: readonly Book[], year: YearGarden, today: string, max = FIT_READING): Sign[] {
  if (year.year !== Number(today.slice(0, 4))) return []
  const reading = books
    .filter((b) => b.status === 'reading')
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, Math.max(0, max))
  const free = emptySpots(year)
  return reading.slice(0, free.length).map((book, i) => ({
    id: book.id,
    title: book.title,
    cover: book.coverUrl,
    bed: free[i].bed,
    spot: free[i].spot,
    reading: true,
  }))
}

