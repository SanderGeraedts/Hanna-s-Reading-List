import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { DEFAULT_LAYOUT } from '#/lib/dashboardLayout'
import { goalKey } from './DashboardExtras'

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

const { Dashboard } = await import('./Dashboard')

/**
 * "My year" on the dashboard (T-0080, D-0060): the one block about her reading
 * left there, and the blocks that moved to the Stats page are gone.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#000', addedAt: 0, readCount: 1, ...b }) as Book

const BOOKS: Book[] = [
  book({ id: 'a', title: 'A', pages: 300, finished: ['2026-03-01'], readingLog: { '2026-03-01': 1 } }),
  book({ id: 'b', title: 'B', minutes: 120, formats: ['storytel'], finished: ['2026-07-04'] }),
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('hannas-reading-list:dashboard:local', JSON.stringify(DEFAULT_LAYOUT))
})
afterEach(cleanup)

const show = (onOpenStats?: () => void) =>
  render(
    <Dashboard books={BOOKS} onShowBook={() => {}} accountId={null} onUpdate={() => {}} onOpenStats={onOpenStats} />,
  )

describe('My year on the dashboard', () => {
  it('shows this year’s books, pages and hours, with Open › to the Stats page', () => {
    const opened = vi.fn()
    show(opened)
    const card = document.querySelector<HTMLElement>('.myyear-card')!
    expect(card.textContent).toContain('My year')
    expect(card.textContent).toContain('2 books')
    expect(card.textContent).toContain('300 pages')
    expect(card.textContent).toContain('listened')
    fireEvent.click(screen.getByRole('button', { name: 'Open My year' }))
    expect(opened).toHaveBeenCalled()
  })

  it('shows the goal ring once a goal is set, and nothing about goals before that', () => {
    show()
    expect(document.querySelector('.myyear-card .goal-ring')).toBeNull()
    // no invitation to set one: that lives on the Challenges page (D-0014)
    expect(document.querySelector('.myyear-card')!.textContent).not.toContain('goal')
    cleanup()
    localStorage.setItem(goalKey(null, 2026), '12')
    show()
    const ring = document.querySelector<SVGElement>('.myyear-card .goal-ring')!
    expect(ring.getAttribute('aria-label')).toBe('2 of 12 books read')
  })

  it('the blocks that moved to the Stats page are not on the dashboard any more', () => {
    show()
    for (const name of ['Books read', 'Reading goal 2026', 'A year of reading', 'Genre flower', 'When I read most', 'What I read', 'Records'])
      expect(screen.queryByRole('heading', { name })).toBeNull()
  })
})
