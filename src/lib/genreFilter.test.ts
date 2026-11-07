import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { NO_GENRE, filterByGenre, genreOptions, reorderShown } from './genreFilter'

const book = (id: string, genres?: string[]): Book => ({
  id,
  title: id,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...(genres && { genres }),
})

const shelf = [
  book('a', ['Fantasy', 'Adventure']),
  book('b', ['Crime']),
  book('c', ['Fantasy']),
  book('d'),
  book('e', ['Fantasy']),
]

describe('filtering the shelf by genre (#41)', () => {
  it('lists every genre a book has, most books first, then the books without one', () => {
    expect(genreOptions(shelf).map((o) => [o.label, o.count])).toEqual([
      ['Fantasy', 3],
      ['Adventure', 1],
      ['Crime', 1],
      ['No genre', 1],
    ])
  })

  it('shows the books of any of their genres, in shelf order', () => {
    expect(filterByGenre(shelf, 'Fantasy').map((b) => b.id)).toEqual(['a', 'c', 'e'])
    expect(filterByGenre(shelf, 'Adventure').map((b) => b.id)).toEqual(['a'])
    expect(filterByGenre(shelf, NO_GENRE).map((b) => b.id)).toEqual(['d'])
    expect(filterByGenre(shelf, null)).toBe(shelf)
  })

  it('moving books while filtered leaves the hidden books where they were', () => {
    // the Fantasy books a, c, e were dragged into e, a, c
    expect(reorderShown(['a', 'b', 'c', 'd', 'e'], ['e', 'a', 'c'])).toEqual(['e', 'b', 'a', 'd', 'c'])
  })
})
