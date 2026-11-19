import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { monthReleases, monthSummary, releaseOf, summaryText, yearLevels } = await import('./calendarPage')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const today = '2026-11-20'

describe('the Calendar page', () => {
  it('knows how exactly a coming book is known, and leaves out books already out', () => {
    expect(releaseOf(book('d', { published: '2027-03-12' }), today)).toMatchObject({ precision: 'day', when: '2027-03-12' })
    expect(releaseOf(book('s', { releaseDate: '2026-12-01' }), today)).toMatchObject({ precision: 'day' })
    expect(releaseOf(book('m', { published: '2027-03' }), today)).toMatchObject({ precision: 'month', when: '2027-03' })
    expect(releaseOf(book('y', { published: '2027' }), today)).toMatchObject({ precision: 'year', when: '2027' })
    expect(releaseOf(book('old', { published: '2020-05-01' }), today)).toBeUndefined()
    expect(releaseOf(book('thisyear', { published: '2026' }), today)).toBeUndefined()
  })

  it('puts exact releases on their day and vague ones above the month, never on a wrong day', () => {
    const shelf = [
      book('day', { published: '2027-03-12' }),
      book('month', { published: '2027-03' }),
      book('year', { published: '2027' }),
    ]
    const march = monthReleases(shelf, 2027, 3, today)
    expect([...march.byDay.entries()].map(([d, bs]) => [d, bs.map((b) => b.id)])).toEqual([[12, ['day']]])
    expect(march.vague.map((v) => `${v.book.id}:${v.text}`)).toEqual(['month:coming this month'])
    expect(monthReleases(shelf, 2027, 1, today).vague.map((v) => `${v.book.id}:${v.text}`)).toEqual(['year:sometime in 2027'])
  })

  it("sums up a month: finishes, pages, listening and every day with any reading", () => {
    const shelf = [
      book('p', { pages: 300, finished: ['2026-11-10'], readingLog: { '2026-11-01': 0.5, '2026-11-10': 0.5 } }),
      book('a', { formats: ['storytel'], minutes: 600, readingLog: { '2026-11-02': 0.1, '2026-10-30': 0.9 } }),
      book('tiny', { pages: 400, readingLog: { '2026-11-03': 0.001 } }),
    ]
    const s = monthSummary(shelf, 2026, 11)
    expect(s).toEqual({ finished: 1, pages: 300, minutes: 60, days: 4 })
    expect(summaryText(s)).toBe('1 book finished · 300 pages · 1 h listened · 4 reading days')
  })

  it('gives each reading day of the year a level for its dot', () => {
    const levels = yearLevels([book('p', { pages: 300, readingLog: { '2026-01-01': 0.01, '2026-01-02': 0.5 } })], 2026)
    expect(levels.get('2026-01-01')).toBe(1)
    expect(levels.get('2026-01-02')).toBe(4)
    expect(levels.has('2026-01-03')).toBe(false)
  })
})
