import type { Book } from './library'
import { timesRead } from './library'
import { seriesGroups } from './series'

/**
 * Go-to-sleep reads, and keeping series together.
 *
 * A book is a sleep read when it's ticked on its own (`sleepRead`) or when its
 * whole series is marked. The series mark is kept on each book of the series
 * together with the series it was set for (`sleepSeries`, the series key), so
 * a book that later moves to another series doesn't take the mark along: it
 * only counts while the book is still in that series. A book that joins a
 * marked series later is a sleep read straight away.
 *
 * Only re-reads skip the rating question: the first read of a book is a real
 * read, sleep read or not.
 *
 * New books by an author who has a series on the shelf, that aren't in a
 * series themselves, are asked about once: "Is this part of …?". A series
 * answer joins the book to it; "Not in a series" is remembered
 * (`seriesAsked`). Only books added from the day this shipped are asked.
 */

/** Books added from this moment on are asked about (14 November 2026, Amsterdam). */
export const SERIES_QUESTION_FROM = Date.UTC(2026, 10, 13, 23, 0)

type Groups = ReturnType<typeof seriesGroups>

/** The series keys marked as a sleep read, by a book that is still in that series. */
export function sleepSeriesKeys(books: Book[], groups: Groups = seriesGroups(books)): Set<string> {
  const out = new Set<string>()
  for (const b of books) {
    const key = groups.get(b.id)?.key
    if (key && b.sleepSeries === key) out.add(key)
  }
  return out
}

/** Whether a book is a sleep read: ticked itself, or its whole series is. */
export function isSleepRead(book: Book, books: Book[], groups: Groups = seriesGroups(books)): boolean {
  if (book.sleepRead) return true
  const key = groups.get(book.id)?.key
  return !!key && sleepSeriesKeys(books, groups).has(key)
}

/** The ids of every sleep read on the shelf, ticked itself or through its series. */
export function sleepReadIds(books: Book[]): Set<string> {
  const groups = seriesGroups(books)
  const keys = sleepSeriesKeys(books, groups)
  return new Set(books.filter((b) => b.sleepRead || keys.has(groups.get(b.id)?.key ?? '')).map((b) => b.id))
}

/** Whether marking this book as read should skip the rating question: a sleep read she has read before. */
export function skipsRatingQuestion(book: Book, books: Book[]): boolean {
  return timesRead(book) > 0 && isSleepRead(book, books)
}

/** The changes that mark (or unmark) a whole series as a sleep read: book id → patch. */
export function markSleepSeries(books: Book[], key: string, on: boolean, groups: Groups = seriesGroups(books)) {
  const out = new Map<string, Partial<Book>>()
  for (const b of books) {
    if (groups.get(b.id)?.key !== key) continue
    if (on && b.sleepSeries !== key) out.set(b.id, { sleepSeries: key })
    if (!on && b.sleepSeries !== undefined) out.set(b.id, { sleepSeries: undefined })
  }
  return out
}

// ---- "Is this part of …?" ---------------------------------------------------------------

/** An author name made comparable: no capitals, dots, spaces or hyphens ("J.R.R." = "J. R. R."). */
export const authorKey = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s.\-‐–]+/g, '')

export interface SeriesChoice {
  key: string
  name: string
  /** marked as a sleep read */
  sleep: boolean
}

export interface SeriesQuestion {
  book: Book
  /** the series of this book's author(s), on the shelf */
  choices: SeriesChoice[]
}

/** The new books to ask about, each with the series its author has on the shelf. */
export function seriesQuestions(books: Book[], from = SERIES_QUESTION_FROM): SeriesQuestion[] {
  const groups = seriesGroups(books)
  const sleep = sleepSeriesKeys(books, groups)
  const byAuthor = new Map<string, Map<string, SeriesChoice>>()
  for (const b of books) {
    const g = groups.get(b.id)
    if (!g?.key) continue
    for (const a of b.authors) {
      const k = authorKey(a)
      if (!k) continue
      const list = byAuthor.get(k) ?? new Map<string, SeriesChoice>()
      list.set(g.key, { key: g.key, name: g.name, sleep: sleep.has(g.key) })
      byAuthor.set(k, list)
    }
  }
  const out: SeriesQuestion[] = []
  for (const b of books) {
    if (b.seriesAsked || b.addedAt < from || groups.get(b.id)?.key) continue
    const choices = new Map<string, SeriesChoice>()
    for (const a of b.authors) for (const c of byAuthor.get(authorKey(a))?.values() ?? []) choices.set(c.key, c)
    if (choices.size) out.push({ book: b, choices: [...choices.values()].sort((x, y) => x.name.localeCompare(y.name)) })
  }
  return out
}

/** The answer "part of this series": the book takes the series' name, and is never asked again. */
export const joinSeries = (choice: SeriesChoice): Partial<Book> => ({
  series: choice.name,
  seriesAsked: true,
  ...(choice.sleep && { sleepSeries: choice.key }),
})

/** The answer "not in a series", remembered so it isn't asked again. */
export const notInSeries: Partial<Book> = { seriesAsked: true }
