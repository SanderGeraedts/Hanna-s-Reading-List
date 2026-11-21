import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { monthWrap, wrapUpDue } from './wrapup'

const book = (id: string, extra: Partial<Book> = {}): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, ...extra })

describe('the monthly wrap-up', () => {
  it('collects the month: books, pages, reading days and the book of the month', () => {
    const books = [
      book('a', { finished: ['2026-10-05'], pages: 300, rating: 4, readingLog: { '2026-10-04': 0.5, '2026-10-05': 0.5 } }),
      book('b', { finished: ['2026-10-20'], pages: 200, rating: 5, readingLog: { '2026-10-19': 1 } }),
      book('c', { finished: ['2026-09-30'], pages: 999 }),
    ]
    const w = monthWrap(books, 2026, 10)
    expect(w.books.map((b) => b.id)).toEqual(['b', 'a'])
    expect(w.pages).toBe(500)
    expect(w.readingDays).toBe(3)
    expect(w.top?.id).toBe('b')
  })

  it('finds a fun fact: a new genre first, then a streak, a long book, a favourite day', () => {
    const older = book('old', { finished: ['2026-01-10'], genres: ['Romance'] })
    expect(monthWrap([older, book('n', { finished: ['2026-10-05'], genres: ['Horror'] })], 2026, 10).fact).toBe('A new genre for you: Horror')
    const streak = book('s', { finished: ['2026-10-09'], genres: ['Romance'], readingLog: Object.fromEntries([3, 4, 5, 6, 7, 8].map((d) => [`2026-10-0${d}`, 0.1])) })
    expect(monthWrap([older, streak], 2026, 10).fact).toBe('Your longest streak: 6 days in a row')
    const long = book('l', { title: 'Big One', finished: ['2026-10-09'], genres: ['Romance'], pages: 620 })
    expect(monthWrap([older, long], 2026, 10).fact).toBe('Longest book: Big One (620 pages)')
  })

  it('an empty month has no books and no fact', () => {
    const w = monthWrap([book('a', { finished: ['2026-01-05'] })], 2026, 6)
    expect(w.books).toEqual([])
    expect(w.fact).toBeUndefined()
  })

  it('offers last month for the first week of a new month', () => {
    expect(wrapUpDue('2026-12-03')).toEqual({ year: 2026, month: 11 })
    expect(wrapUpDue('2027-01-07')).toEqual({ year: 2026, month: 12 })
    expect(wrapUpDue('2026-12-08')).toBeNull()
  })
})
