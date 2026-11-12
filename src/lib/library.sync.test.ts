import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from './library'
import type { IncomingShelf, ServerShelf } from './shelfMerge'

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
  // folds the save into the server's copy, as src/server/shelf.ts does
  saveShelf: async ({ data }: { data: IncomingShelf & { arrangement: string | null } }) => {
    if (!server.online) throw new Error('The reading-list server cannot be reached right now.')
    if (server.failSaves > 0) {
      server.failSaves--
      throw new Error('Request failed (500)')
    }
    server.saves++
    const { mergeIntoServer } = await import('./shelfMerge')
    const merged = mergeIntoServer(server.record && (structuredClone(server.record) as ServerShelf), structuredClone(data))
    server.record = { books: merged.books, arrangement: data.arrangement, updated: `t${++server.tick}` }
    return merged.changed ? { updated: server.record.updated, books: structuredClone(merged.books) } : { updated: server.record.updated }
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

  it('is not mixed into an account that already has a shelf (e.g. test data on a dev machine)', async () => {
    server.record = { books: [laptopOnly()], arrangement: 'title', updated: 't0' }
    seedOldBrowser()
    const { result } = signIn()
    await waitFor(migrated)
    await waitFor(() => expect(result.current.books.map((b) => b.id)).toEqual(['y']))
    expect(serverBooks().map((b) => b.id)).toEqual(['y'])
    expect(server.saves).toBe(0)
    // the browser's own shelf is left alone
    expect(JSON.parse(localStorage.getItem(OLD)!)).toEqual(oldShelf)
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
    // the account had a shelf by then: that one is used, the old browser shelf stays out of it
    await waitFor(() => expect(again.result.current.books.map((b) => b.id)).toEqual(['y']))
    expect(serverBooks().map((b) => b.id)).toEqual(['y'])
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

describe('syncing from the refresh button (#68)', () => {
  it('picks up a change made on another device and hands back those books', async () => {
    server.record = { books: [fullBook('a')], arrangement: 'title', updated: 't0' }
    const { result } = signIn()
    await waitFor(() => expect(result.current.books.map((b) => b.id)).toEqual(['a']))
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    // the phone adds a book
    server.record = { books: [fullBook('a'), fullBook('p')], arrangement: 'title', updated: 't9' }
    let synced: { books: Book[]; ok: boolean } | undefined
    await act(async () => {
      synced = await result.current.syncNow()
    })
    expect(synced?.ok).toBe(true)
    expect(synced?.books.map((b) => b.id)).toEqual(['a', 'p'])
    await waitFor(() => expect(result.current.books.map((b) => b.id)).toEqual(['a', 'p']))
  })

  it('sends changes that are waiting, instead of loading', async () => {
    server.record = { books: [fullBook('a')], arrangement: 'title', updated: 't0' }
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    act(() => result.current.updateBook('a', { title: 'Renamed' }))
    let synced: { books: Book[]; ok: boolean } | undefined
    await act(async () => {
      synced = await result.current.syncNow()
    })
    expect(synced).toMatchObject({ ok: true })
    expect(serverBooks()[0].title).toBe('Renamed')
  })

  it('says so when the server cannot be reached', async () => {
    server.record = { books: [fullBook('a')], arrangement: 'title', updated: 't0' }
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    server.online = false
    let synced: { books: Book[]; ok: boolean } | undefined
    await act(async () => {
      synced = await result.current.syncNow()
    })
    expect(synced?.ok).toBe(false)
    expect(synced?.books.map((b) => b.id)).toEqual(['a'])
    expect(result.current.sync).toBe('offline')
  })
})

/** A device's own copy of the account shelf, as an earlier visit left it. */
function seedDevice(books: Book[], { unsynced = true, synced, removed }: { unsynced?: boolean; synced?: string; removed?: string[] } = {}) {
  localStorage.setItem(`${OLD}:${ACCOUNT}`, JSON.stringify(books))
  localStorage.setItem(MIGRATED, '{}')
  if (unsynced) localStorage.setItem(`${OLD}:${ACCOUNT}:unsynced`, '1')
  if (synced) localStorage.setItem(`${OLD}:${ACCOUNT}:synced`, synced)
  if (removed) localStorage.setItem(`${OLD}:${ACCOUNT}:removed`, JSON.stringify(removed))
}

describe('a device can never wipe the shelf', () => {
  const hannas = () => [fullBook('a'), fullBook('b', { status: 'read' }), fullBook('c')]

  it('keeps every saved book when a device with other (test) data and unsent changes signs in', async () => {
    server.record = { books: hannas(), arrangement: 'status', updated: 't0' }
    seedDevice([fullBook('test1', { title: 'Test book', authors: ['Tester'], isbn: '9780000000999' })])
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    expect(serverBooks().map((b) => b.id).sort()).toEqual(['a', 'b', 'c', 'test1'])
    expect(serverBooks().find((b) => b.id === 'b')).toEqual(hannas()[1])
    // and the device shows the shelf as saved
    await waitFor(() => expect(result.current.books.map((b) => b.id).sort()).toEqual(['a', 'b', 'c', 'test1']))
  })

  it("doesn't undo newer edits with an outdated copy", async () => {
    server.record = { books: [fullBook('a', { title: 'New', editedAt: 200 })], arrangement: null, updated: 't5' }
    seedDevice([fullBook('a', { title: 'Old', editedAt: 100 })], { synced: 't0' })
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    expect(serverBooks()[0].title).toBe('New')
    await waitFor(() => expect(result.current.books[0].title).toBe('New'))
  })

  it("keeps this device's edit when it is the newer one", async () => {
    server.record = { books: [fullBook('a', { title: 'Theirs', editedAt: 200 })], arrangement: null, updated: 't5' }
    seedDevice([fullBook('a', { title: 'Mine', editedAt: 300 })], { synced: 't0' })
    signIn()
    await waitFor(() => expect(serverBooks()[0]?.title).toBe('Mine'))
  })

  it('still removes a book removed while offline', async () => {
    server.record = { books: [fullBook('a'), fullBook('b')], arrangement: null, updated: 't0' }
    seedDevice([fullBook('a')], { synced: 't0', removed: ['b'] })
    const { result } = signIn()
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    expect(serverBooks().map((b) => b.id)).toEqual(['a'])
    expect(localStorage.getItem(`${OLD}:${ACCOUNT}:removed`)).toBeNull()
  })

  it('removes and merges books for real, and keeps what another device added meanwhile', async () => {
    server.record = { books: hannas(), arrangement: null, updated: 't0' }
    const { result } = signIn()
    await waitFor(() => expect(result.current.books).toHaveLength(3))
    await waitFor(() => expect(result.current.sync).toBe('saved'))
    // the phone adds a book while this device isn't looking
    server.record = { ...server.record!, books: [...serverBooks(), fullBook('p')], updated: 't7' }
    act(() => result.current.removeBook('a'))
    act(() => result.current.mergeBook('b', 'c'))
    await waitFor(() => expect(serverBooks().map((b) => b.id)).toEqual(['b', 'p']), { timeout: 4000 })
    await waitFor(() => expect(result.current.books.map((b) => b.id)).toEqual(['b', 'p']))
  })
})
