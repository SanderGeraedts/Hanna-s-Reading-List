import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { DEFAULT_LAYOUT } from '#/lib/dashboardLayout'

// no server: signed out, every server function mocked like the other dashboard tests
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

const { YearStory } = await import('./YearStory')
const { Dashboard } = await import('./Dashboard')

/**
 * The year wrap-up story (T-0081): ▶ Play opens it and nothing else does
 * (D-0013), a tap or a key moves one slide on, the last slide stays put until
 * she chooses, and Escape gives the focus back to ▶ Play.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#000', addedAt: 0, readCount: 1, ...b }) as Book

const BOOKS: Book[] = [
  book({ id: 'a', title: 'The Night Circus', authors: ['Erin'], pages: 500, rating: 5, genres: ['Fantasy'], finished: ['2026-07-04'], readingLog: { '2026-07-04': 1 } }),
  book({ id: 'b', title: 'Circe', authors: ['Madeline'], pages: 704, rating: 4, genres: ['Fantasy'], finished: ['2026-07-20'] }),
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

const story = () => screen.getByRole('dialog', { name: '2026 in books' })
const heading = () => document.querySelector<HTMLElement>('.story-heading')!.textContent

describe('the story on its own', () => {
  const open = (books = BOOKS, year = 2026) =>
    render(<YearStory books={books} year={year} onShowBook={() => {}} onClose={() => {}} />)

  it('starts at the opening slide and takes the focus', () => {
    open()
    expect(heading()).toBe('2026')
    expect(document.activeElement).toBe(story())
  })

  it('a tap anywhere moves one slide on, and ‹ Back one slide back', () => {
    open()
    fireEvent.click(document.querySelector('.story-backdrop')!)
    expect(heading()).toBe('Books')
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }))
    expect(heading()).toBe('2026')
    expect((screen.getByRole('button', { name: '‹ Back' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('the arrow keys, Space and Enter walk through it', () => {
    open()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('Books')
    fireEvent.keyDown(window, { key: ' ' })
    expect(heading()).toBe('Book of the year')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(heading()).toBe('Books')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(heading()).toBe('2026')
    // and never before the first slide
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(heading()).toBe('2026')
  })

  it('ends on the summary, where a tap does nothing and Share is offered', () => {
    open()
    for (let i = 0; i < 20; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('2026 in books')
    expect(screen.getByText('…and the story continues.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share a picture of your 2026 in books' })).toBeTruthy()
    // a tap on the last slide must not take her out of the story
    fireEvent.click(document.querySelector('.story-backdrop')!)
    expect(heading()).toBe('2026 in books')
  })

  it('a past year ends with its own line', () => {
    open(
      [book({ id: 'p', title: 'Past', pages: 100, finished: ['2024-02-02'] })],
      2024,
    )
    for (let i = 0; i < 20; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('…and she read happily ever after.')).toBeTruthy()
  })

  it('a year with nothing finished is two slides and offers no picture', () => {
    open([], 2026)
    expect(heading()).toBe('2026')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('2026 in books')
    expect(screen.getByText("No books finished yet. The year's story starts with the first one.")).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Share a picture/ })).toBeNull()
    // and it goes no further
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('2026 in books')
  })

  it('says where she is for a screen reader', () => {
    open()
    expect(screen.getByLabelText(/^Slide 1 of /)).toBeTruthy()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByLabelText(/^Slide 2 of /)).toBeTruthy()
  })
})

describe('▶ Play on the dashboard', () => {
  const show = (books = BOOKS) => {
    localStorage.setItem(
      'hannas-reading-list:dashboard:local',
      JSON.stringify({ ...DEFAULT_LAYOUT, favourites: [] }),
    )
    return render(<Dashboard books={books} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
  }
  const play = () => screen.getByRole('button', { name: 'Play your 2026 in books' })

  it('nothing opens until she presses Play, and Escape gives the focus back to it', () => {
    show()
    expect(screen.queryByRole('dialog', { name: '2026 in books' })).toBeNull()
    play().focus()
    fireEvent.click(play())
    expect(story()).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '2026 in books' })).toBeNull()
    expect(document.activeElement).toBe(play())
  })

  it('a year with no books has no Play button at all', () => {
    show([])
    expect(screen.queryByRole('button', { name: /^Play your/ })).toBeNull()
    expect(screen.getByText(/No books finished in 2026 yet/)).toBeTruthy()
  })
})
