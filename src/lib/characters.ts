import type { Book } from './library'

/**
 * The characters of a book (D-0042): a name and a ♥ for a favourite, per book.
 * Names are compared the same folded way tropes are, so the same name is not
 * added twice to one book; across books two rows with the same name stay two
 * characters, each with its own book.
 */

export interface BookCharacter {
  name: string
  /** her favourite (♥) */
  fav?: boolean
}

/** The longest a character name may be. */
export const MAX_CHARACTER = 60

/** How two names are compared: trimmed, inner whitespace collapsed, lower case, no accents. */
export function foldName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** The characters of a book, never undefined. */
export const charactersOf = (book: Book): BookCharacter[] => book.characters ?? []

/** The patch that adds a typed name, or null when it is empty or already on this book. */
export function addCharacter(book: Book, typed: string): Pick<Book, 'characters'> | null {
  const name = typed.trim().replace(/\s+/g, ' ').slice(0, MAX_CHARACTER)
  if (!name) return null
  const folded = foldName(name)
  const list = charactersOf(book)
  if (list.some((c) => foldName(c.name) === folded)) return null
  return { characters: [...list, { name }] }
}

/** The patch that takes a character off a book; the field goes away with the last one. */
export function removeCharacter(book: Book, name: string): Pick<Book, 'characters'> {
  const gone = foldName(name)
  const left = charactersOf(book).filter((c) => foldName(c.name) !== gone)
  return { characters: left.length ? left : undefined }
}

/** The patch that gives a character a ♥, or takes it away. */
export function toggleFavourite(book: Book, name: string): Pick<Book, 'characters'> {
  const want = foldName(name)
  return {
    characters: charactersOf(book).map((c) =>
      foldName(c.name) === want ? (c.fav ? { name: c.name } : { ...c, fav: true }) : c,
    ),
  }
}

export interface FavouriteCharacter {
  name: string
  book: Book
}

/**
 * Every ♥ character over a list of books, with the book it belongs to. The same
 * name on two books is two favourites: they are two characters as far as the
 * app knows. Newest book first (its last edit, else when it was added).
 */
export function favouriteCharacters(books: Book[]): FavouriteCharacter[] {
  const when = (b: Book) => b.editedAt ?? b.addedAt ?? 0
  return books
    .filter((b) => charactersOf(b).some((c) => c.fav))
    .sort((a, b) => when(b) - when(a) || a.title.localeCompare(b.title))
    .flatMap((book) => charactersOf(book).filter((c) => c.fav).map((c) => ({ name: c.name, book })))
}
