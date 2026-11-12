import { getWorkDetails, lookupIsbn } from '#/server/openLibrary'
import type { Book } from './library'
import { findOnOpenLibrary } from './storytelImport'

/**
 * Looks for a book's back text (its blurb) on Open Library: the description of
 * its work, then of its edition by ISBN, then of the best search match.
 */
export async function findBackText(book: Book): Promise<string | undefined> {
  const fromWork = async (workKey?: string) =>
    workKey ? (await getWorkDetails({ data: { workKey } }).catch(() => undefined))?.description : undefined
  const found =
    (await fromWork(book.workKey)) ??
    (book.isbn ? (await lookupIsbn({ data: { isbn: book.isbn } }).catch(() => undefined))?.description : undefined) ??
    (await fromWork((await findOnOpenLibrary(book))?.workKey))
  return found?.trim() || undefined
}
