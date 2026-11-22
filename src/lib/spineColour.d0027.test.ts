import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

/**
 * D-0027 (T-0019, tester): a spine colour she picked is only ever changed by her.
 * The Storytel refresh, merging duplicates and the shelf merge on save must keep it.
 */

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
}))

const { mergeBooks } = await import('./merge')
const { importStorytelBooks } = await import('./storytelImport')
const { mergeIntoServer } = await import('./shelfMerge')

const CHOSEN = '#1c3654'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  color: CHOSEN,
  status: 'want',
  addedAt: 1000,
  ...extra,
})

describe('a chosen spine colour stays (D-0027)', () => {
  it('the Storytel refresh moves status and progress on, never the colour', async () => {
    const existing = book('m', { storytelId: 'st-a', status: 'reading', progress: 0.2, coverUrl: '/api/cover/id/1?size=L' })
    const updates: Array<[string, Partial<Book>]> = []
    const added: unknown[] = []
    await importStorytelBooks(
      [{ storytelId: 'st-a', title: 'Tintenherz', authors: ['Cornelia Funke'], status: 'read', progress: 1, durationMs: 3_600_000 }] as never,
      [existing],
      { updateBook: (id: string, patch: Partial<Book>) => updates.push([id, patch]), addBook: (b: unknown) => added.push(b), onProgress: () => {} },
    )
    expect(added).toEqual([])
    expect(updates.length).toBeGreaterThan(0)
    for (const [, patch] of updates) expect(patch).not.toHaveProperty('color')
  })

  it('merging duplicates keeps the kept copy’s colour, even when the other copy brings the cover', () => {
    const keep = book('k')
    const other = book('o', { color: '#a0522d', coverUrl: '/api/cover/id/2?size=L', coverAspect: 0.66 })
    const merged = mergeBooks(keep, other)
    expect(merged.color).toBe(CHOSEN)
    expect(merged.coverUrl).toBe('/api/cover/id/2?size=L')
  })

  it('a newer pick on this device wins over a stale server copy', () => {
    const server = { books: [book('a', { color: '#7a2e2e', editedAt: 100 })], updated: 't2' }
    const r = mergeIntoServer(server, { books: [book('a', { color: CHOSEN, editedAt: 200 })], base: 't1' })
    expect(r.books[0].color).toBe(CHOSEN)
  })

  it('an older device copy does not overwrite a newer pick from another device', () => {
    const server = { books: [book('a', { color: CHOSEN, editedAt: 200 })], updated: 't2' }
    const r = mergeIntoServer(server, { books: [book('a', { color: '#7a2e2e', editedAt: 100 })], base: 't1' })
    expect(r.books[0].color).toBe(CHOSEN)
    expect(r.changed).toBe(true)
  })
})
