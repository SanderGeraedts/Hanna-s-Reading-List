import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanRating, cleanSpice, ratingText, spiceText, topRated } = await import('./ratings')
const { mergeBooks } = await import('./merge')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  ...extra,
})

describe('ratings (#100)', () => {
  it('are half stars from ½ to 5, and 0 is no rating', () => {
    expect(cleanRating(3.3)).toBe(3.5)
    expect(cleanRating(3.2)).toBe(3)
    expect(cleanRating(7)).toBe(5)
    expect(cleanRating(0)).toBeUndefined()
    expect(cleanRating('4')).toBeUndefined()
    expect(ratingText(4.5)).toBe('4½ stars')
    expect(ratingText(1)).toBe('1 star')
    expect(ratingText(undefined)).toBe('Not rated')
  })

  it('top 5: best rated first, ties by latest finish, only books read in the period', () => {
    const books = [
      book('a', { rating: 4, finished: ['2026-03-01'] }),
      book('b', { rating: 5, finished: ['2026-02-01'] }),
      book('c', { rating: 4, finished: ['2026-05-01'] }),
      book('d', { finished: ['2026-05-02'] }), // not rated
      book('e', { rating: 5, finished: ['2025-12-01'] }),
      book('f', { rating: 3, status: 'reading' }), // not finished
      book('g', { rating: 2, finished: ['2026-01-01'] }),
      book('h', { rating: 1, finished: ['2026-01-02'] }),
      book('i', { rating: 0.5, finished: ['2026-01-03'] }),
    ]
    expect(topRated(books, { kind: 'year', year: 2026 }).map((b) => b.id)).toEqual(['b', 'c', 'a', 'g', 'h'])
    expect(topRated(books, { kind: 'all' }).map((b) => b.id)).toEqual(['b', 'e', 'c', 'a', 'g'])
    expect(topRated(books, { kind: 'month', year: 2026, month: 5 }).map((b) => b.id)).toEqual(['c'])
  })

  it('spice is whole peppers from 1 to 5', () => {
    expect(cleanSpice(3.4)).toBe(3)
    expect(cleanSpice(3.5)).toBe(4)
    expect(cleanSpice(9)).toBe(5)
    expect(cleanSpice(0)).toBeUndefined()
    expect(spiceText(2)).toBe('Spice 2 of 5')
    expect(spiceText(undefined)).toBe('No spice level')
  })

  it('a merge keeps the rating and the spice', () => {
    expect(mergeBooks(book('a'), book('b', { spice: 2 })).spice).toBe(2)
    expect(mergeBooks(book('a'), book('b', { rating: 4 })).rating).toBe(4)
    expect(mergeBooks(book('a', { rating: 3 }), book('b', { rating: 4 })).rating).toBe(3)
  })
})
