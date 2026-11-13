import type { Book } from './library'
import { localDay, sortBooks, timesRead } from './library'
import { seriesGroups } from './series'
import { notOutYet } from './upcoming'

/**
 * The books Hanna could read next (#58): ones she wants to read and has never
 * finished (no re-reads), and from a series only the first book she hasn't
 * read yet, so never book 3 before book 2. A series she is in the middle of
 * (the next book is being read or paused) has nothing to offer. A book that
 * isn't out yet can't be read, so it isn't offered either.
 */
export function readNextChoices(books: Book[], today = localDay()): Book[] {
  const groups = seriesGroups(books)
  const nextInSeries = new Set<string>()
  const seen = new Set<string>()
  // in series order: by number, else by year
  for (const b of sortBooks(books, 'series')) {
    const key = groups.get(b.id)!.key
    if (key === '' || seen.has(key) || !unread(b)) continue
    seen.add(key)
    nextInSeries.add(b.id)
  }
  return books.filter(
    (b) =>
      b.status === 'want' &&
      unread(b) &&
      !notOutYet(b, today) &&
      (groups.get(b.id)!.key === '' || nextInSeries.has(b.id)),
  )
}

const unread = (b: Book) => b.status !== 'read' && timesRead(b) === 0

/** One of the choices at random, not the one just shown when there are others. */
export function pickReadNext(choices: Book[], lastId?: string | null, random = Math.random): Book | undefined {
  const pool = choices.length > 1 ? choices.filter((b) => b.id !== lastId) : choices
  return pool[Math.floor(random() * pool.length)]
}
