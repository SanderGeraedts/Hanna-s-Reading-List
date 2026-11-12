import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanReleaseDate, countdownText, isUpcoming, releasePatch, releasedBooks, upcomingBooks } = await import(
  './upcoming'
)

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const today = '2026-11-12'

describe('upcoming releases (#103)', () => {
  it('a book is upcoming until its release day', () => {
    expect(isUpcoming(book('a', { releaseDate: '2026-11-13' }), today)).toBe(true)
    expect(isUpcoming(book('a', { releaseDate: today }), today)).toBe(false)
    expect(isUpcoming(book('a'), today)).toBe(false)
  })

  it('lists them first to come out first, and finds the ones out today', () => {
    const books = [
      book('late', { releaseDate: '2027-02-01' }),
      book('soon', { releaseDate: '2026-11-20' }),
      book('out', { releaseDate: today }),
      book('shelf'),
    ]
    expect(upcomingBooks(books, today).map((b) => b.id)).toEqual(['soon', 'late'])
    expect(releasedBooks(books, today).map((b) => b.id)).toEqual(['out'])
  })

  it('on release day it goes onto the shelf as a new book', () => {
    const patch = releasePatch(book('a', { releaseDate: today }), 123)
    expect(patch).toEqual({ releaseDate: undefined, addedAt: 123, published: today, year: 2026 })
    expect(releasePatch(book('a', { releaseDate: today, published: '2026-11', year: 2026 }), 1).published).toBe('2026-11')
  })

  it('counts down', () => {
    expect(countdownText('2026-11-13', today)).toBe('Tomorrow')
    expect(countdownText('2026-11-15', today)).toBe('In 3 days')
    expect(countdownText('2026-11-26', today)).toBe('In 2 weeks')
    expect(countdownText('2027-03-12', today)).toBe('In 4 months')
  })

  it('reads release days defensively', () => {
    expect(cleanReleaseDate('2026-12-01T00:00:00Z')).toBe('2026-12-01')
    expect(cleanReleaseDate('soon')).toBeUndefined()
    expect(cleanReleaseDate(20261201)).toBeUndefined()
  })
})
