import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
const { grantWish, lengthOf, wishOptions, wishWeight } = await import('./wish')

const day = (d: string) => Date.parse(`${d}T12:00:00Z`)
const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#888888',
  status: 'want',
  addedAt: day('2026-10-01'),
  ...extra,
})
const TODAY = '2026-11-21'

describe('make a wish, version 2', () => {
  it('knows short and long books, by pages or by listening time', () => {
    expect(lengthOf(book('a', { pages: 250 }))).toBe('short')
    expect(lengthOf(book('b', { pages: 380 }))).toBe('medium')
    expect(lengthOf(book('c', { pages: 520 }))).toBe('long')
    expect(lengthOf(book('d', { formats: ['audiobook'], minutes: 13 * 60 }))).toBe('long')
    expect(lengthOf(book('e'))).toBeUndefined()
  })

  it('grants three books that meet every wish', () => {
    const choices = [
      book('s1', { pages: 200, language: 'en' }),
      book('s2', { pages: 210, language: 'en' }),
      book('s3', { pages: 220, language: 'en' }),
      book('s4', { pages: 230, language: 'de' }),
      book('l1', { pages: 600, language: 'en' }),
    ]
    const g = grantWish(choices, choices, { length: 'short', language: 'en' }, { today: TODAY })
    expect(g.exact).toBe(true)
    expect(g.books.map((x) => x.book.id).sort()).toEqual(['s1', 's2', 's3'])
  })

  it('offers the closest books when nothing meets every wish', () => {
    const choices = [book('a', { pages: 600, genres: ['Fantasy'] }), book('b', { pages: 200, genres: ['Romance'] })]
    const g = grantWish(choices, choices, { length: 'long', genre: 'Romance', language: 'de' }, { today: TODAY })
    expect(g.exact).toBe(false)
    expect(g.books.length).toBe(2)
  })

  it('shows others when wishing again, if there are enough', () => {
    const choices = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => book(id))
    const g = grantWish(choices, choices, {}, { avoid: ['a', 'b', 'c'], today: TODAY })
    expect(g.books.map((x) => x.book.id).sort()).toEqual(['d', 'e', 'f'])
  })

  it('favours books that waited long, authors she loves and series she enjoys', () => {
    const shelf = [
      book('old', { addedAt: day('2023-11-01') }),
      book('fresh'),
      book('loved', { authors: ['Fav Author'] }),
      book('fav-read', { authors: ['Fav Author'], status: 'read', readCount: 1, rating: 5 }),
      book('s1', { series: 'Saga', seriesIndex: 1, status: 'read', readCount: 1, rating: 4.5 }),
      book('s2', { series: 'Saga', seriesIndex: 2 }),
    ]
    expect(wishWeight(shelf[0], shelf, TODAY)).toMatchObject({ weight: 3, reasons: ['waited'] })
    expect(wishWeight(shelf[1], shelf, TODAY).weight).toBeLessThan(1.2)
    expect(wishWeight(shelf[2], shelf, TODAY).reasons).toEqual(['author'])
    expect(wishWeight(shelf[5], shelf, TODAY).reasons).toEqual(['series'])
  })

  it('lists the genres and languages to wish for, most common first', () => {
    const o = wishOptions([book('a', { genres: ['Romance'], language: 'en' }), book('b', { genres: ['Fantasy', 'Romance'], language: 'nl' })])
    expect(o.genres).toEqual(['Romance', 'Fantasy'])
    expect(o.languages.map((l) => l.code).sort()).toEqual(['en', 'nl'])
  })
})
