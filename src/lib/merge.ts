import type { Book, ReadingStatus } from './library'
import { formatsOf, withFormats } from './library'
import { tidyTitle } from './titles'

/**
 * Merging two copies of the same book (#14): a paperback and its Storytel
 * copy, or the same book listed twice by Storytel (two editions).
 */

// a paused book has been started, but reading it now is further along
const STATUS_RANK: Record<ReadingStatus, number> = { want: 0, paused: 1, reading: 2, read: 3 }

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
const surname = (b: Book) => norm((b.authors[0] ?? '').trim().split(/\s+/).pop())
const uniq = <T,>(xs: T[]) => [...new Set(xs)]

/**
 * One book out of two. The book Hanna started the merge from (`keep`) keeps
 * its title, cover, blurb, series and language; the furthest reading status,
 * progress and times read win; formats, genres and ids are combined, so a
 * Storytel refresh or another device's old shelf doesn't bring the other
 * copy back.
 */
export function mergeBooks(keep: Book, other: Book): Book {
  const status = STATUS_RANK[other.status] > STATUS_RANK[keep.status] ? other.status : keep.status
  const progress = Math.max(keep.progress ?? 0, other.progress ?? 0)
  const readCount = Math.max(keep.readCount ?? 0, other.readCount ?? 0)
  const storytelIds = uniq(
    [keep.storytelId, ...(keep.storytelIds ?? []), other.storytelId, ...(other.storytelIds ?? [])].filter(
      (id): id is string => !!id,
    ),
  )
  const genres = uniq([...(keep.genres ?? []), ...(other.genres ?? [])])
  return {
    ...other,
    ...keep,
    // fill in what the kept copy doesn't know
    year: keep.year ?? other.year,
    // the other copy's date only when it is about the same year
    published:
      keep.published ??
      (other.published && (keep.year === undefined || other.published.startsWith(String(keep.year)))
        ? other.published
        : undefined),
    pages: keep.pages ?? other.pages,
    minutes: keep.minutes ?? other.minutes,
    isbn: keep.isbn ?? other.isbn,
    workKey: keep.workKey ?? other.workKey,
    coverUrl: keep.coverUrl ?? other.coverUrl,
    coverAspect: keep.coverUrl ? keep.coverAspect : (other.coverAspect ?? keep.coverAspect),
    description: keep.description ?? other.description,
    series: keep.series ?? other.series,
    seriesIndex: keep.series ? keep.seriesIndex : (other.seriesIndex ?? keep.seriesIndex),
    language: keep.language ?? other.language,
    lent: keep.lent ?? other.lent,
    edges: keep.edges ?? other.edges,
    // furthest along wins
    status,
    ...(progress > 0 && { progress }),
    ...(readCount > 0 && { readCount }),
    // combined
    ...withFormats([...formatsOf(keep), ...formatsOf(other)]),
    ...((keep.genres || other.genres) && { genres: genres.slice(0, 5) }),
    ...((keep.finished || other.finished) && {
      finished: uniq([...(keep.finished ?? []), ...(other.finished ?? [])]).sort(),
    }),
    ...((keep.started || other.started) && {
      started: uniq([...(keep.started ?? []), ...(other.started ?? [])]).sort(),
    }),
    // a day read in both copies: the larger amount
    ...((keep.readingLog || other.readingLog) && { readingLog: mergeLogs(keep.readingLog, other.readingLog) }),
    ...((keep.quotes || other.quotes) && { quotes: uniq([...(keep.quotes ?? []), ...(other.quotes ?? [])]) }),
    ...((keep.lovedQuotes || other.lovedQuotes) && {
      lovedQuotes: uniq([...(keep.lovedQuotes ?? []), ...(other.lovedQuotes ?? [])]),
    }),
    storytelId: storytelIds[0],
    ...(storytelIds.length > 1 && { storytelIds: storytelIds.slice(1) }),
    mergedIds: uniq([...(keep.mergedIds ?? []), other.id, ...(other.mergedIds ?? [])]),
    notDuplicates: uniq([...(keep.notDuplicates ?? []), ...(other.notDuplicates ?? [])]).filter(
      (id) => id !== keep.id && id !== other.id,
    ),
    addedAt: Math.min(keep.addedAt, other.addedAt),
    id: keep.id,
  }
}

function mergeLogs(a: Record<string, number> = {}, b: Record<string, number> = {}) {
  const out = { ...a }
  for (const [day, n] of Object.entries(b)) out[day] = Math.max(out[day] ?? 0, n)
  return out
}

/** Every Storytel id a book stands for. */
export function storytelIdsOf(b: Book): string[] {
  return [b.storytelId, ...(b.storytelIds ?? [])].filter((id): id is string => !!id)
}

/** The title and author used to spot copies of the same book, edition notes left out. */
function titleKey(b: Book) {
  const t = norm(tidyTitle(b.originalTitle ?? b.title) ?? b.originalTitle ?? b.title)
  const shown = norm(tidyTitle(b.title) ?? b.title)
  return [t, shown].filter(Boolean).map((x) => `${x}|${surname(b)}`)
}

/**
 * Books on the shelf that look like another copy of `book`: the same ISBN or
 * Open Library work, or the same title (edition notes left out) by the same
 * author. Pairs Hanna marked as "not the same book" are left out.
 */
export function likelyDuplicates(book: Book, shelf: Book[]): Book[] {
  const keys = new Set(titleKey(book))
  return shelf.filter((o) => {
    if (o.id === book.id) return false
    if (book.notDuplicates?.includes(o.id) || o.notDuplicates?.includes(book.id)) return false
    if (book.isbn && o.isbn && book.isbn === o.isbn) return true
    if (book.workKey && o.workKey && book.workKey === o.workKey) return true
    return titleKey(o).some((k) => keys.has(k))
  })
}
