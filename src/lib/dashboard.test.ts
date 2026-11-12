import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { statusPatch } = await import('./library')
const { mergeBooks } = await import('./merge')
const { finishedByDay, monthWeeks, periodStats, readingYears } = await import('./stats')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('finish dates (#59)', () => {
  it('are noted each time a book is finished', () => {
    const once = { ...book('a', { status: 'reading' }), ...statusPatch(book('a', { status: 'reading' }), 'read', '2026-03-04') }
    expect(once.finished).toEqual(['2026-03-04'])
    const again = { ...once, ...statusPatch(once, 'reading') }
    expect(again.finished).toEqual(['2026-03-04'])
    expect({ ...again, ...statusPatch(again, 'read', '2026-11-01') }.finished).toEqual(['2026-03-04', '2026-11-01'])
  })

  it('are combined when merging two copies', () => {
    const m = mergeBooks(book('a', { finished: ['2026-05-01'] }), book('b', { finished: ['2025-01-02', '2026-05-01'] }))
    expect(m.finished).toEqual(['2025-01-02', '2026-05-01'])
  })
})

describe('books read in a period (#59)', () => {
  const shelf = [
    book('march', { status: 'read', finished: ['2026-03-10'], pages: 300 }),
    book('twice', { status: 'read', readCount: 2, finished: ['2025-12-30', '2026-03-02'], pages: 200 }),
    book('audio', { status: 'read', finished: ['2026-07-01'], formats: ['storytel'], minutes: 600, pages: 600 }),
    // finished before dates were noted
    book('old', { status: 'read', pages: 100 }),
    book('unread', { pages: 999 }),
  ]

  it('counts all time, dated or not', () => {
    const s = periodStats(shelf, { kind: 'all' })
    expect(s.books).toBe(4)
    expect(s.reads).toBe(5)
    expect(s.pages).toBe(300 + 200 * 2 + 100)
    expect(s.minutes).toBe(600)
  })

  it('counts a year and a month by the day finished', () => {
    const year = periodStats(shelf, { kind: 'year', year: 2026 })
    expect(year.list.map((b) => b.id)).toEqual(['audio', 'march', 'twice'])
    expect(year.reads).toBe(3)
    const march = periodStats(shelf, { kind: 'month', year: 2026, month: 3 })
    expect(march.books).toBe(2)
    expect(periodStats(shelf, { kind: 'month', year: 2026, month: 4 }).books).toBe(0)
  })

  it('lists the years with reading', () => {
    expect(readingYears(shelf, new Date(2026, 10, 7))).toEqual([2026, 2025])
  })

  it('puts the books on the days of the calendar', () => {
    const march = finishedByDay(shelf, 2026, 3)
    expect([...march.keys()].sort((a, b) => a - b)).toEqual([2, 10])
    expect(march.get(10)!.map((b) => b.id)).toEqual(['march'])
  })

  it('lays out a month starting on Monday', () => {
    // 1 November 2026 is a Sunday
    const weeks = monthWeeks(2026, 11)
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1])
    expect(weeks.at(-1)!.filter((d) => d !== null).at(-1)).toBe(30)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
})
