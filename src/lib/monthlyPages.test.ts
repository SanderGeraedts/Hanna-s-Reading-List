import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { monthlyAmounts, niceMax } from './monthlyPages'

const book = (id: string, day: string, extra: Partial<Book> = {}): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, finished: [day], ...extra })

describe('pages per month', () => {
  it('adds up the pages of the books finished each month, and the listening time', () => {
    const books = [
      book('a', '2026-03-02', { pages: 300 }),
      book('b', '2026-03-20', { pages: 200 }),
      book('c', '2026-07-01', { formats: ['audiobook'], minutes: 600 }),
      book('d', '2025-03-05', { pages: 999 }),
    ]
    const m = monthlyAmounts(books, 2026)
    expect(m).toHaveLength(12)
    expect(m[2]).toEqual({ month: 3, pages: 500, minutes: 0 })
    expect(m[6]).toEqual({ month: 7, pages: 0, minutes: 600 })
    expect(monthlyAmounts(books, 2025)[2].pages).toBe(999)
  })

  it('rounds the top of the scale up to a nice number', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(870)).toBe(1000)
    expect(niceMax(1900)).toBe(2000)
    expect(niceMax(2300)).toBe(2500)
    expect(niceMax(4100)).toBe(5000)
  })
})
