import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

/**
 * The account sync and the move of a pre-account shelf into the account,
 * against an in-memory stand-in for the PocketBase server functions.
 */

const server = vi.hoisted(() => ({
  record: null as null | { books: unknown[]; arrangement: string | null; updated: string },
  online: true,
  failSaves: 0,
  saves: 0,
  tick: 0,
}))

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => {
    if (!server.online) throw new Error('The reading-list server cannot be reached right now.')
    return server.record && structuredClone(server.record)
  },
  saveShelf: async ({ data }: { data: { books: unknown[]; arrangement: string | null } }) => {
    if (!server.online) throw new Error('The reading-list server cannot be reached right now.')
    if (server.failSaves > 0) {
      server.failSaves--
      throw new Error('Request failed (500)')
    }
    server.saves++
    server.record = { ...structuredClone(data), updated: `t${++server.tick}` }
    return { updated: server.record.updated }
  },
}))

const { useLibrary } = await import('./library')

const OLD = 'hannas-reading-list:v1'
const OLD_ARRANGEMENT = 'hannas-reading-list:arrangement'
const MIGRATED = 'hannas-reading-list:v1:migrated'
const ACCOUNT = 'hanna123'

/** A book using every field Hanna can fill in. */
function fullBook(id: string, extra: Partial<Book> = {}): Book {
  return {
    id,
    title: `Book ${id}`,
    originalTitle: `Book ${id} (10th Anniversary Recording)`,
    authors: ['Cornelia Funke'],
    year: 2003,
    pages: 480,
    isbn: `978000000000${id}`,
    workKey: `/works/OL${id}W`,
    coverUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ',
    coverAspect: 0.65,
    description: 'Edited back-cover text',
    color: '#884422',
    status: 'reading',
    progress: 0.42,
    readCount: 2,
    series: 'Tintenwelt',
    seriesIndex: 1,
    format: 'hardcover',
    language: 'de',
    genres: ['Fantasy'],
    lent: { to: 'Lotte', since: '2026-10-01' },
    addedAt: 1_700_000_000_000,
    ...extra,
  }
}

const oldShelf = [fullBook('a'), fullBook('b', { storytelId: 'st-1', status: 'read' }), fullBook('c')]
const laptopOnly = () =>
  fullBook('y', { title: 'Only on the laptop', authors: ['Someone Else'], isbn: '9781111111111' })

function seedOldBrowser(books: Book[] = oldShelf, arrangement = 'genre') {
  localStorage.setItem(OLD, JSON.stringify(books))
  localStorage.setItem(OLD_ARRANGEMENT, arrangement)
}

const signIn = () => renderHook(() => useLibrary(ACCOUNT))
const serverBooks = () => (server.record?.books ?? []) as Book[]
const migrated = () => expect(localStorage.getItem(MIGRATED)).not.toBeNull()

beforeEach(() => {
  localStorage.clear()
  Object.assign(server, { record: null, online: true, failSaves: 0, saves: 0, tick: 0 })
})

describe('moving the pre-account shelf into the account', () => {
  it('sends every book, every field and the arrangement on first sign-in', async () => {
    seedOldBrowser()
    const { result } = signIn()
    await waitFor(migrated)
    expect(serverBooks()).toEqual(oldShelf)
    expect(server.record?.arrangement).toBe('genre')
    expect(result.current.books).toEqual(oldShelf)
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    // the old copy stays on the device as a backup
    expect(JSON.parse(localStorage.getItem(OLD)!)).toEqual(oldShelf)
  })

  it('adds the books to a shelf another device already saved, without duplicates', async () => {
    const sameAsB = fullBook('x', { storytelId: 'st-1', title: 'Book b', status: 'read' })
    server.record = { books: [sameAsB, laptopOnly()], arrangement: 'title', updated: 't0' }
    seedOldBrowser()
    signIn()
    await waitFor(migrated)
    expect(serverBooks().map((b) => b.id)).toEqual(['x', 'y', 'a', 'c'])
  })

  it('keeps waiting when the server is unreachable at first sign-in, and finishes later', async () => {
    seedOldBrowser()
    server.online = false
    const first = signIn()
    await waitFor(() => expect(first.result.current.sync).toBe('offline'))
    expect(first.result.current.books).toEqual(oldShelf) // still on screen while offline
    first.unmount()

    // meanwhile another device saved a shelf
    server.record = { books: [laptopOnly()], arrangement: null, updated: 't0' }
    server.online = true

    const again = signIn()
    await waitFor(migrated)
    expect(serverBooks().map((b) => b.id).sort()).toEqual(['a', 'b', 'c', 'y'])
    expect(again.result.current.books).toHaveLength(4)
  })

  it('finishes when the page comes back into view after being offline', async () => {
    seedOldBrowser()
    server.online = false
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('offline'))
    server.online = true
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(migrated)
    expect(serverBooks()).toEqual(oldShelf)
  })

  it('is not marked done when the save fails, and is retried on the next visit', async () => {
    seedOldBrowser()
    server.failSaves = 1
    const first = signIn()
    await waitFor(() => expect(first.result.current.sync).toBe('offline'))
    expect(localStorage.getItem(MIGRATED)).toBeNull()
    first.unmount()

    signIn()
    await waitFor(migrated)
    expect(serverBooks()).toEqual(oldShelf)
  })

  it('happens only once: a removed book stays removed', async () => {
    seedOldBrowser()
    const first = signIn()
    await waitFor(migrated)
    act(() => first.result.current.removeBook('a'))
    await waitFor(() => expect(serverBooks().map((b) => b.id)).toEqual(['b', 'c']), { timeout: 4000 })
    first.unmount()

    const again = signIn()
    await waitFor(() => expect(again.result.current.sync).toBe('saved'))
    expect(again.result.current.books.map((b) => b.id)).toEqual(['b', 'c'])
    expect(serverBooks().map((b) => b.id)).toEqual(['b', 'c'])
  })
})

describe('edits reach the server', () => {
  it('saves changed fields and a new arrangement', async () => {
    seedOldBrowser()
    const { result } = signIn()
    await waitFor(migrated)
    act(() => result.current.updateBook('c', { lent: { to: 'Mila' }, format: 'ebook', genres: ['Thriller'] }))
    act(() => result.current.sortBy('format'))
    await waitFor(
      () => {
        expect(server.record?.arrangement).toBe('format')
        expect(serverBooks().find((b) => b.id === 'c')).toMatchObject({
          lent: { to: 'Mila' },
          format: 'ebook',
          genres: ['Thriller'],
        })
      },
      { timeout: 4000 },
    )
  })
})

describe('without an account', () => {
  it('keeps using the browser shelf and never talks to the server', async () => {
    seedOldBrowser()
    const { result } = renderHook(() => useLibrary(null))
    await waitFor(() => expect(result.current.books).toEqual(oldShelf))
    expect(result.current.arrangement).toBe('genre')
    expect(result.current.sync).toBe('local')
    expect(server.saves).toBe(0)
    expect(localStorage.getItem(MIGRATED)).toBeNull()
  })
})
