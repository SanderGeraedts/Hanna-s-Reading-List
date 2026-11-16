import type { Book } from './library'
import { localDay } from './library'
import { sleepReadIds } from './sleepSeries'
import { notOutYet } from './upcoming'

/**
 * The A–Z challenge (#143): in one year (1 January to 31 December), finish a
 * book for every letter of the alphabet. The letter is the first letter of
 * the title exactly as it is on the shelf, so "The Adventures of Gulliver"
 * is T: no "The", "A" or "De" is skipped. Only what isn't a letter is
 * skipped (a quote mark at the start); accents count as the plain letter
 * (Ä is A); a title starting with a number counts for no letter.
 *
 * Sleep reads don't count, not even their first read.
 */

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** The letter a title counts for, or undefined. */
export function letterOf(title: string): string | undefined {
  const first = title.trim().match(/[\p{L}\p{N}]/u)?.[0]
  if (!first) return undefined
  const plain = first.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  return LETTERS.includes(plain) ? plain : undefined
}

export interface AlphabetYear {
  year: number
  /** letter → the first book finished for it this year */
  done: Map<string, { book: Book; day: string }>
  /** "18 of 26 · on track", "behind: 2 letters a month to go", or done */
  pace: string
  onTrack: boolean
  /** missing letters with a book from her pile that would count */
  tips: Array<{ letter: string; book: Book }>
}

const dayOfYear = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`)
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1
}

export function alphabetYear(books: Book[], year: number, today = localDay()): AlphabetYear {
  const sleep = sleepReadIds(books)
  const finishes: Array<{ book: Book; day: string; letter: string }> = []
  for (const b of books) {
    if (sleep.has(b.id)) continue
    const letter = letterOf(b.title)
    if (!letter) continue
    for (const day of b.finished ?? []) if (day.startsWith(`${year}-`)) finishes.push({ book: b, day, letter })
  }
  finishes.sort((a, b) => a.day.localeCompare(b.day) || a.book.title.localeCompare(b.book.title))
  const done = new Map<string, { book: Book; day: string }>()
  for (const f of finishes) if (!done.has(f.letter)) done.set(f.letter, { book: f.book, day: f.day })

  // how far the year is, against how far the alphabet is
  const daysInYear = dayOfYear(`${year}-12-31`)
  const elapsed = today < `${year}-01-01` ? 0 : today > `${year}-12-31` ? daysInYear : dayOfYear(today)
  const expected = (LETTERS.length * elapsed) / daysInYear
  const n = done.size
  const left = LETTERS.length - n
  const monthsLeft = Math.max(1, 12 - Number(today.slice(5, 7)) + 1)
  const onTrack = n >= Math.floor(expected)
  const pace =
    left === 0
      ? 'All 26 letters! 🎉'
      : onTrack
        ? `${n} of 26 · on track`
        : `${n} of 26 · behind: ${perMonth(left / monthsLeft)} a month to go`

  // a book from her pile for each missing letter: being read first, then wanted
  const rank = { reading: 0, paused: 1, want: 2, read: 3 } as const
  const pile = books
    .filter((b) => b.status !== 'read' && !sleep.has(b.id) && !notOutYet(b, today))
    .sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title))
  const tips: AlphabetYear['tips'] = []
  for (const letter of LETTERS) {
    if (done.has(letter)) continue
    const book = pile.find((b) => letterOf(b.title) === letter)
    if (book) tips.push({ letter, book })
  }
  return { year, done, pace, onTrack, tips }
}

const perMonth = (n: number) => {
  const r = Math.ceil(n * 10) / 10
  const text = Number.isInteger(r) ? String(r) : r.toFixed(1)
  return `${text} ${r === 1 ? 'letter' : 'letters'}`
}
