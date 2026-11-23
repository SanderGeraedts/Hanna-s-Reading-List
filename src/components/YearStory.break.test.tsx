import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
  loadChallenges: async () => [],
  saveChallenges: async () => [],
}))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
  browseBooks: async () => [],
  lookupIsbn: async () => null,
  getPublishDate: async () => null,
  getCoverChoices: async () => [],
}))
vi.mock('#/server/favourites', () => ({ loadFavourites: async () => ({ kept: false }), saveFavourites: async () => ({ kept: false }) }))

// the share picture: the canvas can't be drawn in a test, so the call is watched instead
const shared = vi.fn(async (_spec: unknown) => 'shared' as const)
vi.mock('#/lib/shareImage', () => ({ shareChallenge: (spec: unknown) => shared(spec) }))

const { YearStory } = await import('./YearStory')

/**
 * Trying to break the year story (T-0081): a bare book, a very long title,
 * keys held down, the share picture, and the close ways.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#000', addedAt: 0, readCount: 1, ...b }) as Book

const LONG = 'The Extraordinarily and Quite Unnecessarily Long Title of a Book That Will Not Fit on One Line at All'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(() => {
  shared.mockClear()
  cleanup()
})

const open = (books: Book[], year = 2026, onClose = () => {}) =>
  render(<YearStory books={books} year={year} onShowBook={() => {}} onClose={onClose} />)
const heading = () => document.querySelector<HTMLElement>('.story-heading')!.textContent
const toEnd = () => {
  for (let i = 0; i < 25; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
}

describe('the story under pressure', () => {
  it('a book with nothing but a title still makes a story', () => {
    open([book({ id: 'a', title: 'A', finished: ['2026-05-05'] })])
    expect(heading()).toBe('2026')
    toEnd()
    expect(heading()).toBe('2026 in books')
  })

  it('a very long title does not break the slide', () => {
    open([book({ id: 'a', title: LONG, authors: ['Someone'], pages: 400, rating: 5, finished: ['2026-05-05'] })])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('Book of the year')
    expect(document.querySelector('.story-title')!.textContent).toBe(LONG)
  })

  it('holding the key down stops at the last slide and never past it', () => {
    open([book({ id: 'a', title: 'A', pages: 100, finished: ['2026-05-05'] })])
    for (let i = 0; i < 200; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('2026 in books')
    expect(document.querySelectorAll('.story-slide')).toHaveLength(1)
  })

  it('the share picture carries the year, its covers and the facts', async () => {
    open([
      book({ id: 'a', title: 'A', authors: ['Ann'], pages: 400, rating: 5, genres: ['Fantasy'], finished: ['2026-05-05'] }),
      book({ id: 'b', title: 'B', authors: ['Ann'], pages: 200, rating: 4, genres: ['Fantasy'], finished: ['2026-06-06'] }),
    ])
    toEnd()
    fireEvent.click(screen.getByRole('button', { name: 'Share a picture of your 2026 in books' }))
    await vi.waitFor(() => expect(shared).toHaveBeenCalled())
    const spec = shared.mock.calls[0]![0] as { title: string; subtitle: string; tiles: unknown[] }
    expect(spec.title).toBe('2026 in books')
    expect(spec.subtitle).toContain('Books: 2 books')
    expect(spec.subtitle).toContain('Top author: Ann')
    expect(spec.tiles).toHaveLength(2)
  })

  it('a tap on Share or Back does not also move the story on', () => {
    open([book({ id: 'a', title: 'A', pages: 100, finished: ['2026-05-05'] })])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    const was = heading()
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }))
    expect(heading()).not.toBe(was)
    // Enter on a button presses the button, it does not also count as "next"
    const back = screen.getByRole('button', { name: '‹ Back' })
    fireEvent.keyDown(back, { key: 'Enter' })
    expect(heading()).toBe('2026')
  })

  it('Escape, × and the backdrop all close it', () => {
    const closed = vi.fn()
    open([book({ id: 'a', title: 'A', pages: 100, finished: ['2026-05-05'] })], 2026, closed)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close the story' }))
    expect(closed).toHaveBeenCalledTimes(2)
    toEnd()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(closed).toHaveBeenCalledTimes(3)
  })

  it('a year in the future is simply an empty story', () => {
    open([book({ id: 'a', title: 'A', pages: 100, finished: ['2026-05-05'] })], 2030)
    expect(heading()).toBe('2030')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('2030 in books')
    expect(screen.queryByRole('button', { name: /^Share a picture/ })).toBeNull()
  })
})
