import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { MINUTES_GOAL, MINUTES_MIN_DAYS, MINUTES_PER_PAGE, bookMinutes, daysInMonth, minutesByDay, minutesMonth, minutesYear } from './minutesChallenge'

/** Minutes a day (T-0091, D-0061 §3). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'reading',
  addedAt: 0,
  ...extra,
})

const paper = (id: string, pages: number, log: Record<string, number>) => book(id, { pages, readingLog: log })
const listen = (id: string, minutes: number, log: Record<string, number>) =>
  book(id, { minutes, pages: minutes, format: 'audiobook', formats: ['audiobook'], readingLog: log })

const dayOf = (shelf: Book[], day: string) => minutesByDay(shelf).get(day) ?? 0

describe('minutes a day: how a day becomes minutes', () => {
  it('a paper page is 1.5 minutes', () => {
    expect(MINUTES_PER_PAGE).toBe(1.5)
    expect(dayOf([paper('p', 300, { '2026-03-14': 0.5 })], '2026-03-14')).toBe(225)
  })

  it('a book she only listens to brings its real minutes', () => {
    expect(dayOf([listen('l', 600, { '2026-03-14': 0.1 })], '2026-03-14')).toBeCloseTo(60, 6)
  })

  it('a book with neither pages nor minutes brings nothing', () => {
    expect(dayOf([book('x', { readingLog: { '2026-03-14': 0.5 } })], '2026-03-14')).toBe(0)
    expect(bookMinutes(book('x'))).toBe(0)
  })

  it('exactly 20 minutes counts, 19.9 does not', () => {
    const just = minutesMonth([paper('a', 100, { '2026-03-01': 0.2 } /* 30 min */)], 2026, 3, '2026-03-31')
    expect(just.days[0].reached).toBe(true)
    // 19.9 minutes: 0.199 of a 100-page book is 29.85 min, so use minutes directly
    const under = minutesMonth([listen('u', 100, { '2026-03-01': 0.199 })], 2026, 3, '2026-03-31')
    expect(Math.round(under.days[0].minutes * 10) / 10).toBe(19.9)
    expect(under.days[0].reached).toBe(false)
    expect(MINUTES_GOAL).toBe(20)
  })

  it('two books on one day add up over the line', () => {
    const shelf = [paper('a', 100, { '2026-03-01': 0.08 }), listen('b', 60, { '2026-03-01': 0.14 })]
    const m = minutesMonth(shelf, 2026, 3, '2026-03-31')
    expect(m.days[0].minutes).toBeGreaterThanOrEqual(20)
    expect(m.days[0].reached).toBe(true)
  })
})

describe('minutes a day: the month grid', () => {
  it('keeps 31 January and 1 February in their own months, with the right number of cells', () => {
    const shelf = [paper('a', 100, { '2026-01-31': 0.5, '2026-02-01': 0.5 })]
    const jan = minutesMonth(shelf, 2026, 1, '2026-12-31')
    const feb = minutesMonth(shelf, 2026, 2, '2026-12-31')
    expect(jan.days).toHaveLength(31)
    expect(feb.days).toHaveLength(28)
    expect(jan.days[30].reached).toBe(true)
    expect(feb.days[0].reached).toBe(true)
    expect(jan.reached).toBe(1)
    expect(minutesMonth(shelf, 2026, 4, '2026-12-31').days).toHaveLength(30)
  })

  it('takes the leap day and leaves a day that never happened out', () => {
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(minutesMonth([], 2028, 2, '2028-12-31').days).toHaveLength(29)
    const bad = paper('bad', 100, { '2027-02-29': 1 })
    expect(minutesByDay([bad]).size).toBe(0)
    for (let m = 1; m <= 12; m++) expect(minutesMonth([bad], 2027, m, '2027-12-31').reached).toBe(0)
  })

  it('marks today and the days still to come', () => {
    const m = minutesMonth([], 2026, 3, '2026-03-10')
    expect(m.days[9].today).toBe(true)
    expect(m.days[9].future).toBe(false)
    expect(m.days[10].future).toBe(true)
    expect(m.happened).toBe(10)
  })
})

describe('minutes a day: the year score', () => {
  it('counts days reached against the days that have happened', () => {
    const log = Object.fromEntries(['01', '02', '03', '04', '05'].map((d) => [`2026-01-${d}`, 0.5]))
    const shelf = [paper('a', 100, log)]
    expect(minutesYear(shelf, 2026, '2026-01-05')).toMatchObject({ done: 5, goal: 5 })
    expect(minutesYear(shelf, 2026, '2026-01-06')).toMatchObject({ done: 5, goal: 6, complete: false })
  })

  it('needs four clean weeks before it is finished, so one good day on 1 January is not a medal', () => {
    const days = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, 0.5]),
      )
    expect(minutesYear([paper('a', 100, days(1))], 2026, '2026-01-01').complete).toBe(false)
    expect(minutesYear([paper('a', 100, days(27))], 2026, '2026-01-27').complete).toBe(false)
    expect(minutesYear([paper('a', 100, days(28))], 2026, '2026-01-28')).toEqual({ done: 28, goal: 28, complete: true })
    expect(MINUTES_MIN_DAYS).toBe(28)
  })

  it('an empty year is 0 of 0 and not complete', () => {
    expect(minutesYear([], 2027, '2026-11-23')).toEqual({ done: 0, goal: 0, complete: false })
  })
})
