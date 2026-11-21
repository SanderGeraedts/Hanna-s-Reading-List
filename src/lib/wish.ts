import type { Book } from './library'
import { localDay, timesRead } from './library'
import { languageName } from './languages'
import { listenOnly } from './listening'
import { detectSeries } from './series'

/**
 * Make a wish, version 2: Hanna wishes for a length, a genre and/or a
 * language (all optional), and the star grants three books from the ones she
 * could read next (readNextChoices: no re-reads, series strictly in order,
 * out already). Not purely at random: books that have waited longest, by
 * authors she loves, or next in a series she enjoys come up more often.
 */

export type Length = 'short' | 'long'

export interface Wish {
  length?: Length
  genre?: string
  language?: string
}

/** Short: under 300 pages or 8 hours of listening. Long: 450 pages or 12 hours and more. */
export function lengthOf(book: Book): Length | 'medium' | undefined {
  if (listenOnly(book) && book.minutes) return book.minutes < 8 * 60 ? 'short' : book.minutes >= 12 * 60 ? 'long' : 'medium'
  if (book.pages) return book.pages < 300 ? 'short' : book.pages >= 450 ? 'long' : 'medium'
  if (book.minutes) return book.minutes < 8 * 60 ? 'short' : book.minutes >= 12 * 60 ? 'long' : 'medium'
  return undefined
}

/** How many of the wishes a book meets, out of how many were made. */
export function wishScore(book: Book, wish: Wish): { met: number; of: number } {
  let met = 0
  let of = 0
  if (wish.length) {
    of++
    if (lengthOf(book) === wish.length) met++
  }
  if (wish.genre) {
    of++
    if (book.genres?.includes(wish.genre)) met++
  }
  if (wish.language) {
    of++
    if (book.language === wish.language) met++
  }
  return { met, of }
}

/** The genres and languages to wish for, from the books she could read next (most common first). */
export function wishOptions(choices: Book[]) {
  const count = (values: string[]) => {
    const n = new Map<string, number>()
    for (const v of values) n.set(v, (n.get(v) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v)
  }
  return {
    genres: count(choices.flatMap((b) => b.genres ?? [])),
    languages: count(choices.flatMap((b) => (b.language ? [b.language] : []))).map((code) => ({ code, name: languageName(code) })),
  }
}

export type Reason = 'waited' | 'author' | 'series'

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/**
 * How likely a book is to be granted (1 = plain), and why it's more likely:
 * it has waited long on the shelf, it's by an author she rated 4–5 stars, or
 * it's next in a series whose books she rated 4–5 stars so far.
 */
export function wishWeight(book: Book, books: Book[], today = localDay()): { weight: number; reasons: Reason[] } {
  const reasons: Reason[] = []
  let weight = 1
  // waited longest: up to three times as likely after two years on the shelf
  const days = book.addedAt > 0 ? (Date.parse(`${today}T12:00:00Z`) - book.addedAt) / 86_400_000 : 0
  if (days > 0) weight *= 1 + Math.min(2, days / 365)
  if (days >= 365) reasons.push('waited')
  // authors she loves
  const author = book.authors[0]?.trim().toLowerCase()
  if (author) {
    const rated = books.filter((b) => b.id !== book.id && b.rating && b.authors[0]?.trim().toLowerCase() === author)
    if (rated.length && average(rated.map((b) => b.rating!)) >= 4) {
      weight *= 2
      reasons.push('author')
    }
  }
  // the next book of a series she enjoys
  const series = detectSeries(books)
  const mine = series.get(book.id)
  if (mine) {
    const key = mine.name.toLowerCase()
    const rated = books.filter((b) => b.id !== book.id && b.rating && timesRead(b) > 0 && series.get(b.id)?.name.toLowerCase() === key)
    if (rated.length && average(rated.map((b) => b.rating!)) >= 4) {
      weight *= 2
      reasons.push('series')
    }
  }
  return { weight, reasons }
}

export interface Granted {
  books: Array<{ book: Book; reasons: Reason[] }>
  /** every book meets every wish; false: the closest ones, as nothing met them all */
  exact: boolean
}

/**
 * Three books for a wish, drawn by weight without repeats. Books that meet
 * every wish first; when none do, the ones that meet the most. `avoid` (the
 * ones shown last time) only come back when there aren't enough others.
 */
export function grantWish(
  choices: Book[],
  books: Book[],
  wish: Wish,
  { avoid = [], random = Math.random, today = localDay() }: { avoid?: string[]; random?: () => number; today?: string } = {},
): Granted {
  const scored = choices.map((b) => ({ book: b, score: wishScore(b, wish), ...wishWeight(b, books, today) }))
  const all = scored.filter((x) => x.score.met === x.score.of)
  let pool = all
  const exact = all.length > 0
  if (!exact) {
    const best = Math.max(0, ...scored.map((x) => x.score.met))
    pool = scored.filter((x) => x.score.met === best)
  }
  const fresh = pool.filter((x) => !avoid.includes(x.book.id))
  const from = fresh.length >= Math.min(3, pool.length) ? fresh : pool
  const picked: typeof from = []
  const left = [...from]
  while (picked.length < 3 && left.length) {
    const total = left.reduce((a, x) => a + x.weight, 0)
    let r = random() * total
    let i = 0
    while (i < left.length - 1 && r >= left[i].weight) r -= left[i++].weight
    picked.push(left.splice(i, 1)[0])
  }
  return { books: picked.map((x) => ({ book: x.book, reasons: x.reasons })), exact }
}

export const REASON_TEXT: Record<Reason, string> = {
  waited: 'Waiting a long time',
  author: 'An author you love',
  series: 'Next in a series you enjoy',
}
