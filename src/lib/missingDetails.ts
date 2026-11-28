import type { Book } from './library'

/**
 * Missing details (T-0129, D-0097): which books on her shelf have no back text, genres, tropes,
 * characters or country yet. Back text, genres and countries can be looked up on Open Library;
 * tropes and characters are hers to add. The wishlist is left out.
 */

export type Detail = 'back' | 'genres' | 'tropes' | 'characters' | 'places'

export const DETAILS: readonly Detail[] = ['back', 'genres', 'places', 'tropes', 'characters']

export const DETAIL_LABEL: Record<Detail, string> = {
  back: 'Back text',
  genres: 'Genres',
  places: 'Country',
  tropes: 'Tropes',
  characters: 'Characters',
}

/** The details Open Library can fill in; the rest only she can. */
export const LOOKABLE: readonly Detail[] = ['back', 'genres', 'places']

/** The book panel tab where each detail is filled in. */
export const DETAIL_TAB: Record<Detail, 'notes' | 'details'> = {
  back: 'details',
  genres: 'details',
  places: 'details',
  tropes: 'notes',
  characters: 'notes',
}

/** Whether a book is missing one detail. */
export function misses(book: Book, d: Detail): boolean {
  switch (d) {
    case 'back':
      return !book.description?.trim()
    case 'genres':
      return !book.genres?.length
    case 'places':
      return !book.places?.length
    case 'tropes':
      return !book.tropes?.length
    case 'characters':
      return !book.characters?.length
  }
}

/** The books the check looks at: the whole shelf, not the wishlist. */
export const onShelf = (books: readonly Book[]) => books.filter((b) => !b.wish)

/** Per detail, the books missing it, in title order. */
export function missingByDetail(books: readonly Book[]): Record<Detail, Book[]> {
  const shelf = onShelf(books).sort((a, b) => a.title.localeCompare(b.title))
  return Object.fromEntries(DETAILS.map((d) => [d, shelf.filter((b) => misses(b, d))])) as Record<Detail, Book[]>
}

/** What a lookup found for one book: only the details that were missing and are now found. */
export interface Found {
  id: string
  back?: string
  genres?: string[]
  places?: string[]
}

/**
 * The change to save for what she kept, decided at the moment it is saved: a detail she filled in
 * herself in the meantime is never overwritten.
 */
export const foundPatch =
  (found: Found, keep: ReadonlySet<'back' | 'genres' | 'places'>) =>
  (b: Book): Partial<Book> => {
    const patch: Partial<Book> = {}
    if (keep.has('back') && found.back && misses(b, 'back')) patch.description = found.back
    if (keep.has('genres') && found.genres?.length && misses(b, 'genres')) patch.genres = found.genres
    if (keep.has('places') && found.places?.length && misses(b, 'places')) patch.places = found.places
    return patch
  }
