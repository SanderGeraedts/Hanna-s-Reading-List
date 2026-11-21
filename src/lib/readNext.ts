import type { Book } from './library'
import { localDay, sortBooks, timesRead } from './library'
import { detectSeries } from './series'
import { notOutYet } from './upcoming'

/**
 * The books Hanna could read next (#58): ones she wants to read and has never
 * finished (no re-reads), that are out already, and that are either a
 * standalone or have every book before them in their series read: never
 * book 3 before book 2. Strict (her rule for Make a wish): a book that isn't
 * on the shelf counts as not read, by the series number, so a lone "Book 3"
 * isn't offered either. A series she is in the middle of (the next book is
 * being read or paused) has nothing to offer.
 */
export function readNextChoices(books: Book[], today = localDay()): Book[] {
  const series = detectSeries(books)
  const keyOf = (name: string) => name.toLowerCase().replace(/[\s…]+/g, ' ').trim()
  const bySeries = new Map<string, Book[]>()
  for (const b of books) {
    const info = series.get(b.id)
    if (info) bySeries.set(keyOf(info.name), [...(bySeries.get(keyOf(info.name)) ?? []), b])
  }
  const blocked = (b: Book) => {
    const info = series.get(b.id)
    if (!info) return false // a standalone
    const siblings = bySeries.get(keyOf(info.name))!.filter((s) => s.id !== b.id)
    const index = info.index
    if (index !== undefined) {
      const at = (s: Book) => series.get(s.id)?.index
      // every whole number before it must be read; one that isn't on the shelf counts as unread
      for (let k = 1; k < Math.ceil(index); k++) {
        if (!siblings.some((s) => at(s) === k && read(s))) return true
      }
      // and every book on the shelf numbered before it (a 1.5 novella too)
      return siblings.some((s) => at(s) !== undefined && at(s)! < index && !read(s))
    }
    // no number: the books of the series before it (by year) must be read
    for (const s of sortBooks([b, ...siblings], 'series')) {
      if (s.id === b.id) return false
      if (!read(s)) return true
    }
    return false
  }
  return books.filter((b) => b.status === 'want' && !read(b) && !notOutYet(b, today) && !blocked(b))
}

const read = (b: Book) => b.status === 'read' || timesRead(b) > 0

/** One of the choices at random, not the one just shown when there are others. */
export function pickReadNext(choices: Book[], lastId?: string | null, random = Math.random): Book | undefined {
  const pool = choices.length > 1 ? choices.filter((b) => b.id !== lastId) : choices
  return pool[Math.floor(random() * pool.length)]
}
