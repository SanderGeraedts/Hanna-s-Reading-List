import type { Book } from '../library'
import { allFinishes } from '../stats'
import { bookMinutes } from '../creatures/cookies'
import { FINISH_COPIES, MINUTES_PER_COPY, OPENING_COPIES, SHOP_START } from './numbers'

/**
 * What her reading puts on the shop's shelves (T-0113, D-0084 §1).
 *
 * The shop sells the books she has read, by name. A book becomes a **title**
 * the day she first finishes it; the minutes she spends on it print the
 * **copies**. Nothing here is stored: a title and every copy it ever had are
 * worked out again from her shelf and her reading log each time, exactly the
 * way the cookies are (`creatures/cookies.ts`, D-0033 §1). The shop never
 * writes to a book, and it reads nothing of the creatures or the garden.
 *
 * The rules, in her words:
 *
 * - **Every six minutes of reading prints a copy** of the book she was reading.
 * - **Finishing a book prints twenty more** of it, and puts it in the shop
 *   under its own name. Reading it again prints twenty more again.
 * - **Minutes she read before the title opened are not lost:** they are banked
 *   and arrive together on the day she finishes it, so a book read over a week
 *   lands on the shelf as a proper pile and not as one copy.
 * - **Nothing printed before the shop opened counts,** with one exception: a
 *   book she had already read when the shop opened arrives with one copy on
 *   opening day. That is the whole of the back catalogue's gift — a shop with
 *   something on the shelves on the first morning, not years of trade.
 */

/** A book the shop sells, under its own name. */
export interface Title {
  /** the book's id */
  id: string
  book: Book
  /** the day it first went on sale: the day she first finished it, or opening day */
  openDay: string
  /** she had already read it when the shop opened */
  backlist: boolean
}

/** Copies of one title arriving on one day. */
export interface Print {
  day: string
  id: string
  copies: number
}

export interface Stocking {
  /** every title, in the order they went on sale (then by book id, so two devices agree) */
  titles: Title[]
  /** every arrival of copies, oldest first */
  prints: Print[]
}

const later = (a: string, b: string) => (a > b ? a : b)

/**
 * Her shelf as a stocking plan: which titles the shop sells and when each
 * batch of copies arrives. A pure function of her books alone — no clock, no
 * log, nothing of the shop's own.
 */
export function stocking(books: readonly Book[], start: string = SHOP_START): Stocking {
  const titles: Title[] = []
  const prints: Print[] = []

  // every finish of every book, grouped by book: a finish with no day at all is
  // a book she read long before any of this, so it counts as backlist only
  const finishDays = new Map<string, string[]>()
  const dayless = new Set<string>()
  for (const f of allFinishes(books as Book[])) {
    if (!f.day) {
      dayless.add(f.book.id)
      continue
    }
    const days = finishDays.get(f.book.id)
    if (days) days.push(f.day)
    else finishDays.set(f.book.id, [f.day])
  }

  for (const book of books) {
    const days = (finishDays.get(book.id) ?? []).slice().sort()
    const everRead = days.length > 0 || dayless.has(book.id)
    // a book she has never finished is not in the shop yet; her minutes on it
    // are not lost, they simply arrive the day she does finish it
    if (!everRead) continue

    const firstFinish = days[0]
    const backlist = firstFinish === undefined || firstFinish < start
    const openDay = backlist ? start : firstFinish

    titles.push({ id: book.id, book, openDay, backlist })

    if (backlist) prints.push({ day: openDay, id: book.id, copies: OPENING_COPIES })
    for (const day of days) if (day >= start) prints.push({ day, id: book.id, copies: FINISH_COPIES })

    // the minutes: everything read before the title opened arrives on opening day
    const length = bookMinutes(book)
    const perDay = new Map<string, number>()
    for (const [day, share] of Object.entries(book.readingLog ?? {})) {
      if (!(share > 0) || day < start) continue
      const on = later(day, openDay)
      perDay.set(on, (perDay.get(on) ?? 0) + share * length)
    }
    // the running total is rounded down once, so 3 + 3 minutes on two days still print a copy
    let minutes = 0
    let printed = 0
    for (const day of [...perDay.keys()].sort()) {
      minutes += perDay.get(day)!
      // a tiny margin, so 5.9999999 minutes from shares like 0.3333 don't lose a copy
      const now = Math.floor(minutes / MINUTES_PER_COPY + 1e-9)
      if (now > printed) {
        prints.push({ day, id: book.id, copies: now - printed })
        printed = now
      }
    }
  }

  titles.sort((a, b) => (a.openDay < b.openDay ? -1 : a.openDay > b.openDay ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  prints.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { titles, prints }
}
