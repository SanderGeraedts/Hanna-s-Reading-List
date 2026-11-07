import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { statusPatch, timesRead } = await import('./library')
const { importStorytelBooks } = await import('./storytelImport')

const book = (extra: Partial<Book> = {}): Book => ({
  id: 'b',
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const apply = (b: Book, ...statuses: Book['status'][]) =>
  statuses.reduce((acc, s) => ({ ...acc, ...statusPatch(acc, s) }), b)

describe('counting re-reads and re-listens (#53)', () => {
  it('finishing a book counts once', () => {
    expect(timesRead(apply(book(), 'reading', 'read'))).toBe(1)
  })

  it('starting it again keeps the count, finishing it again adds one', () => {
    const again = apply(book(), 'reading', 'read', 'reading')
    expect(again.readCount).toBe(1)
    expect(timesRead(again)).toBe(1)
    expect(timesRead(apply(again, 'read'))).toBe(2)
    expect(timesRead(apply(again, 'read', 'reading', 'read'))).toBe(3)
  })

  it('books read before the count existed start from one', () => {
    expect(timesRead(apply(book({ status: 'read' }), 'reading', 'read'))).toBe(2)
  })

  it('a hand-set count is kept and added to', () => {
    expect(timesRead(apply(book({ status: 'read', readCount: 4 }), 'reading', 'read'))).toBe(5)
  })

  it('choosing the same status again changes nothing', () => {
    expect(statusPatch(book({ status: 'read', readCount: 2 }), 'read')).toEqual({})
  })

  it('Storytel: relistening to a finished book and finishing again counts', async () => {
    let shelf = [book({ storytelId: 'st', status: 'read', progress: 1 })]
    const refresh = async (status: Book['status'], progress: number) =>
      importStorytelBooks(
        [{ storytelId: 'st', title: 'Tintenherz', authors: ['Cornelia Funke'], status, progress }] as never,
        shelf,
        {
          updateBook: (id: string, p: Partial<Book>) => (shelf = shelf.map((b) => (b.id === id ? { ...b, ...p } : b))),
          addBook: () => {},
          onProgress: () => {},
        },
      )
    await refresh('reading', 0.1)
    expect(timesRead(shelf[0])).toBe(1)
    await refresh('read', 1)
    expect(timesRead(shelf[0])).toBe(2)
    await refresh('read', 1)
    expect(timesRead(shelf[0])).toBe(2)
  })
})
