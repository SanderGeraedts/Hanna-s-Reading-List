import type { NewBook } from './library'
import type { SearchResult } from '#/server/openLibrary'
import { analyzeCover, colorFromString, coverUrlForId, coverUrlForIsbn } from './cover'
import { guessLanguage } from './languages'

/** The cover fields of a book about to be added, once a cover has been chosen (T-0060). */
export interface PickedCover {
  coverUrl?: string
  coverAspect?: number
  color: string
}

/** The cover Open Library puts first for a result, if it has one at all. */
export const defaultCoverUrl = (r: SearchResult): string | undefined =>
  r.coverId ? coverUrlForId(r.coverId) : r.isbn ? coverUrlForIsbn(r.isbn) : undefined

/** Everything about a book except its cover, from an Open Library result. */
export function bookFacts(
  r: SearchResult & { published?: string },
  details: { description?: string; genres?: string[] } = {},
): Omit<NewBook, 'color'> {
  return {
    title: r.title,
    authors: r.authors,
    year: r.year,
    ...(r.published && { published: r.published }),
    pages: r.pages,
    isbn: r.isbn,
    workKey: r.workKey || undefined,
    description: details.description,
    genres: details.genres,
    language: r.language ?? guessLanguage(r.title),
  }
}

/** A book from an Open Library result with the cover she picked in the cover step. */
export function bookWithCover(
  r: SearchResult & { published?: string },
  details: { description?: string; genres?: string[] } = {},
  cover: PickedCover,
): NewBook {
  return {
    ...bookFacts(r, details),
    coverUrl: cover.coverUrl,
    coverAspect: cover.coverAspect,
    color: cover.color || colorFromString(r.title),
  }
}

/**
 * Turns an Open Library result into a book, sampling the cover Open Library
 * puts first for its spine colour and shape. Used where no cover step runs:
 * the ISBN tab, the Scan tab's list and "New for you".
 */
export async function buildBook(
  r: SearchResult & { published?: string },
  details: { description?: string; genres?: string[] } = {},
): Promise<NewBook> {
  const coverUrl = defaultCoverUrl(r)
  const analysis = coverUrl ? await analyzeCover(coverUrl) : null
  return {
    ...bookFacts(r, details),
    coverUrl: analysis ? coverUrl : undefined,
    coverAspect: analysis?.aspect,
    color: analysis?.color ?? colorFromString(r.title),
  }
}
