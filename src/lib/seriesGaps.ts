import type { Book } from './library'
import { detectSeries } from './series'
import { titleKey } from './recommend'
import { cleanReleaseDate } from './upcoming'

/**
 * Completing a series: which books of each series on the shelf are missing.
 * Gaps in the numbers are found on the shelf itself (she has 1, 2 and 4, so
 * 3 is missing); the books after the last one she has, and books not out
 * yet, come from asking which books the series has (server/seriesBooks.ts).
 */

export interface SeriesOnShelf {
  key: string
  name: string
  /** the author of most of its books */
  author: string
  books: Book[]
  /** the whole-number places in the series she has */
  numbers: number[]
  /** whole numbers below the highest she has that are not on the shelf */
  missing: number[]
}

export interface SeriesBook {
  /** place in the series; may be a half for a novella (1.5) */
  number?: number
  title: string
  year?: number
  /** when it isn't out yet: the day it comes out */
  releaseDate?: string
}

const keyOf = (name: string) => name.toLowerCase().replace(/[\s…]+/g, ' ').trim()

/** The numbers missing below the highest one: 1, 2, 4 → 3. */
export function missingNumbers(numbers: number[]): number[] {
  const whole = new Set(numbers.filter((n) => Number.isInteger(n) && n > 0))
  const max = Math.max(0, ...whole)
  const out: number[] = []
  for (let n = 1; n < max; n++) if (!whole.has(n)) out.push(n)
  return out
}

/** Every series with a book on the shelf, those with gaps first. */
export function seriesOnShelf(books: Book[]): SeriesOnShelf[] {
  const info = detectSeries(books)
  const groups = new Map<string, SeriesOnShelf>()
  for (const b of books) {
    const s = info.get(b.id)
    if (!s) continue
    const key = keyOf(s.name)
    const g = groups.get(key) ?? { key, name: s.name, author: '', books: [], numbers: [], missing: [] }
    g.books.push(b)
    if (s.index !== undefined) g.numbers.push(s.index)
    groups.set(key, g)
  }
  for (const g of groups.values()) {
    g.numbers = [...new Set(g.numbers)].sort((a, b) => a - b)
    g.missing = missingNumbers(g.numbers)
    const authors = new Map<string, number>()
    for (const b of g.books) if (b.authors[0]) authors.set(b.authors[0], (authors.get(b.authors[0]) ?? 0) + 1)
    g.author = [...authors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    g.books.sort((a, b) => (info.get(a.id)?.index ?? 999) - (info.get(b.id)?.index ?? 999))
  }
  return [...groups.values()].sort(
    (a, b) => Number(b.missing.length > 0) - Number(a.missing.length > 0) || a.name.localeCompare(b.name),
  )
}

/** The books of a series as the AI listed them, made safe. */
export function cleanSeriesBooks(raw: unknown): SeriesBook[] {
  const out: SeriesBook[] = []
  for (const r of Array.isArray(raw) ? raw.slice(0, 60) : []) {
    const b = r as Partial<SeriesBook> | null
    const title = typeof b?.title === 'string' ? b.title.trim().slice(0, 200) : ''
    if (!title) continue
    const number = typeof b?.number === 'number' && b.number >= 0 && b.number < 1000 ? b.number : undefined
    const year = typeof b?.year === 'number' && b.year > 1000 && b.year < 3000 ? Math.round(b.year) : undefined
    const releaseDate = cleanReleaseDate(b?.releaseDate)
    out.push({ title, ...(number !== undefined && { number }), ...(year && { year }), ...(releaseDate && { releaseDate }) })
  }
  return out
}

/** The books of the series she doesn't have: not by number, and not by title. */
export function notOnShelf(list: SeriesBook[], series: SeriesOnShelf, allBooks: Book[] = series.books): SeriesBook[] {
  const have = new Set(series.numbers)
  const titles = new Set(allBooks.map((b) => titleKey(b.title)))
  return list.filter((b) => !(b.number !== undefined && have.has(b.number)) && !titles.has(titleKey(b.title)))
}
