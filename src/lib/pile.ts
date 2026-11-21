import type { Book } from './library'
import { formatsOf, localDay } from './library'
import { COIN_CENTS, ownsCopy, priceCents } from './price'
import { readNextChoices } from './readNext'

/**
 * Motivation to read from the pile (T-0014), all worked out from the books on
 * the shelf, so every device agrees:
 * - in vs. out per month: books added against books read "from the pile";
 * - two coin jars: one coin per book read from the pile, the buying jar
 *   spending what an owned book cost (€5 a coin, D-0024);
 * - the weekly dust-off: the want-to-read book that has waited longest.
 */

/** A finish counts as "from the pile" when the book had been on the shelf at least this long. */
export const PILE_DAYS = 14
/** The jars start counting here, so she starts with this month's coins. */
export const JAR_START = '2026-11-01'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const pad = (n: number) => String(n).padStart(2, '0')
/** yyyy-mm-dd as a whole day number, so differences are whole days whatever the clock does. */
const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000
const dayOfNumber = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/** The local day a book was added. */
export const addedDay = (book: Book) => localDay(new Date(book.addedAt))

/** Whether a finish on `day` counts as one from the pile: on the shelf at least 14 days before. */
export const fromPile = (book: Book, day: string) => dayNumber(day) - dayNumber(addedDay(book)) >= PILE_DAYS

/** Every noted finish day of every book that counts as read from the pile (re-reads too). */
function pileFinishes(books: Book[]): Array<{ book: Book; day: string }> {
  return books.flatMap((book) => (book.finished ?? []).filter((d) => DAY_RE.test(d) && fromPile(book, d)).map((day) => ({ book, day })))
}

// ---- in vs. out --------------------------------------------------------------------------------

export interface PileMonth {
  year: number
  month: number
  /** books added that month */
  added: number
  /** finishes from the pile that month */
  read: number
  /** added − read: above 0 the pile grew, below 0 it shrank */
  net: number
}

/** The last `count` calendar months, this month last, with what went onto the pile and what came off. */
export function pileMonths(books: Book[], today = localDay(), count = 6): PileMonth[] {
  const added = new Map<string, number>()
  for (const b of books) {
    const m = addedDay(b).slice(0, 7)
    added.set(m, (added.get(m) ?? 0) + 1)
  }
  const read = new Map<string, number>()
  for (const f of pileFinishes(books)) {
    const m = f.day.slice(0, 7)
    read.set(m, (read.get(m) ?? 0) + 1)
  }
  const y = +today.slice(0, 4)
  const m = +today.slice(5, 7)
  const out: PileMonth[] = []
  for (let i = count - 1; i >= 0; i--) {
    const total = y * 12 + (m - 1) - i
    const year = Math.floor(total / 12)
    const month = (total % 12) + 1
    const key = `${year}-${pad(month)}`
    const a = added.get(key) ?? 0
    const r = read.get(key) ?? 0
    out.push({ year, month, added: a, read: r, net: a - r })
  }
  return out
}

/** The block's sentence for a month: shrank (with 🎉), grew, stayed the same, or nothing yet. */
export function pileSentence({ added, read }: Pick<PileMonth, 'added' | 'read'>): string {
  if (added === 0 && read === 0) return 'Nothing added or read from your pile yet this month.'
  const start = `This month you added ${added} and read ${read} from your pile: your pile`
  if (read > added) return `${start} shrank by ${read - added} 🎉`
  if (added > read) return `${start} grew by ${added - read}.`
  return `${start} stayed the same.`
}

/** A change with its sign: "+2", "0", "−3" (a real minus sign). */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

// ---- the jars ----------------------------------------------------------------------------------

/** She owns it on paper or as an e-book (library, borrowed, audiobook and Storytel aren't owned). */
export const owned = (book: Book) => ownsCopy(formatsOf(book))
/** A Storytel book she only listens to: Storytel, and no paper or e-book copy. */
export const storytelOnly = (book: Book) => formatsOf(book).includes('storytel') && !owned(book)

export interface Jars {
  /**
   * coins in the buying jar: one earned per owned book read from the pile,
   * price / 5 spent per owned book added (D-0024); may be below zero
   */
  buying: number
  /** coins in the Storytel jar: a score, never spent */
  storytel: number
}

/**
 * The two jars, from JAR_START up to today. The buying jar is summed in cents
 * (a coin is €5) so decimals never drift: each owned finish from the pile
 * adds 500, each owned book added spends its price; no price spends nothing.
 * There is no threshold and no floor, so the order of the days doesn't matter.
 */
export function pileJars(books: Book[], today = localDay(), start = JAR_START): Jars {
  let cents = 0
  let storytel = 0
  for (const f of pileFinishes(books)) {
    if (f.day < start || f.day > today) continue
    if (owned(f.book)) cents += COIN_CENTS
    else if (storytelOnly(f.book)) storytel++
  }
  for (const b of books) {
    const d = addedDay(b)
    if (d >= start && d <= today && owned(b)) cents -= priceCents(b.price)
  }
  return { buying: cents / COIN_CENTS, storytel }
}

// ---- dust off the oldest -----------------------------------------------------------------------

/** What this device remembers about the dust-off (T-0014). */
export interface DustOffState {
  /** the Monday (yyyy-mm-dd) of the week the pick below was made */
  week?: string
  /** the book picked for that week */
  pick?: string
  /** books she said Not now to; they don't come back */
  dismissed: string[]
}

const MAX_DISMISSED = 500

/** The Monday of the week `day` is in (weeks run Monday to Sunday). */
export function weekOf(day: string): string {
  const n = dayNumber(day)
  const weekday = (new Date(n * 86_400_000).getUTCDay() + 6) % 7 // Monday 0 … Sunday 6
  return dayOfNumber(n - weekday)
}

/** A saved state made safe. */
export function cleanDustOff(raw: unknown): DustOffState {
  if (!raw || typeof raw !== 'object') return { dismissed: [] }
  const { week, pick, dismissed } = raw as Record<string, unknown>
  return {
    ...(typeof week === 'string' && DAY_RE.test(week) && { week }),
    ...(typeof pick === 'string' && { pick }),
    dismissed: Array.isArray(dismissed) ? dismissed.filter((x): x is string => typeof x === 'string').slice(-MAX_DISMISSED) : [],
  }
}

/**
 * This week's book to dust off: the want-to-read choice (readNextChoices:
 * no book 3 before book 2, nothing not out yet) that has waited longest and
 * that she hasn't said Not now to, once it has been on the shelf 14 days.
 * The week's pick stays the same all week; once she has said Not now to it
 * or started it, nothing shows until next Monday.
 */
export function dustOffPick(books: Book[], state: DustOffState, today = localDay()): Book | undefined {
  const choices = readNextChoices(books, today)
  if (state.week === weekOf(today) && state.pick) {
    if (state.dismissed.includes(state.pick)) return undefined
    return choices.find((b) => b.id === state.pick)
  }
  const oldest = choices.filter((b) => !state.dismissed.includes(b.id)).sort((a, b) => a.addedAt - b.addedAt)[0]
  if (!oldest || dayNumber(today) - dayNumber(addedDay(oldest)) < PILE_DAYS) return undefined
  return oldest
}

/** The state with this week's pick remembered. */
export const dustOffSeen = (state: DustOffState, book: Book, today = localDay()): DustOffState => ({
  ...state,
  week: weekOf(today),
  pick: book.id,
})

/** The state after Not now: gone for this week, and not picked again. */
export const dustOffDismiss = (state: DustOffState, book: Book, today = localDay()): DustOffState => ({
  week: weekOf(today),
  pick: book.id,
  dismissed: [...state.dismissed.filter((id) => id !== book.id), book.id].slice(-MAX_DISMISSED),
})

/** How long a book has waited, rounded down: "2 weeks", "5 months", "2 years". */
export function waitedText(book: Book, today = localDay()): string {
  const from = addedDay(book)
  const months = (+today.slice(0, 4) - +from.slice(0, 4)) * 12 + (+today.slice(5, 7) - +from.slice(5, 7)) - (+today.slice(8, 10) < +from.slice(8, 10) ? 1 : 0)
  const n = (k: number, unit: string) => `${k} ${unit}${k === 1 ? '' : 's'}`
  if (months >= 12) return n(Math.floor(months / 12), 'year')
  if (months >= 1) return n(months, 'month')
  return n(Math.floor((dayNumber(today) - dayNumber(from)) / 7), 'week')
}
