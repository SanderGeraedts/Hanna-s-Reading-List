import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { bookMinutes, earnedThrough, minutesText, readingDays, thisWeek } from './cookies'
import { CREATURES_START } from './numbers'
import { addDays } from './days'

/**
 * Cookies from the reading log (T-0029, D-0033 §2): every count here changes
 * her balance, so each rule has a test (D-0033 Consequences).
 */

const S = CREATURES_START
const day = (n: number) => addDays(S, n)

let next = 0
function book(over: Partial<Book> = {}): Book {
  return { id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'reading', addedAt: 0, ...over }
}

const earned = (books: Book[], through = day(30)) => earnedThrough(readingDays(books), through)

describe('a book’s length in minutes', () => {
  it('is pages × 1.5 for a book on paper', () => {
    expect(bookMinutes(book({ pages: 300 }))).toBe(450)
  })
  it('is its listening minutes for a book she only listens to', () => {
    expect(bookMinutes(book({ formats: ['audiobook'], minutes: 600, pages: 600 }))).toBe(600)
    expect(bookMinutes(book({ formats: ['storytel'], minutes: 480 }))).toBe(480)
  })
  it('counts a book without any length as 280 pages', () => {
    expect(bookMinutes(book())).toBe(420)
    expect(bookMinutes(book({ formats: ['audiobook'] }))).toBe(420)
  })
  it('keeps the pages of a book she has on paper as well as an audiobook', () => {
    expect(bookMinutes(book({ formats: ['paperback', 'audiobook'], pages: 200, minutes: 500 }))).toBe(300)
  })
})

describe('cookies earned', () => {
  it('gives 1 cookie per 5 minutes from pages read (a page ≈ 1.5 min)', () => {
    // 10 % of 300 pages = 30 pages = 45 minutes = 9 cookies
    expect(earned([book({ pages: 300, readingLog: { [day(0)]: 0.1 } })])).toBe(9)
  })

  it('gives listen-only minutes as they are', () => {
    // a quarter of a 400-minute audiobook = 100 minutes = 20 cookies
    expect(earned([book({ formats: ['storytel'], minutes: 400, readingLog: { [day(1)]: 0.25 } })])).toBe(20)
  })

  it('counts a book without a length as 280 pages', () => {
    // 10 % of 280 pages = 28 pages = 42 minutes = 8 cookies
    expect(earned([book({ readingLog: { [day(0)]: 0.1 } })])).toBe(8)
  })

  it('gives a sleep read half', () => {
    const awake = book({ pages: 400, readingLog: { [day(0)]: 0.1 } })
    const asleep = book({ pages: 400, readingLog: { [day(0)]: 0.1 }, sleepRead: true })
    // 40 pages = 60 minutes: 12 awake, 6 asleep
    expect(earned([awake])).toBe(12)
    expect(earned([asleep])).toBe(6)
  })

  it('gives 10 cookies for each finished book, also a re-read, and half for a sleep read', () => {
    expect(earned([book({ status: 'read', finished: [day(2)] })])).toBe(10)
    expect(earned([book({ status: 'read', readCount: 2, finished: [day(2), day(5)] })])).toBe(20)
    expect(earned([book({ status: 'read', finished: [day(2)], sleepRead: true })])).toBe(5)
  })

  it('earns nothing before the start day', () => {
    const b = book({ pages: 300, status: 'read', finished: [day(-1)], readingLog: { [day(-3)]: 0.5, [day(-1)]: 0.5 } })
    expect(earned([b])).toBe(0)
    // and the balance starts at 0 on the start day itself
    expect(earnedThrough(readingDays([b]), S)).toBe(0)
  })

  it('goes down when she fixes a past day', () => {
    const before = book({ id: 'fix', pages: 200, readingLog: { [day(0)]: 0.2, [day(1)]: 0.2 } })
    const after = { ...before, readingLog: { [day(0)]: 0.05, [day(1)]: 0.2 } }
    expect(earned([before])).toBe(24)
    expect(earned([after])).toBeLessThan(earned([before]))
    expect(earned([after])).toBe(15)
  })

  it('rounds on the total, so minutes on different days add up', () => {
    // 3 minutes on each of two days: 6 minutes = 1 cookie (0 + 0 if each day were rounded)
    const b = book({ formats: ['audiobook'], minutes: 100, readingLog: { [day(0)]: 0.03, [day(1)]: 0.03 } })
    expect(earned([b], day(0))).toBe(0)
    expect(earned([b], day(1))).toBe(1)
  })

  it('loses nothing to shares like a third', () => {
    // three thirds of a 15-minute listen: 15 minutes = 3 cookies, not 2
    const b = book({ formats: ['audiobook'], minutes: 15, readingLog: { [day(0)]: 0.3333, [day(1)]: 0.3333, [day(2)]: 0.3334 } })
    expect(earned([b])).toBe(3)
  })
})

describe('This week', () => {
  const books = [
    book({ pages: 300, readingLog: { [day(0)]: 0.1, [day(2)]: 0.05, [day(3)]: 0.01 } }),
    book({ pages: 200, readingLog: { [day(2)]: 0.1 }, sleepRead: true }),
    book({ title: 'The Hobbit', pages: 310, status: 'read', finished: [day(3)], readingLog: { [day(3)]: 0.2 } }),
  ]

  it('has a line per reading day, newest first, and the lines add up exactly to the week', () => {
    const week = thisWeek(readingDays(books), day(3))
    expect(week.lines.map((l) => l.day)).toEqual([day(3), day(2), day(0)])
    expect(week.lines.reduce((n, l) => n + l.cookies, 0)).toBe(week.total)
    expect(week.total).toBe(earned(books, day(3)))
    expect(week.lines[0].finished.map((b) => b.title)).toEqual(['The Hobbit'])
    expect(week.lines[1].sleepMinutes).toBeCloseTo(30)
  })

  it('leaves out days older than 7 days', () => {
    const week = thisWeek(readingDays(books), day(9))
    expect(week.lines.map((l) => l.day)).toEqual([day(3)])
  })

  it('gives a day with only a sleep read half what the same minutes give otherwise', () => {
    const asleep = thisWeek(readingDays([book({ pages: 200, readingLog: { [day(1)]: 0.2 }, sleepRead: true })]), day(1))
    const awake = thisWeek(readingDays([book({ pages: 200, readingLog: { [day(1)]: 0.2 } })]), day(1))
    expect(awake.lines[0].cookies).toBe(12)
    expect(asleep.lines[0].cookies).toBe(6)
  })

  it('is empty with no reading this week', () => {
    expect(thisWeek(readingDays([]), day(1))).toEqual({ lines: [], total: 0 })
  })

  it('writes minutes as whole minutes, with hours from 60 on', () => {
    expect(minutesText(44.6)).toBe('45 min')
    expect(minutesText(65)).toBe('1 h 05 min')
    expect(minutesText(130)).toBe('2 h 10 min')
  })
})

describe('cookies edge cases (tester)', () => {
  it('takes a finish treat back when the finish is moved to before the start', () => {
    const b = book({ id: 'moved', status: 'read', pages: 100, finished: [day(1)], readingLog: { [day(1)]: 0.1 } })
    // 15 minutes = 3, + 10
    expect(earned([b])).toBe(13)
    expect(earned([{ ...b, finished: [day(-1)] }])).toBe(3)
  })

  it('halves each sleep-read finish without losing half cookies over several', () => {
    const sleepy = (id: string, d: string) => book({ id, status: 'read', sleepRead: true, finished: [d] })
    expect(earned([sleepy('s1', day(0)), sleepy('s2', day(1)), sleepy('s3', day(2))])).toBe(15)
  })

  it('ignores log entries that are 0, negative or not a number', () => {
    const b = book({ pages: 200, readingLog: { [day(0)]: 0, [day(1)]: -0.5, [day(2)]: Number.NaN, [day(3)]: 0.1 } })
    // only day 3: 20 pages × 1.5 = 30 minutes = 6
    expect(earned([b])).toBe(6)
    expect([...readingDays([b]).keys()]).toEqual([day(3)])
  })

  it('counts a day only once it has come (a log entry dated after today waits)', () => {
    const b = book({ pages: 200, readingLog: { [day(0)]: 0.1, [day(5)]: 0.1 } })
    expect(earned([b], day(4))).toBe(6)
    expect(earned([b], day(5))).toBe(12)
  })
})
