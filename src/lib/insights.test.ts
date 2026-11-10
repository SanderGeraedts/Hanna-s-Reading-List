import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const {
  breakdown,
  goalProgress,
  lentOut,
  monthlyCounts,
  onThisDay,
  readingStreak,
  records,
  seriesProgress,
  wantPile,
} = await import('./insights')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, day: string, extra: Partial<Book> = {}) =>
  book(id, { status: 'read', finished: [day], ...extra })

const NOW = new Date(2026, 10, 7) // 7 November 2026

describe('dashboard extras (#66)', () => {
  it('counts books per month', () => {
    const counts = monthlyCounts([read('a', '2026-01-05'), read('b', '2026-01-20'), read('c', '2025-03-01')], 2026)
    expect(counts[0]).toBe(2)
    expect(counts.reduce((a, b) => a + b)).toBe(2)
  })

  it('groups what she read, folding the smallest groups into Other', () => {
    const shelf = [
      read('a', '2026-01-01', { genres: ['Fantasy'], language: 'de', formats: ['paperback'] }),
      read('b', '2026-02-01', { genres: ['Fantasy', 'Romance'], language: 'en', formats: ['storytel'] }),
      read('c', '2026-03-01', { language: 'de' }),
    ]
    const year = { kind: 'year', year: 2026 } as const
    expect(breakdown(shelf, year, 'genre')).toEqual([
      { label: 'Fantasy', count: 2 },
      { label: 'Romance', count: 1 },
      { label: 'No genre', count: 1 },
    ])
    expect(breakdown(shelf, year, 'language')[0]).toEqual({ label: 'German', count: 2 })
    expect(breakdown(shelf, year, 'genre', 2)).toEqual([
      { label: 'Fantasy', count: 2 },
      { label: 'Other', count: 2 },
    ])
  })

  it('works out how long the pile would take', () => {
    const shelf = [
      ...Array.from({ length: 12 }, (_, i) => read(`r${i}`, `2026-${String((i % 10) + 1).padStart(2, '0')}-01`)),
      book('w1', { pages: 300 }),
      book('w2', { formats: ['storytel'], minutes: 600, pages: 600 }),
    ]
    const pile = wantPile(shelf, NOW)
    expect(pile).toMatchObject({ books: 2, pages: 300, minutes: 600, perMonth: 1, months: 2 })
    expect(wantPile([book('w')], NOW).months).toBeUndefined()
  })

  it('lists lent books, longest away first', () => {
    const shelf = [
      book('a', { lent: { to: 'Lisa', since: '2026-11-01' } }),
      book('b', { lent: { to: 'Tom', since: '2026-10-01' } }),
      book('c', { lent: { to: '' } }),
    ]
    expect(lentOut(shelf, NOW).map((l) => [l.to, l.days])).toEqual([
      ['Tom', 37],
      ['Lisa', 6],
      ['someone', undefined],
    ])
  })

  it('shows progress for series she has started', () => {
    const pj = (n: number, extra: Partial<Book> = {}) =>
      book(`p${n}`, { title: `Percy Jackson, Teil ${n}: T${n}`, authors: ['Rick Riordan'], ...extra })
    const kc = (n: number) => book(`k${n}`, { title: `Die Kane-Chroniken ${n}: T${n}`, authors: ['Rick Riordan'] })
    const progress = seriesProgress([pj(2, { status: 'reading' }), pj(1, { status: 'read' }), pj(3), kc(1), kc(2)])
    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({ name: 'Percy Jackson', read: 1, total: 3 })
    expect(progress[0].books.map((b) => b.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('finds the records', () => {
    const shelf = [
      read('long', '2026-01-01', { pages: 800, authors: ['A'] }),
      read('short', '2026-02-01', { pages: 90, authors: ['A'] }),
      read('again', '2026-03-01', { pages: 200, readCount: 3, authors: ['B'] }),
      read('audio', '2026-03-01', { formats: ['storytel'], minutes: 900, pages: 900 }),
    ]
    const rec = records(shelf, { kind: 'all' })
    expect(rec.longest?.id).toBe('long')
    expect(rec.shortest?.id).toBe('short')
    expect(rec.longestListen?.id).toBe('audio')
    expect(rec.topAuthor).toEqual({ name: 'A', books: 2 })
    expect(rec.mostReread).toMatchObject({ times: 3 })
    expect(rec.mostReread?.book.id).toBe('again')
  })

  it('tells whether the goal is ahead or behind', () => {
    // 1 July is about half way through the year
    const mid = new Date(2026, 6, 2)
    expect(goalProgress(30, 50, 2026, mid).ahead).toBe(5)
    expect(goalProgress(20, 50, 2026, mid).ahead).toBe(-5)
  })

  it('counts the days in a row with reading (#75)', () => {
    const log = (id: string, ...days: string[]) =>
      book(id, { status: 'reading', readingLog: Object.fromEntries(days.map((d) => [d, 0.01])) })
    // NOW is 7 November: nothing yet today, so the streak runs up to the 6th, across the month end
    const shelf = [log('a', '2026-11-06', '2026-11-05'), log('b', '2026-11-04', '2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28')]
    expect(readingStreak(shelf, NOW)).toEqual({ current: 3, best: 4, today: false })
    expect(readingStreak([...shelf, log('c', '2026-11-07')], NOW)).toEqual({ current: 4, best: 4, today: true })
    // a day missed ends it
    expect(readingStreak([log('a', '2026-11-05')], NOW).current).toBe(0)
    // finishing without moving the progress isn't a reading day
    expect(readingStreak([read('r', '2026-11-06')], NOW).current).toBe(0)
  })

  it('finds books finished on this day in earlier years', () => {
    const shelf = [read('a', '2024-11-07'), read('b', '2026-11-07'), read('c', '2025-11-08')]
    expect(onThisDay(shelf, NOW).map((f) => [f.book.id, f.year])).toEqual([['a', 2024]])
  })
})

describe('reading goals on the server (#66)', async () => {
  vi.doUnmock('#/server/shelf')
  const { cleanGoals } = await vi.importActual<typeof import('#/server/shelf')>('#/server/shelf')

  it('keeps only sensible year goals', () => {
    expect(cleanGoals({ '2026': 50, '2025': 0, x: 3, '2024': 2.5, '2023': 12 })).toEqual({ '2026': 50, '2023': 12 })
    expect(cleanGoals(null)).toEqual({})
    expect(cleanGoals('50')).toEqual({})
  })
})
