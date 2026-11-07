import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
}))

const { localDay, mergeShelves } = await import('./library')
const { likelyDuplicates, mergeBooks } = await import('./merge')
const { importStorytelBooks } = await import('./storytelImport')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  color: '#884422',
  status: 'want',
  addedAt: 1000,
  ...extra,
})

describe('merging two copies of a book (#14)', () => {
  const paperback = book('p', {
    formats: ['paperback'],
    coverUrl: 'data:image/jpeg;base64,own-photo',
    status: 'reading',
    progress: 0.2,
    readCount: 0,
    genres: ['Fantasy'],
    lent: { to: 'Lotte' },
    addedAt: 2000,
  })
  const storytel = book('s', {
    title: 'Tintenherz (Ungekürzt)',
    storytelId: 'st-1',
    status: 'read',
    progress: 0.9,
    readCount: 2,
    genres: ['Kinderbuch', 'Fantasy'],
    pages: 560,
    addedAt: 1000,
  })

  it('keeps the details of the book it was started from', () => {
    const m = mergeBooks(paperback, storytel)
    expect(m.id).toBe('p')
    expect(m.title).toBe('Tintenherz')
    expect(m.coverUrl).toBe('data:image/jpeg;base64,own-photo')
    expect(m.lent).toEqual({ to: 'Lotte' })
  })

  it('takes the furthest status, progress and times read', () => {
    const m = mergeBooks(paperback, storytel)
    expect(m.status).toBe('read')
    expect(m.progress).toBe(0.9)
    expect(m.readCount).toBe(2)
  })

  it('combines formats and genres, and fills in what the kept copy lacks', () => {
    const m = mergeBooks(paperback, storytel)
    expect(m.formats).toEqual(['paperback', 'storytel'])
    expect(m.genres).toEqual(['Fantasy', 'Kinderbuch'])
    expect(m.pages).toBe(560)
    expect(m.storytelId).toBe('st-1')
    expect(m.addedAt).toBe(1000)
  })

  it('remembers the merged copy and both Storytel editions', () => {
    const twice = mergeBooks(book('a', { storytelId: 'st-a' }), book('b', { storytelId: 'st-b', mergedIds: ['old'] }))
    expect(twice.storytelId).toBe('st-a')
    expect(twice.storytelIds).toEqual(['st-b'])
    expect(twice.mergedIds).toEqual(['b', 'old'])
  })

  it("doesn't bring the merged copy back from another device's old shelf", () => {
    const merged = mergeBooks(paperback, storytel)
    const otherDevice = [storytel, book('new', { title: 'Something else', authors: ['Other'] })]
    expect(mergeShelves([merged], otherDevice).map((b) => b.id)).toEqual(['p', 'new'])
  })
})

describe('suggesting duplicates', () => {
  it('finds the same title by the same author, edition notes left out', () => {
    const a = book('a')
    const shelf = [
      a,
      book('b', { title: 'Tintenherz (Dramatized Adaptation)' }),
      book('c', { title: 'Tintenblut' }),
      book('d', { authors: ['Someone Else'] }),
    ]
    expect(likelyDuplicates(a, shelf).map((b) => b.id)).toEqual(['b'])
  })

  it('finds the same ISBN or work whatever the title', () => {
    const a = book('a', { isbn: '9783791504650' })
    const shelf = [a, book('b', { title: 'Inkheart', authors: ['C. Funke'], isbn: '9783791504650' })]
    expect(likelyDuplicates(a, shelf).map((b) => b.id)).toEqual(['b'])
  })

  it('stops suggesting a pair marked as not the same book', () => {
    const a = book('a', { notDuplicates: ['b'] })
    expect(likelyDuplicates(a, [a, book('b')])).toEqual([])
    const c = book('c')
    expect(likelyDuplicates(c, [c, book('d', { notDuplicates: ['c'] })])).toEqual([])
  })
})

describe('Storytel refresh after merging', () => {
  const storytelItem = (storytelId: string, status: Book['status'], progress?: number) => ({
    storytelId,
    title: 'Tintenherz',
    authors: ['Cornelia Funke'],
    status,
    progress,
  })

  it('matches a merged edition and never adds it again', async () => {
    const merged = book('m', { storytelId: 'st-a', storytelIds: ['st-b'], status: 'reading', progress: 0.5 })
    const updates: Array<[string, Partial<Book>]> = []
    const added: unknown[] = []
    const summary = await importStorytelBooks(
      [storytelItem('st-a', 'reading', 0.5), storytelItem('st-b', 'want', 0.1)] as never,
      [merged],
      { updateBook: (id: string, patch: Partial<Book>) => updates.push([id, patch]), addBook: (b: unknown) => added.push(b), onProgress: () => {} },
    )
    expect(added).toEqual([])
    expect(updates).toEqual([])
    expect(summary.unchanged).toBe(2)
  })

  it('lets the other edition move the book forward, not back', async () => {
    const merged = book('m', { storytelId: 'st-a', storytelIds: ['st-b'], status: 'reading', progress: 0.5 })
    const updates: Array<[string, Partial<Book>]> = []
    await importStorytelBooks(
      [storytelItem('st-b', 'read', 1)] as never,
      [merged],
      { updateBook: (id: string, patch: Partial<Book>) => updates.push([id, patch]), addBook: () => {}, onProgress: () => {} },
    )
    expect(updates).toEqual([['m', { status: 'read', readCount: 1, finished: [localDay()], progress: 1 }]])
  })
})
