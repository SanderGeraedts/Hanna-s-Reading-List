import { useEffect, useRef } from 'react'
import { getWorkDetails, searchBooks } from '#/server/openLibrary'
import type { Book } from './library'
import { guessLanguage } from './languages'
import { seriesGroups } from './series'
import { findOnOpenLibrary } from './storytelImport'
import { titleQueries } from './titles'

const WORKERS = 3

const surname = (name?: string) =>
  (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .pop() ?? ''

/**
 * Genres from Open Library: the book's own work, else any search hit by the
 * same author for one of the title's parts. Open Library mostly knows the
 * English editions, so a German title is often only found by its subtitle.
 */
async function lookUpGenres(b: Book): Promise<string[]> {
  const workKey = b.workKey ?? (await findOnOpenLibrary(b))?.workKey
  if (workKey) {
    const d = await getWorkDetails({ data: { workKey } })
    if (d.genres.length) return d.genres
  }
  const author = surname(b.authors[0])
  if (!author) return []
  for (const q of titleQueries(b.title)) {
    const results = await searchBooks({ data: { query: `${q} ${b.authors[0]}` } })
    const hit = results.find((r) => r.authors.some((a) => surname(a) === author))
    if (hit) {
      const d = await getWorkDetails({ data: { workKey: hit.workKey } })
      if (d.genres.length) return d.genres
    }
  }
  return []
}

/** The genres most books in a group share, at most three. */
function common(books: Book[]) {
  const count = new Map<string, number>()
  for (const b of books) for (const g of b.genres ?? []) count.set(g, (count.get(g) ?? 0) + 1)
  return [...count]
    .filter(([, n]) => n * 2 >= books.length)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)
}

/**
 * Fills in details for books added before they existed: genres (looked up
 * once per book; an empty list means none were found) and a language guessed
 * from the title. Books Open Library doesn't know take the genres of their
 * series, or else of the author's other books. Hanna can change both.
 */
export function useBookDetails(
  books: Book[],
  loaded: boolean,
  updateBook: (id: string, patch: Partial<Book>) => void,
) {
  const tried = useRef(new Set<string>())
  const borrowed = useRef(new Set<string>())
  const queue = useRef<Book[]>([])
  const running = useRef(0)

  useEffect(() => {
    if (!loaded) return
    for (const b of books) {
      if (tried.current.has(b.id)) continue
      if (b.language === undefined) {
        const language = guessLanguage(b.title)
        if (language) updateBook(b.id, { language })
      }
      if (b.genres === undefined) queue.current.push(b)
      tried.current.add(b.id)
    }

    const work = async () => {
      running.current++
      try {
        for (let b = queue.current.shift(); b; b = queue.current.shift()) {
          try {
            updateBook(b.id, { genres: await lookUpGenres(b) })
          } catch {
            /* Open Library unreachable: try again on the next visit */
          }
        }
      } finally {
        running.current--
      }
    }
    while (running.current < WORKERS && queue.current.length) void work()

    // once every lookup is done: books without genres borrow them from their series or author
    if (running.current || queue.current.length) return
    const groups = seriesGroups(books)
    for (const b of books) {
      if (!b.genres || b.genres.length || borrowed.current.has(b.id)) continue
      borrowed.current.add(b.id)
      const key = groups.get(b.id)?.key
      const series = key ? books.filter((o) => o.genres?.length && groups.get(o.id)?.key === key) : []
      const author = surname(b.authors[0])
      const byAuthor = author ? books.filter((o) => o.genres?.length && surname(o.authors[0]) === author) : []
      const genres = series.length ? common(series) : byAuthor.length ? common(byAuthor) : []
      if (genres.length) updateBook(b.id, { genres })
    }
  }, [books, loaded, updateBook])
}
