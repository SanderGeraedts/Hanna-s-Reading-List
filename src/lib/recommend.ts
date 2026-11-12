import type { SearchResult } from '#/server/openLibrary'
import type { Book } from './library'
import { timesRead } from './library'

/**
 * Reading suggestions, from Open Library (no AI): newer books by her
 * favourite authors (the ones she rates best and reads most), and new books
 * in her favourite genres. Books on her shelf, or that she said no to, are
 * left out.
 */

export interface Suggestion {
  title: string
  author: string
  year?: number
  why: string
  /** the Open Library book, for the cover and for adding it */
  result?: SearchResult
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

export interface Taste {
  /** her favourite authors, best first, with her average rating when she rated them */
  authors: Array<{ name: string; rating?: number }>
  genres: string[]
}

/** What the shelf says she loves: authors by rating and books read, and genres by books read. */
export function tasteOf(books: Book[]): Taste {
  const finished = books.filter((b) => timesRead(b) > 0)
  const authors = new Map<string, { score: number; ratings: number[] }>()
  const genres = new Map<string, number>()
  for (const b of finished) {
    const a = b.authors[0]
    if (a) {
      const e = authors.get(a) ?? { score: 0, ratings: [] }
      e.score += 1 + ((b.rating ?? 3) - 3) / 2
      if (b.rating) e.ratings.push(b.rating)
      authors.set(a, e)
    }
    for (const g of b.genres ?? []) genres.set(g, (genres.get(g) ?? 0) + 1)
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 2) / 2 : undefined)
  return {
    authors: [...authors.entries()]
      .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, e]) => ({ name, rating: avg(e.ratings) })),
    genres: [...genres.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([g]) => g),
  }
}

/** Box sets, omnibus editions and study guides are not books to suggest. */
const NOT_A_BOOK = /\s\/\s|box(ed)?\s*set|collection|omnibus|trilogy set|bundle|study guide|summary of|coloring|colouring/i
/** Mostly Latin letters: she reads English, Dutch and German. */
const latin = (s: string) => (s.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0) >= s.replace(/[\s\d\p{P}]/gu, '').length * 0.8

export function worthSuggesting(r: SearchResult) {
  return !!r.title && !!r.coverId && !NOT_A_BOOK.test(r.title) && latin(r.title)
}

export interface Source {
  why: string
  results: SearchResult[]
  /** only books first published in or after this year */
  since?: number
}

/**
 * Suggestions from several lists (one per author or genre), taking from each
 * in turn so one author doesn't fill them all, newest first within a list.
 */
export function combineSuggestions(sources: Source[], exclude: string[], n = 6): Suggestion[] {
  const seen = new Set(exclude.map((line) => titleKey(line.split(' — ')[0])))
  const queues = sources.map((s) =>
    s.results
      .filter((r) => worthSuggesting(r) && (!s.since || (r.year ?? 0) >= s.since))
      .map((r) => ({ r, why: s.why })),
  )
  const out: Suggestion[] = []
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      while (q.length) {
        const { r, why } = q.shift()!
        const key = titleKey(r.title)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push({ title: r.title, author: r.authors[0] ?? '', year: r.year, why, result: r })
        break
      }
      if (out.length >= n) break
    }
  }
  return out
}

/** The reason shown under a suggestion by one of her authors. */
export function authorReason(a: Taste['authors'][number]) {
  return a.rating ? `More by ${a.name}, whose books you rate ★${String(a.rating).replace('.5', '½')}` : `More by ${a.name}`
}
