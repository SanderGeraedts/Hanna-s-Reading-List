import type { Book } from './library'
import { localDay } from './library'
import { sleepReadIds } from './sleepSeries'
import { notOutYet } from './upcoming'

/**
 * The A–Z challenges: in one year (1 January to 31 December), finish a book
 * for every letter of the alphabet.
 *
 * - **Titles** (#143): the first letter of the title exactly as it is on the
 *   shelf, so "The Adventures of Gulliver" is T: no "The", "A" or "De" is
 *   skipped.
 * - **Authors** (#151): the first letter of an author's first name and of
 *   their surname (the last part of the name) both count, so one book by
 *   Sarah J. Maas lights up S and M. Every author of the book counts.
 *
 * Only what isn't a letter is skipped (a quote mark at the start); accents
 * count as the plain letter (Ä is A); a name or title starting with a number
 * counts for no letter. Sleep reads don't count, not even their first read.
 *
 * A letter shows the first book finished for it that year, unless Hanna
 * picked another book that also counts for it (#152). The pick is kept on
 * the book (`alphabetPicks`, "title:2026:T"), so it's the same on every device.
 */

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export type AlphabetKind = 'title' | 'author'

/** The letter a title (or a name) counts for, or undefined. */
export function letterOf(title: string): string | undefined {
  const first = title.trim().match(/[\p{L}\p{N}]/u)?.[0]
  if (!first) return undefined
  const plain = first.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  return LETTERS.includes(plain) ? plain : undefined
}

/** The letters an author's name counts for: first name and surname (#151). */
export function authorLetters(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter((p) => letterOf(p))
  if (parts.length === 0) return []
  const out = [letterOf(parts[0])!, letterOf(parts[parts.length - 1])!]
  return [...new Set(out)]
}

/** The letters a book counts for in a challenge. */
export function lettersOf(book: Book, kind: AlphabetKind): string[] {
  if (kind === 'title') {
    const l = letterOf(book.title)
    return l ? [l] : []
  }
  return [...new Set(book.authors.flatMap(authorLetters))].sort()
}

const pickKey = (kind: AlphabetKind, year: number, letter: string) => `${kind}:${year}:${letter}`

export interface AlphabetYear {
  kind: AlphabetKind
  year: number
  /** letter → the book that stands for it this year (picked, or the first finished) */
  done: Map<string, { book: Book; day: string; picked: boolean }>
  /** letter → every book finished this year that counts for it, first finished first */
  options: Map<string, Book[]>
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

export function alphabetYear(
  books: Book[],
  year: number,
  today = localDay(),
  kind: AlphabetKind = 'title',
): AlphabetYear {
  const sleep = sleepReadIds(books)
  const finishes: Array<{ book: Book; day: string; letter: string }> = []
  for (const b of books) {
    if (sleep.has(b.id)) continue
    const letters = lettersOf(b, kind)
    if (letters.length === 0) continue
    const first = (b.finished ?? []).filter((d) => d.startsWith(`${year}-`)).sort()[0]
    if (first) for (const letter of letters) finishes.push({ book: b, day: first, letter })
  }
  finishes.sort((a, b) => a.day.localeCompare(b.day) || a.book.title.localeCompare(b.book.title))

  const options = new Map<string, Book[]>()
  const firstDay = new Map<string, string>()
  for (const f of finishes) {
    options.set(f.letter, [...(options.get(f.letter) ?? []), f.book])
    firstDay.set(f.book.id, f.day)
  }
  const done: AlphabetYear['done'] = new Map()
  for (const letter of LETTERS) {
    const books = options.get(letter)
    if (!books) continue
    const picked = books.find((b) => b.alphabetPicks?.includes(pickKey(kind, year, letter)))
    const book = picked ?? books[0]
    done.set(letter, { book, day: firstDay.get(book.id)!, picked: !!picked })
  }

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
  const rank = { reading: 0, paused: 1, want: 2, read: 3, dnf: 4 } as const
  const pile = books
    .filter((b) => b.status !== 'read' && !sleep.has(b.id) && !notOutYet(b, today))
    .sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title))
  const tips: AlphabetYear['tips'] = []
  for (const letter of LETTERS) {
    if (done.has(letter)) continue
    const book = pile.find((b) => lettersOf(b, kind).includes(letter))
    if (book) tips.push({ letter, book })
  }
  return { kind, year, done, options, pace, onTrack, tips }
}

/**
 * The changes that make `bookId` stand for `letter` (#152): book id → its new
 * `alphabetPicks`. Any other book picked for that letter lets go of it.
 */
export function pickLetter(
  books: Book[],
  kind: AlphabetKind,
  year: number,
  letter: string,
  bookId: string,
): Map<string, Partial<Book>> {
  const key = pickKey(kind, year, letter)
  const out = new Map<string, Partial<Book>>()
  for (const b of books) {
    const had = b.alphabetPicks ?? []
    if (b.id === bookId) {
      if (!had.includes(key)) out.set(b.id, { alphabetPicks: [...had, key] })
    } else if (had.includes(key)) {
      const rest = had.filter((k) => k !== key)
      out.set(b.id, { alphabetPicks: rest.length ? rest : undefined })
    }
  }
  return out
}

const perMonth = (n: number) => {
  const r = Math.ceil(n * 10) / 10
  const text = Number.isInteger(r) ? String(r) : r.toFixed(1)
  return `${text} ${r === 1 ? 'letter' : 'letters'}`
}
