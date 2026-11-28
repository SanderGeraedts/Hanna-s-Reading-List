import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { allSeries, sortSeries } from './seriesPage'

let n = 0
const book = (title: string, extra: Partial<Book> = {}) =>
  ({ id: `b${n++}`, title, authors: ['Ann Author'], color: '#333', status: 'want', addedAt: 1, ...extra }) as Book

describe('the Series page (T-0132)', () => {
  const shelf = [
    book('Dune', { series: 'Dune', seriesIndex: 1, status: 'read', finished: ['2026-01-02'], authors: ['Frank Herbert'] }),
    book('Dune Messiah', { series: 'Dune', seriesIndex: 2, status: 'reading', authors: ['Frank Herbert'] }),
    book('God Emperor', { series: 'Dune', seriesIndex: 4, authors: ['Frank Herbert'] }),
    book('Alpha', { series: 'Alpha', seriesIndex: 1, status: 'read', finished: ['2026-05-01'], authors: ['Zed'] }),
    book('Alpha Two', { series: 'Alpha', seriesIndex: 2, status: 'read', finished: ['2026-05-03'], authors: ['Zed'] }),
    book('Lonely', { series: 'Lonely', seriesIndex: 1 }),
    book('Wish', { series: 'Alpha', seriesIndex: 3, wish: true }),
  ]

  it('shows every series of two books or more, A–Z, its books in order with the numbers it skips', () => {
    const rows = allSeries(shelf)
    expect(rows.map((r) => r.name)).toEqual(['Alpha', 'Dune'])
    const dune = rows.find((r) => r.name === 'Dune')!
    expect(dune.slots.map((s) => (s.book ? s.book.title : `#${s.index} missing`))).toEqual(['Dune', 'Dune Messiah', '#3 missing', 'God Emperor'])
    expect([dune.read, dune.total]).toEqual([1, 3])
    // the wishlist doesn't count
    expect(rows.find((r) => r.name === 'Alpha')!.total).toBe(2)
  })

  it('sorts as she chooses', () => {
    const rows = allSeries(shelf)
    expect(sortSeries(rows, 'az').map((r) => r.name)).toEqual(['Alpha', 'Dune'])
    // Dune is under way, Alpha is finished
    expect(sortSeries(rows, 'progress').map((r) => r.name)).toEqual(['Dune', 'Alpha'])
    expect(sortSeries(rows, 'author').map((r) => r.name)).toEqual(['Dune', 'Alpha'])
    expect(sortSeries(rows, 'recent').map((r) => r.name)).toEqual(['Alpha', 'Dune'])
  })
})

describe('Read the series opens the next unread book (T-0132)', async () => {
  const { nextInSeries } = await import('./seriesChallenge')
  it('picks the first book in series order she has not read', () => {
    const a = book('One', { series: 'S', seriesIndex: 1, status: 'read', finished: ['2026-01-01'] })
    const b = book('Three', { series: 'S', seriesIndex: 3 })
    const c = book('Two', { series: 'S', seriesIndex: 2 })
    expect(nextInSeries({ books: [b, a, c] }, [a, b, c])?.title).toBe('Two')
    const done = book('Done', { series: 'T', seriesIndex: 1, status: 'read', finished: ['2026-01-01'] })
    expect(nextInSeries({ books: [done] }, [done])).toBeUndefined()
  })
})
