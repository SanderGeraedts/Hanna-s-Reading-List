import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { medalLine, metalFor, seriesReads, yearMedals } = await import('./medals')
const { sortBooks } = await import('./library')
const { arrangementSeparators } = await import('./separators')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, days: string[], extra: Partial<Book> = {}) =>
  book(id, { status: 'read', finished: days, readCount: days.length, ...extra })

describe('medals', () => {
  it('bronze for the first read, silver for the second, gold from the third', () => {
    expect([1, 2, 3, 7].map(metalFor)).toEqual(['bronze', 'silver', 'gold', 'gold'])
  })

  it("a series' medal goes by its least-read book", () => {
    expect(seriesReads([read('a', ['2026-01-01', '2026-02-01']), read('b', ['2026-03-01'])])).toBe(1)
    expect(seriesReads([read('a', ['2026-01-01', '2026-02-01']), read('b', ['2026-03-01', '2026-04-01'])])).toBe(2)
  })

  it('counts the medals books won in a year, each in the year of that read', () => {
    const shelf = [
      read('once', ['2026-02-01']),
      read('again', ['2025-05-01', '2026-03-01']), // bronze in 2025, silver in 2026
      read('lots', ['2024-01-01', '2025-01-01', '2026-01-01', '2026-06-01']), // gold twice in 2026
      // two reads from before days were noted count as the first two
      book('old', { status: 'read', readCount: 3, finished: ['2026-04-01'] }),
    ]
    expect(yearMedals(shelf, 2026).books).toEqual({ bronze: 1, silver: 1, gold: 3 })
    expect(yearMedals(shelf, 2025).books).toEqual({ bronze: 1, silver: 1, gold: 0 })
  })

  it('a series wins its medal in the year its last book needed is finished', () => {
    const saga = (i: number, days: string[]) => read(`s${i}`, days, { series: 'Saga', seriesIndex: i })
    const shelf = [saga(1, ['2025-03-01', '2026-02-01']), saga(2, ['2026-01-10', '2026-05-01'])]
    // first time through ends 2026-01-10, second 2026-05-01
    expect(yearMedals(shelf, 2026).series).toEqual({ bronze: 1, silver: 1, gold: 0 })
    expect(yearMedals(shelf, 2025).series).toEqual({ bronze: 0, silver: 0, gold: 0 })
    // an unfinished series wins nothing
    expect(yearMedals([...shelf, book('s3', { series: 'Saga', seriesIndex: 3 })], 2026).series.bronze).toBe(0)
  })

  it('writes the metals on one line, leaving out the ones with none', () => {
    expect(medalLine({ bronze: 28, silver: 3, gold: 1 })).toBe('🥉 28 · 🥈 3 · 🥇 1')
    expect(medalLine({ bronze: 0, silver: 2, gold: 0 })).toBe('🥈 2')
    expect(medalLine({ bronze: 0, silver: 0, gold: 0 })).toBe('')
  })

  it("puts the series' medal on its book nook", () => {
    const shelf = [
      read('a1', ['2026-01-01', '2026-02-01'], { series: 'Alpha', seriesIndex: 1 }),
      read('a2', ['2026-01-05', '2026-02-05'], { series: 'Alpha', seriesIndex: 2 }),
      read('b1', ['2026-01-01'], { series: 'Beta', seriesIndex: 1 }),
      book('b2', { series: 'Beta', seriesIndex: 2 }),
    ]
    const seps = [...arrangementSeparators(sortBooks(shelf, 'series'), 'series').values()]
    expect(seps.find((s) => s.label === 'Alpha')).toMatchObject({ complete: true, medal: 2 })
    expect(seps.find((s) => s.label === 'Beta')?.medal).toBeUndefined()
  })
})
