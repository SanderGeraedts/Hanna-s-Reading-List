import type { Book } from './library'

/**
 * Showing only the books of one genre (#41). Genre is a filter instead of an
 * arrangement: the shelf keeps its order and just shows fewer books.
 */

/** The filter value for books that have no genre yet. */
export const NO_GENRE = '\u0000none'

export interface GenreOption {
  value: string
  label: string
  count: number
}

/** Every genre on the shelf, most books first, then "No genre" if any book has none. */
export function genreOptions(books: Book[]): GenreOption[] {
  const counts = new Map<string, number>()
  let none = 0
  for (const b of books) {
    const genres = new Set(b.genres ?? [])
    if (!genres.size) none++
    for (const g of genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const out = [...counts]
    .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
    .map(([g, count]) => ({ value: g, label: g, count }))
  if (none) out.push({ value: NO_GENRE, label: 'No genre', count: none })
  return out
}

/** The books in `genre`, in shelf order (null: all books). */
export function filterByGenre(books: Book[], genre: string | null): Book[] {
  if (!genre) return books
  if (genre === NO_GENRE) return books.filter((b) => !b.genres?.length)
  return books.filter((b) => b.genres?.includes(genre))
}

/**
 * The whole shelf's order after the shown books were dragged into `shownOrder`:
 * the shown books take the places they had between them, hidden books stay put.
 */
export function reorderShown(allIds: string[], shownOrder: string[]): string[] {
  const shown = new Set(shownOrder)
  let next = 0
  return allIds.map((id) => (shown.has(id) ? shownOrder[next++] : id))
}
