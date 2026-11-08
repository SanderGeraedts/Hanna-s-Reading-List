import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ getWorkDetails: async () => null, searchBooks: async () => [] }))
vi.mock('#/server/storytel', () => ({}))

const { localDay } = await import('./library')
const { syncedShelf } = await import('./storytelImport')
const { sameSecret } = await import('#/server/nightly')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'reading',
  addedAt: 0,
  ...extra,
})

describe('nightly Storytel sync (#77)', () => {
  it('notes days in Amsterdam time, also on a server in UTC', () => {
    // 23:30 UTC on 7 November is already 8 November in Amsterdam
    expect(localDay(new Date(Date.UTC(2026, 10, 7, 23, 30)), 'Europe/Amsterdam')).toBe('2026-11-08')
    expect(localDay(new Date(Date.UTC(2026, 10, 7, 21, 30)), 'Europe/Amsterdam')).toBe('2026-11-07')
  })

  it('brings the books on the shelf up to date and adds none', async () => {
    const shelf = [book('a', { storytelId: 'st-a', progress: 0.2 }), book('b')]
    const { books, summary } = await syncedShelf(
      [
        { storytelId: 'st-a', title: 'Book a', authors: ['Someone'], status: 'reading', progress: 0.5, progressAt: '2026-11-07T23:30:00Z' },
        { storytelId: 'st-new', title: 'Something new', authors: ['Else'], status: 'reading', progress: 0.1 },
      ],
      shelf,
      'Europe/Amsterdam',
    )
    expect(summary).toEqual({ added: 0, updated: 1, unchanged: 0 })
    expect(books).toHaveLength(2)
    expect(books[0].progress).toBe(0.5)
    expect(books[0].readingLog).toEqual({ '2026-11-08': 0.3 })
    expect(books[1]).toBe(shelf[1])
  })

  it('only opens up with the exact secret', () => {
    expect(sameSecret('s3cret', 's3cret')).toBe(true)
    expect(sameSecret('s3cre', 's3cret')).toBe(false)
    expect(sameSecret('s3cret!', 's3cret')).toBe(false)
    expect(sameSecret(null, 's3cret')).toBe(false)
  })
})
