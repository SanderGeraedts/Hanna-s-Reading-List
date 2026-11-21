import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from './library'
import type { IncomingShelf, ServerShelf } from './shelfMerge'
import { mergeIntoServer } from './shelfMerge'

/**
 * The e-book link (#185) travels with the book like `storytelId`: through the
 * browser shelf, the account sync (shelfMerge.ts, unchanged), a Storytel
 * refresh and a merge of two copies, without being dropped and without
 * dropping anything else.
 */

const server = vi.hoisted(() => ({
  record: null as null | { books: unknown[]; arrangement: string | null; updated: string },
  tick: 0,
}))

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => server.record && structuredClone(server.record),
  // folds the save into the server's copy, as src/server/shelf.ts does
  saveShelf: async ({ data }: { data: IncomingShelf & { arrangement: string | null } }) => {
    const { mergeIntoServer } = await import('./shelfMerge')
    const merged = mergeIntoServer(server.record && (structuredClone(server.record) as ServerShelf), structuredClone(data))
    server.record = { books: merged.books, arrangement: data.arrangement, updated: `t${++server.tick}` }
    return merged.changed ? { updated: server.record.updated, books: structuredClone(merged.books) } : { updated: server.record.updated }
  },
}))
vi.mock('#/server/openLibrary', () => ({ getWorkDetails: async () => null, searchBooks: async () => [] }))
vi.mock('#/server/storytel', () => ({}))

const { useLibrary } = await import('./library')
const { syncedShelf, importStorytelBooks } = await import('./storytelImport')
const { mergeBooks } = await import('./merge')

const LINK = 'https://example.com/book.epub'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'reading',
  progress: 0.2,
  isbn: '9780000000001',
  genres: ['Fantasy'],
  addedAt: 1,
  editedAt: 100,
  ...extra,
})

const serverBooks = () => (server.record?.books ?? []) as Book[]

beforeEach(() => {
  localStorage.clear()
  Object.assign(server, { record: null, tick: 0 })
})

describe('the e-book link on the shelf', () => {
  it('lets a shelf saved before it load, with no link on any book', async () => {
    const old = [book('a'), book('b', { storytelId: 'st-b' })]
    localStorage.setItem('hannas-reading-list:v1', JSON.stringify(old))
    const { result } = renderHook(() => useLibrary(null))
    await waitFor(() => expect(result.current.books).toEqual(old))
    expect(result.current.books.every((b) => b.ebookUrl === undefined)).toBe(true)
  })

  it('survives a reload of the browser shelf, and can be removed again', async () => {
    localStorage.setItem('hannas-reading-list:v1', JSON.stringify([book('a')]))
    const first = renderHook(() => useLibrary(null))
    await waitFor(() => expect(first.result.current.books).toHaveLength(1))
    act(() => first.result.current.updateBook('a', { ebookUrl: LINK }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('hannas-reading-list:v1')!)[0].ebookUrl).toBe(LINK))
    first.unmount()

    const again = renderHook(() => useLibrary(null))
    await waitFor(() => expect(again.result.current.books[0]?.ebookUrl).toBe(LINK))
    expect(again.result.current.books[0]).toMatchObject({ isbn: '9780000000001', genres: ['Fantasy'], progress: 0.2 })

    act(() => again.result.current.updateBook('a', { ebookUrl: undefined }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('hannas-reading-list:v1')!)[0].ebookUrl).toBeUndefined())
  })

  it('is saved to the account and comes back on another device', async () => {
    server.record = { books: [book('a'), book('b')], arrangement: 'title', updated: 't0' }
    const laptop = renderHook(() => useLibrary('hanna'))
    await waitFor(() => expect(laptop.result.current.sync).toBe('saved'))
    act(() => laptop.result.current.updateBook('a', { ebookUrl: LINK }))
    // saves are spread out a little; send it now
    await act(async () => {
      await laptop.result.current.syncNow()
    })
    await waitFor(() => expect(serverBooks().find((b) => b.id === 'a')?.ebookUrl).toBe(LINK))
    expect(serverBooks().map((b) => b.id)).toEqual(['a', 'b'])
    expect(serverBooks()[0]).toMatchObject({ isbn: '9780000000001', genres: ['Fantasy'], progress: 0.2 })
    laptop.unmount()

    localStorage.clear()
    const phone = renderHook(() => useLibrary('hanna'))
    await waitFor(() => expect(phone.result.current.books.find((b) => b.id === 'a')?.ebookUrl).toBe(LINK))
  })
})

describe('the e-book link in the server merge (shelfMerge.ts, unchanged)', () => {
  const withLink = book('a', { ebookUrl: LINK, editedAt: 200 })

  it('keeps the link when an up-to-date device saves it', () => {
    const r = mergeIntoServer({ books: [book('a')], updated: 't1' }, { books: [withLink], base: 't1' })
    expect(r.books).toEqual([withLink])
  })

  it("isn't lost to a stale device that doesn't know the link and has no newer edit", () => {
    const r = mergeIntoServer({ books: [withLink, book('b')], updated: 't2' }, { books: [book('a')], base: 't1' })
    expect(r.books.find((b) => b.id === 'a')).toEqual(withLink)
    expect(r.books.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it("isn't lost to an older app that sends no base", () => {
    const r = mergeIntoServer({ books: [withLink], updated: 't2' }, { books: [book('a', { title: 'Old' })] })
    expect(r.books).toEqual([withLink])
  })

  it('is added by a newer edit without touching the other fields', () => {
    const server = { books: [book('a', { rating: 4 })], updated: 't2' }
    const mine = { ...book('a', { rating: 4 }), ebookUrl: LINK, editedAt: 300 }
    const r = mergeIntoServer(server, { books: [mine], base: 't1' })
    expect(r.books).toEqual([mine])
  })
})

describe('the e-book link elsewhere', () => {
  const fromStorytel = {
    storytelId: 'st-a',
    title: 'Book a',
    authors: ['Someone'],
    status: 'reading' as const,
    progress: 0.6,
    progressAt: '2026-11-07T20:00:00Z',
  }

  it('survives the nightly Storytel sync', async () => {
    const { books } = await syncedShelf(
      [fromStorytel],
      [book('a', { storytelId: 'st-a', ebookUrl: LINK })],
      'Europe/Amsterdam',
    )
    expect(books[0].progress).toBe(0.6)
    expect(books[0].ebookUrl).toBe(LINK)
  })

  it('survives a Storytel refresh (↻) in the app', async () => {
    let shelf = [book('a', { storytelId: 'st-a', ebookUrl: LINK })]
    await importStorytelBooks([fromStorytel], shelf, {
      addBook: () => {},
      onProgress: () => {},
      updateBook: (id, patch) => {
        shelf = shelf.map((b) => (b.id === id ? { ...b, ...patch } : b))
      },
    })
    expect(shelf[0].progress).toBe(0.6)
    expect(shelf[0].ebookUrl).toBe(LINK)
  })

  it('is kept when two copies of a book are merged', () => {
    const other = book('b', { ebookUrl: LINK })
    expect(mergeBooks(book('a'), other).ebookUrl).toBe(LINK)
    // the copy she started from keeps its own link
    expect(mergeBooks(book('a', { ebookUrl: 'https://mine.example/x' }), other).ebookUrl).toBe('https://mine.example/x')
    // a link removed in the kept copy (undefined) still picks up the other one
    expect(mergeBooks({ ...book('a'), ebookUrl: undefined }, other).ebookUrl).toBe(LINK)
  })
})
