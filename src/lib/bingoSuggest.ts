import type { Book } from './library'
import { localDay, timesRead } from './library'
import {
  GENRE_SQUARES,
  authorKey,
  hasFormat,
  hasGenre,
  inLongSeries,
  longListen,
  notFantasy,
  pagesOf,
  pubYear,
  shelfFacts,
  yearFinishes,
} from './bingo'
import type { Shelf } from './bingo'
import { hasAudio } from './listening'
import { cleanRating, cleanSpice } from './ratings'
import { readNextChoices } from './readNext'
import { sleepReadIds } from './sleepSeries'
import { lengthOf, weightedIndex, wishWeight } from './wish'

/**
 * A book from her pile for an empty bingo square (T-0017). Every square but
 * "A re-read" draws from `readNextChoices` (D-0025: want to read, never
 * finished, out already, series strictly in order, no sleep reads), weighted
 * like Make a wish. A clear-fit square suggests a book that passes its own
 * tick test, so finishing it ticks the square; a best-guess square suggests
 * the most likely books. "3 books in one month" and "5 books in one month"
 * have nothing to suggest.
 */

export interface Candidate {
  book: Book
  weight: number
}

/** Squares no single book can help with: tapping them does nothing. */
export const NO_SUGGESTION = new Set(['three', 'fivemonth'])

/** Whether a square of the card being played can be tapped for a suggestion. */
export const suggestible = (id: string) => !NO_SUGGESTION.has(id)

interface Facts extends Shelf {
  books: Book[]
  /** authors she finished a book by this year, on any card */
  yearAuthors: Set<string>
  /** authors with a book she rated 5 stars, by book id (to leave the book itself out) */
  fiveStar: Map<string, Set<string>>
  /** authors and series with a book rated 4+ spice, by book id */
  spicyAuthors: Map<string, Set<string>>
  spicySeries: Map<string, Set<string>>
}

const addTo = (m: Map<string, Set<string>>, key: string, id: string) => m.set(key, (m.get(key) ?? new Set<string>()).add(id))
/** Another book than `b` is listed under one of the keys. */
const otherIn = (m: Map<string, Set<string>>, keys: string[], b: Book) =>
  keys.some((k) => [...(m.get(k) ?? [])].some((id) => id !== b.id))

function facts(books: Book[], year: number): Facts {
  const shelf = shelfFacts(books, year)
  const yearAuthors = new Set(yearFinishes(books, year).flatMap((f) => f.book.authors.map(authorKey)))
  const fiveStar = new Map<string, Set<string>>()
  const spicyAuthors = new Map<string, Set<string>>()
  const spicySeries = new Map<string, Set<string>>()
  for (const b of books) {
    if (cleanRating(b.rating) === 5) for (const a of b.authors) addTo(fiveStar, authorKey(a), b.id)
    if ((cleanSpice(b.spice) ?? 0) >= 4) {
      for (const a of b.authors) addTo(spicyAuthors, authorKey(a), b.id)
      const key = shelf.groups.get(b.id)?.key
      if (key) addTo(spicySeries, key, b.id)
    }
  }
  return { ...shelf, books, yearAuthors, fiveStar, spicyAuthors, spicySeries }
}

const seriesBooks = (f: Facts, key: string) => f.books.filter((x) => f.groups.get(x.id)?.key === key)
const shortPages = (b: Book) => pagesOf(b) > 0 && pagesOf(b) < 200

/** Each square's test for a book she could read next. */
const FITS: Record<string, (b: Book, f: Facts) => boolean> = {
  // clear fit: the square's own tick test
  long: (b) => pagesOf(b) > 500,
  huge: (b) => pagesOf(b) > 700,
  short: shortPages,
  dutch: (b) => b.language === 'nl',
  audio: (b) => hasAudio(b),
  longlisten: longListen,
  library: (b) => hasFormat(b, 'library'),
  borrowed: (b) => hasFormat(b, 'borrowed'),
  hardcover: (b) => hasFormat(b, 'hardcover'),
  classic: (b) => (pubYear(b) ?? 9999) < 1950,
  brandnew: (b, f) => pubYear(b) === f.year,
  romance: (b) => hasGenre(b, GENRE_SQUARES.romance),
  mystery: (b) => hasGenre(b, GENRE_SQUARES.mystery),
  scifi: (b) => hasGenre(b, GENRE_SQUARES.scifi),
  nonfiction: (b) => hasGenre(b, GENRE_SQUARES.nonfiction),
  genre: notFantasy,
  // per author, as the tick checks it: a co-written book with one new author fits
  author: (b, f) => b.authors.some((a) => !f.firstByAuthor.has(authorKey(a))),
  firstinseries: (b, f) => {
    const g = f.groups.get(b.id)
    return (
      !!g?.key &&
      g.index === 1 &&
      !seriesBooks(f, g.key).some((x) => timesRead(x) > 0 || x.status === 'reading' || x.status === 'paused')
    )
  },
  series: (b, f) => {
    const key = f.groups.get(b.id)?.key
    if (!key) return false
    const all = seriesBooks(f, key)
    return all.length >= 2 && all.every((x) => x.id === b.id || timesRead(x) > 0)
  },
  longseries: (b, f) => inLongSeries(b, f),
  sameauthor: (b, f) => b.authors.some((a) => f.yearAuthors.has(authorKey(a))),
  // best guess: the most likely books
  week: (b) => lengthOf(b) === 'short',
  fast: shortPages,
  five: (b, f) => otherIn(f.fiveStar, b.authors.map(authorKey), b),
  spicy: (b, f) => {
    if ((cleanSpice(b.spice) ?? 0) >= 4) return true
    const key = f.groups.get(b.id)?.key
    return otherIn(f.spicyAuthors, b.authors.map(authorKey), b) || (!!key && otherIn(f.spicySeries, [key], b))
  },
}

/**
 * The books that fit a square, with how likely each is drawn; `null` for a
 * square no book can help with (no reaction), `[]` when nothing fits.
 */
export function suggestionPool(id: string, books: Book[], year: number, today = localDay()): Candidate[] | null {
  if (NO_SUGGESTION.has(id)) return null
  if (id === 'reread') {
    // the only place a finished book is suggested (D-0025): finished, not being re-read
    // or paused now, never a sleep read; her 4–5 star books first; not weighted
    const sleep = sleepReadIds(books)
    const done = books.filter((b) => b.status === 'read' && !sleep.has(b.id))
    const loved = done.filter((b) => (cleanRating(b.rating) ?? 0) >= 4)
    return (loved.length ? loved : done).map((book) => ({ book, weight: 1 }))
  }
  const fits = FITS[id]
  if (!fits) return []
  const f = facts(books, year)
  return readNextChoices(books, today)
    .filter((b) => fits(b, f))
    .map((book) => ({ book, weight: wishWeight(book, books, today).weight }))
}

/**
 * One book from the pool, weighted, that wasn't shown yet for this square.
 * When every book was shown it starts over (leaving out the one on screen when
 * there are others). Returns the book and the new list of shown ids.
 */
export function drawSuggestion(
  pool: Candidate[],
  shown: string[] = [],
  random: () => number = Math.random,
): { book: Book; shown: string[] } | undefined {
  if (!pool.length) return undefined
  let fresh = pool.filter((c) => !shown.includes(c.book.id))
  let seen = shown
  if (!fresh.length) {
    const current = shown.at(-1)
    fresh = pool.length > 1 ? pool.filter((c) => c.book.id !== current) : pool
    seen = []
  }
  const book = fresh[weightedIndex(fresh, random)].book
  return { book, shown: [...seen, book.id] }
}
