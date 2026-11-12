import type { Book } from './library'
import { timesRead } from './library'

/**
 * Reading recommendations: what we tell the recommender about her shelf, and
 * what comes back. The picking itself is done on the server (recommend.ts).
 */

export interface ShelfSummary {
  /** her best-rated (or most re-read) finished books */
  favourites: Array<{ title: string; author: string; rating?: number; spice?: number }>
  authors: string[]
  genres: string[]
  /** every book on the shelf, "Title — Author", so none is suggested again */
  shelf: string[]
  /** suggestions she turned down, the same way */
  notForMe: string[]
}

export interface Suggestion {
  title: string
  author: string
  year?: number
  why: string
}

export const bookLine = (title: string, author = '') => (author ? `${title} — ${author}` : title)

/** A title made comparable: lower case, no accents, no subtitle or punctuation. */
export function titleKey(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[:(—]/)[0]
    .replace(/^(the|a|an|de|het|een)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const top = (counts: Map<string, number>, n: number) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k]) => k)

/** What the shelf says about her taste. */
export function shelfSummary(books: Book[], notForMe: string[] = []): ShelfSummary {
  const finished = books.filter((b) => timesRead(b) > 0)
  const score = (b: Book) => (b.rating ?? 3) + Math.min(timesRead(b) - 1, 2) * 0.5
  const favourites = [...finished]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 20)
    .map((b) => ({
      title: b.title,
      author: b.authors[0] ?? '',
      ...(b.rating && { rating: b.rating }),
      ...(b.spice && { spice: b.spice }),
    }))
  const authors = new Map<string, number>()
  const genres = new Map<string, number>()
  for (const b of finished) {
    for (const a of b.authors.slice(0, 1)) authors.set(a, (authors.get(a) ?? 0) + 1 + (b.rating ?? 3) / 5)
    for (const g of b.genres ?? []) genres.set(g, (genres.get(g) ?? 0) + 1)
  }
  return {
    favourites,
    authors: top(authors, 8),
    genres: top(genres, 6),
    shelf: books.map((b) => bookLine(b.title, b.authors[0])),
    notForMe,
  }
}

/** Suggestions made safe: real entries only, none she has or turned down, one per title. */
export function cleanSuggestions(raw: unknown, exclude: string[]): Suggestion[] {
  const seen = new Set(exclude.map((line) => titleKey(line.split(' — ')[0])))
  const out: Suggestion[] = []
  for (const r of Array.isArray(raw) ? raw : []) {
    const s = r as Partial<Suggestion> | null
    const title = typeof s?.title === 'string' ? s.title.trim().slice(0, 200) : ''
    const author = typeof s?.author === 'string' ? s.author.trim().slice(0, 100) : ''
    const key = titleKey(title)
    if (!title || !key || seen.has(key)) continue
    seen.add(key)
    out.push({
      title,
      author,
      ...(typeof s?.year === 'number' && s.year > 0 && { year: Math.round(s.year) }),
      why: typeof s?.why === 'string' ? s.why.trim().slice(0, 300) : '',
    })
  }
  return out.slice(0, 8)
}
