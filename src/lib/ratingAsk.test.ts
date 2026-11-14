import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { askedPatch, lastFinish, pendingRatings } = await import('./ratingAsk')
const { statusPatch } = await import('./library')
const { mergeBooks } = await import('./merge')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
/** finished the way the Storytel sync does it */
const finish = (b: Book, day: string): Book => ({ ...b, ...statusPatch(b, 'read', day) })

describe('rating pop-up for finishes from the nightly sync', () => {
  it('asks about a book the sync finished, once', () => {
    const synced = finish(book('a', { status: 'reading' }), '2026-11-20')
    expect(pendingRatings([synced]).map((b) => b.id)).toEqual(['a'])
    const asked = { ...synced, ...askedPatch(synced) }
    expect(asked.ratingAsked).toBe('2026-11-20')
    expect(pendingRatings([asked])).toEqual([])
  })

  it("doesn't ask about finishes from before it shipped", () => {
    expect(pendingRatings([finish(book('old', { status: 'reading' }), '2026-11-10')])).toEqual([])
  })

  it('asks again for a re-read, but not for a sleep read', () => {
    const first = finish(book('r', { status: 'reading' }), '2026-11-16')
    const asked = { ...first, ...askedPatch(first) }
    const again = finish({ ...asked, status: 'reading' }, '2026-12-01')
    expect(pendingRatings([again]).map((b) => b.id)).toEqual(['r'])
    expect(pendingRatings([{ ...again, sleepRead: true }])).toEqual([])
    // a sleep read's first read still asks
    expect(pendingRatings([{ ...first, sleepRead: true }]).map((b) => b.id)).toEqual(['r'])
  })

  it('asks one book at a time, the earliest finish first', () => {
    const shelf = [
      finish(book('late', { status: 'reading' }), '2026-11-22'),
      finish(book('early', { status: 'reading' }), '2026-11-18'),
      book('unread'),
    ]
    expect(pendingRatings(shelf).map((b) => b.id)).toEqual(['early', 'late'])
  })

  it('knows the last finish, and merging keeps the latest asked day', () => {
    expect(lastFinish(book('x', { finished: ['2026-11-20', '2026-01-01'] }))).toBe('2026-11-20')
    expect(lastFinish(book('x'))).toBeUndefined()
    expect(mergeBooks(book('a', { ratingAsked: '2026-11-16' }), book('b', { ratingAsked: '2026-11-20' })).ratingAsked).toBe('2026-11-20')
  })
})
