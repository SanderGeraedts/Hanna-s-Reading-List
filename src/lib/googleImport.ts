import type { Book, NewBook, ReadingStatus } from './library'
import { formatsOf, statusPatch, withFormats } from './library'
import { analyzeCover, colorFromString, remoteCoverUrl } from './cover'
import { guessLanguage } from './languages'
import type { GoogleBook } from './googleLibrary'
import type { GoogleVolume } from './googleVolume'
import type { ImportCallbacks, ImportSummary } from './storytelImport'
import { sameBook } from './storytelImport'

/**
 * Brings Hanna's Google Play Books library onto the shelf (#67): new books are
 * added, books already there are matched (by Google id, ISBN, or title and
 * author) and only ever moved forward: a book read on the shelf doesn't go
 * back to "want to read" because Google's shelves weren't kept up to date,
 * and a paused book stays paused until Google says it's read.
 */

const RANK: Record<ReadingStatus, number> = { want: 0, paused: 1, reading: 2, read: 3 }
const isbnOf = (s?: string) => s?.replace(/[^0-9X]/gi, '').toUpperCase()

export function findMatch(item: GoogleVolume, existing: Book[]): Book | undefined {
  const isbn = isbnOf(item.isbn)
  return (
    existing.find((e) => e.googleId === item.googleId) ??
    (isbn ? existing.find((e) => isbnOf(e.isbn) === isbn) : undefined) ??
    existing.find((e) => !e.googleId && sameBook(e, item))
  )
}

/** What Google adds to a book already on the shelf; empty when nothing changes. */
export function googlePatch(match: Book, item: GoogleBook): Partial<Book> {
  const ahead = RANK[item.status] > RANK[match.status] && !(match.status === 'paused' && item.status !== 'read')
  const formats = formatsOf(match)
  return {
    ...(!match.googleId && { googleId: item.googleId }),
    ...(ahead && statusPatch(match, item.status)),
    ...(item.owned && !formats.includes('ebook') && withFormats([...formats, 'ebook'])),
    // fill gaps only; what's on the shelf was chosen or corrected by Hanna
    ...(!match.pages && item.pages && { pages: item.pages }),
    ...(!match.isbn && item.isbn && { isbn: item.isbn }),
    ...(!match.published && item.published && { published: item.published, year: item.year }),
    ...(!match.language && item.language && { language: item.language }),
    ...(!match.description && item.description && { description: item.description }),
    ...(!match.genres?.length && item.genres.length && { genres: item.genres }),
  }
}

/** A Google Books volume as a new book, with its cover sampled for the spine. */
export async function volumeToBook(v: GoogleVolume, extra: Partial<NewBook> = {}): Promise<NewBook> {
  const coverUrl = v.coverUrl ? remoteCoverUrl(v.coverUrl) : undefined
  const analysis = coverUrl ? await analyzeCover(coverUrl).catch(() => null) : null
  return {
    title: v.title,
    authors: v.authors,
    year: v.year,
    ...(v.published && { published: v.published }),
    pages: v.pages,
    isbn: v.isbn,
    description: v.description,
    genres: v.genres,
    language: v.language ?? guessLanguage(v.title),
    googleId: v.googleId,
    coverUrl: analysis ? coverUrl : undefined,
    coverAspect: analysis?.aspect,
    color: analysis?.color ?? colorFromString(v.title),
    ...extra,
  }
}

export async function importGoogleBooks(
  items: GoogleBook[],
  existing: Book[],
  cb: ImportCallbacks,
): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, unchanged: 0 }
  const toAdd: GoogleBook[] = []
  for (const item of items) {
    const match = findMatch(item, existing)
    if (!match) {
      toAdd.push(item)
      continue
    }
    const patch = googlePatch(match, item)
    if (Object.keys(patch).length) {
      cb.updateBook(match.id, patch)
      summary.updated++
    } else summary.unchanged++
  }

  let done = 0
  cb.onProgress(0, toAdd.length)
  const queue = [...toAdd]
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const extra: Partial<NewBook> = {
        status: item.status,
        ...(item.status === 'read' && { readCount: 1 }),
        ...(item.owned && { formats: ['ebook'] }),
      }
      try {
        cb.addBook(await volumeToBook(item, extra))
      } catch {
        cb.addBook({
          title: item.title,
          authors: item.authors,
          googleId: item.googleId,
          language: item.language ?? guessLanguage(item.title),
          color: colorFromString(item.title),
          ...extra,
        })
      }
      summary.added++
      cb.onProgress(++done, toAdd.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return summary
}
