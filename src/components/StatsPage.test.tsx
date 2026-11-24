import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

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

const { StatsPage } = await import('./StatsPage')

/**
 * The Stats page (T-0080): the year picker and "Compare with" drive every
 * number on the page, All time has nothing to compare with, and a year with
 * no books says so instead of showing zeros everywhere.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#000', addedAt: 0, readCount: 1, ...b }) as Book

const BOOKS: Book[] = [
  book({ id: 'a', title: 'A', authors: ['Ann'], pages: 300, genres: ['Fantasy'], finished: ['2026-03-01'], readingLog: { '2026-03-01': 1 } }),
  book({ id: 'b', title: 'B', authors: ['Ann'], pages: 200, genres: ['Fantasy'], finished: ['2026-07-04'], readingLog: { '2026-07-04': 1 } }),
  book({ id: 'c', title: 'C', authors: ['Bo'], pages: 400, genres: ['Mystery'], finished: ['2025-05-05'], readingLog: { '2025-05-05': 1 } }),
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

const show = (books = BOOKS) =>
  render(<StatsPage books={books} accountId={null} onShowBook={() => {}} onOpenGoal={() => {}} />)
const yearPicker = () => screen.getByLabelText('Year') as HTMLSelectElement
const comparePicker = () => screen.getByLabelText('Compare with') as HTMLSelectElement
const numbers = () => document.querySelector<HTMLElement>('.stats-numbers')!

describe('the Stats page', () => {
  it('opens on this year, with every year with data and All time to pick from', () => {
    show()
    expect(yearPicker().value).toBe('2026')
    expect([...yearPicker().options].map((o) => o.value)).toEqual(['2026', '2025', 'all'])
    expect(numbers().textContent).toContain('2')
    expect(numbers().textContent).toContain('books')
  })

  it('shows the numbers of the year she picks', () => {
    show()
    fireEvent.change(yearPicker(), { target: { value: '2025' } })
    expect(numbers().textContent).toContain('1book')
    expect(numbers().textContent).toContain('400pages')
  })

  it('puts the compare year beside each number, in words as well as with an arrow', () => {
    show()
    fireEvent.change(comparePicker(), { target: { value: '2025' } })
    expect(numbers().textContent).toContain('↑ 1 vs 2025')
    expect(numbers().textContent).toContain('1 more than in 2025')
    expect(numbers().textContent).toContain('↑ 100 vs 2025')
    // and the other way round: 2025 against 2026
    fireEvent.change(yearPicker(), { target: { value: '2025' } })
    fireEvent.change(comparePicker(), { target: { value: '2026' } })
    expect(numbers().textContent).toContain('↓ 1 vs 2026')
    expect(numbers().textContent).toContain('1 fewer than in 2026')
    expect(numbers().textContent).toContain('↓ 100 vs 2026')
  })

  it('says "same as" when she ends up comparing a year with itself', () => {
    show()
    fireEvent.change(comparePicker(), { target: { value: '2025' } })
    fireEvent.change(yearPicker(), { target: { value: '2025' } })
    expect(comparePicker().value).toBe('2025')
    expect(numbers().textContent).toContain('same as 2025')
    expect(numbers().textContent).toContain('the same as in 2025')
  })

  it('has nothing to compare All time with, and leaves out the goal and the month charts', () => {
    show()
    fireEvent.change(comparePicker(), { target: { value: '2025' } })
    fireEvent.change(yearPicker(), { target: { value: 'all' } })
    expect(comparePicker().disabled).toBe(true)
    expect(numbers().textContent).not.toContain('vs 2025')
    expect(screen.getByRole('heading', { name: 'All time in numbers' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Books per month/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Reading goal/ })).toBeNull()
    // the rest is still there
    expect(screen.getByRole('heading', { name: 'What I read' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Records' })).toBeTruthy()
  })

  it('has nothing to compare with in her first year', () => {
    show([BOOKS[0]])
    expect([...yearPicker().options].map((o) => o.value)).toEqual(['2026', 'all'])
    expect(comparePicker().disabled).toBe(true)
  })

  it('says a year with no books is empty instead of showing a page of zeros', () => {
    show()
    fireEvent.change(yearPicker(), { target: { value: '2025' } })
    fireEvent.change(comparePicker(), { target: { value: '2026' } })
    expect(numbers().textContent).toContain('↓ 1 vs 2026')
    // a year that has nothing at all
    cleanup()
    show([book({ id: 'z', title: 'Z', pages: 100, finished: ['2024-01-01'] })])
    fireEvent.change(yearPicker(), { target: { value: '2026' } })
    expect(numbers().textContent).toContain('Nothing finished in 2026 yet.')
  })

  it('has the charts that moved off the dashboard, and the ▶ Play block', () => {
    show()
    for (const name of [
      '2026: a year of reading',
      'Books per month · 2026',
      'Pages per month',
      'Genre flower',
      'When I read most',
      'What I read',
      'Records',
    ])
      expect(screen.getByRole('heading', { name })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play your 2026 in books' })).toBeTruthy()
    // the page's picker says the year, so the flower has no switch of its own
    expect(screen.queryByRole('group', { name: 'Period' })).toBeNull()
  })

  it('the Year in review block follows the page’s year', () => {
    show()
    fireEvent.change(yearPicker(), { target: { value: '2025' } })
    expect(screen.getByRole('button', { name: 'Play your 2025 in books' })).toBeTruthy()
  })
})
