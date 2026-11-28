import type { Book } from './library'
import { timesRead } from './library'
import { seriesGroups } from './series'

/**
 * The Series page (T-0132, D-0100): every series on her shelf with two books or more, its books
 * in order, which she has read, and the gaps in its numbering. Sorted A–Z, or as she chooses.
 * Worked out from the shelf; nothing is saved but this device's choice of sort.
 */

export interface SeriesSlot {
  /** a book on her shelf, or a number the series skips (not on her shelf) */
  book?: Book
  index?: number
}

export interface SeriesRow {
  key: string
  name: string
  slots: SeriesSlot[]
  read: number
  total: number
  /** the first author of its first book */
  author: string
  /** the last day she finished a book of it, or '' */
  lastRead: string
}

/** A book counts as read once she finished it at least once. */
export const isRead = (b: Book) => timesRead(b) > 0

export function allSeries(books: readonly Book[]): SeriesRow[] {
  const shelf = books.filter((b) => !b.wish)
  const groups = seriesGroups(shelf)
  const byKey = new Map<string, { name: string; books: Array<{ book: Book; index?: number }> }>()
  for (const b of shelf) {
    const g = groups.get(b.id)
    if (!g?.key) continue
    const s = byKey.get(g.key) ?? { name: g.name, books: [] }
    s.books.push({ book: b, index: g.index })
    byKey.set(g.key, s)
  }
  const rows: SeriesRow[] = []
  for (const [key, s] of byKey) {
    if (s.books.length < 2) continue
    s.books.sort((a, b) => (a.index ?? 999) - (b.index ?? 999) || a.book.title.localeCompare(b.book.title))
    // the numbers the series skips between its first and last numbered book
    const numbered = s.books.map((x) => x.index).filter((i): i is number => Number.isInteger(i))
    const slots: SeriesSlot[] = []
    const have = new Set(numbered)
    const first = numbered.length ? Math.min(...numbered) : undefined
    for (const x of s.books) {
      // before a numbered book, the numbers missing since the previous one (up to ten, no more)
      if (x.index !== undefined && Number.isInteger(x.index) && first !== undefined) {
        const prev = slots.filter((sl) => sl.index !== undefined).at(-1)?.index ?? first - 1
        for (let n = prev + 1; n < x.index && n - prev <= 10; n++) if (!have.has(n)) slots.push({ index: n })
      }
      slots.push({ book: x.book, index: x.index })
    }
    const read = s.books.filter((x) => isRead(x.book)).length
    const lastRead = s.books
      .flatMap((x) => x.book.finished ?? [])
      .sort()
      .at(-1) ?? ''
    rows.push({ key, name: s.name, slots, read, total: s.books.length, author: s.books[0].book.authors[0] ?? '', lastRead })
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export type SeriesSort = 'az' | 'progress' | 'author' | 'recent'

export const SORT_LABELS: Record<SeriesSort, string> = {
  az: 'A–Z',
  progress: 'In progress first',
  author: 'By author',
  recent: 'Recently read',
}

/** 0: in the middle of it, 1: not started, 2: finished. */
const stage = (r: SeriesRow) => (r.read === r.total ? 2 : r.read === 0 && !r.slots.some((s) => s.book?.status === 'reading') ? 1 : 0)

export function sortSeries(rows: readonly SeriesRow[], by: SeriesSort): SeriesRow[] {
  const az = (a: SeriesRow, b: SeriesRow) => a.name.localeCompare(b.name)
  const out = [...rows]
  if (by === 'az') return out.sort(az)
  if (by === 'progress') return out.sort((a, b) => stage(a) - stage(b) || az(a, b))
  if (by === 'author') return out.sort((a, b) => a.author.localeCompare(b.author) || az(a, b))
  return out.sort((a, b) => b.lastRead.localeCompare(a.lastRead) || az(a, b))
}
