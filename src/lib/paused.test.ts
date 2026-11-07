import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { localDay, sortBooks, statusPatch, timesRead } = await import('./library')
const { mergeBooks } = await import('./merge')
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

async function refresh(onShelf: Book, status: Book['status'], progress?: number) {
  const updates: Array<Partial<Book>> = []
  await importStorytelBooks(
    [{ storytelId: 'st', title: 'Tintenherz', authors: ['Cornelia Funke'], status, progress }] as never,
    [onShelf],
    { updateBook: (_id: string, p: Partial<Book>) => updates.push(p), addBook: () => {}, onProgress: () => {} },
  )
  return updates
}

describe('paused books (#60)', () => {
  it('stand between reading and want to read when arranged by status', () => {
    const shelf = [
      book({ id: 'r', status: 'read' }),
      book({ id: 'w', status: 'want' }),
      book({ id: 'p', status: 'paused' }),
      book({ id: 'c', status: 'reading' }),
    ]
    expect(sortBooks(shelf, 'status').map((b) => b.id)).toEqual(['c', 'p', 'w', 'r'])
  })

  it('pausing a re-read keeps the times read', () => {
    const paused = { ...book({ status: 'read', readCount: 2 }), ...statusPatch(book({ status: 'read', readCount: 2 }), 'paused') }
    expect(paused.status).toBe('paused')
    expect(timesRead(paused)).toBe(2)
  })

  it('a copy being read wins over a paused copy when merging', () => {
    expect(mergeBooks(book({ status: 'paused' }), book({ id: 'o', status: 'reading' })).status).toBe('reading')
    expect(mergeBooks(book({ status: 'paused' }), book({ id: 'o', status: 'want' })).status).toBe('paused')
  })

  it('stay paused when Storytel still says reading', async () => {
    const onShelf = book({ storytelId: 'st', status: 'paused', progress: 0.4 })
    expect(await refresh(onShelf, 'reading', 0.4)).toEqual([])
  })

  it('pick up again when she listens on in Storytel', async () => {
    const onShelf = book({ storytelId: 'st', status: 'paused', progress: 0.4 })
    expect(await refresh(onShelf, 'reading', 0.6)).toEqual([{ status: 'reading', storytelId: 'st', progress: 0.6 }])
  })

  it('are finished when Storytel says so', async () => {
    const onShelf = book({ storytelId: 'st', status: 'paused', progress: 0.4 })
    expect(await refresh(onShelf, 'read', 1)).toEqual([
      { status: 'read', readCount: 1, finished: [localDay()], storytelId: 'st', progress: 1 },
    ])
  })
})
