import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { addedText, recentlyAdded } from './recent'

const book = (id: string, addedAt: number): Book => ({ id, title: `Book ${id}`, authors: [], color: '#888', status: 'want', addedAt })

describe('newly added (#132)', () => {
  it('lists the last ten books added, newest first', () => {
    const books = Array.from({ length: 12 }, (_, i) => book(String(i), Date.UTC(2026, 0, i + 1)))
    expect(recentlyAdded(books).map((b) => b.id)).toEqual(['11', '10', '9', '8', '7', '6', '5', '4', '3', '2'])
    expect(recentlyAdded([])).toEqual([])
  })

  it('says how long ago a book was added', () => {
    const now = new Date(2026, 10, 14, 12).getTime()
    expect(addedText(new Date(2026, 10, 14, 8).getTime(), now)).toBe('added today')
    expect(addedText(new Date(2026, 10, 13, 23).getTime(), now)).toBe('added yesterday')
    expect(addedText(new Date(2026, 10, 11).getTime(), now)).toBe('added 3 days ago')
    expect(addedText(new Date(2026, 9, 24).getTime(), now)).toBe('added 3 weeks ago')
    expect(addedText(new Date(2025, 2, 5).getTime(), now)).toBe('added in March 2025')
  })
})
