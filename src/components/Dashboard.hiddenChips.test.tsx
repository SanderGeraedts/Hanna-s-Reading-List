import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DEFAULT_LAYOUT, SECTION_IDS, type BlockId, type DashboardLayout } from '#/lib/dashboardLayout'

// no server: the dashboard signed out, its server functions mocked like the other dashboard tests
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
vi.mock('#/server/favourites', () => ({
  loadFavourites: async () => ({ kept: false }),
  saveFavourites: async () => ({ kept: false }),
}))

const { Dashboard } = await import('./Dashboard')

/**
 * Enter on a Hidden chip restores the block (T-0044, F7): the clicked chip is removed and
 * focus moves to the next chip, or to the restored block's drag handle when no chip is left.
 * Without the fix focus falls to the page body.
 */

const KEY = 'hannas-reading-list:dashboard:local'
const HIDDEN: BlockId[] = ['lent', 'reading', 'pace']

/** A saved layout with these blocks hidden, taken out of their sections as hiding does. */
const withHidden = (hidden: BlockId[]): DashboardLayout => ({
  ...structuredClone(DEFAULT_LAYOUT),
  sections: Object.fromEntries(
    SECTION_IDS.map((s) => [s, DEFAULT_LAYOUT.sections[s].map((col) => col.filter((id) => !hidden.includes(id)))]),
  ) as DashboardLayout['sections'],
  hidden,
})

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(KEY, JSON.stringify(withHidden(HIDDEN)))
})
afterEach(cleanup)

const show = () => render(<Dashboard books={[]} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
const arrange = () => fireEvent.click(screen.getByRole('button', { name: 'Arrange' }))
const chips = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.hidden-blocks [data-hidden]'))

describe('Enter on a Hidden chip keeps focus on the row (T-0044, F7)', () => {
  it('after Enter on a chip, focus moves to the next chip', () => {
    show()
    arrange()
    const first = chips().find((c) => c.dataset.hidden === 'lent')!
    first.focus()
    expect(document.activeElement).toBe(first)
    fireEvent.click(first)
    // 'lent' is gone, the first remaining chip is 'reading'
    const next = chips()
    expect(next.map((c) => c.dataset.hidden)).toEqual(['reading', 'pace'])
    expect(document.activeElement).toBe(next[0])
  })

  it('after Enter on the last chip, focus moves to the restored block\'s handle', () => {
    localStorage.setItem(KEY, JSON.stringify(withHidden(['reading'])))
    show()
    arrange()
    const last = chips()[0]
    expect(last.dataset.hidden).toBe('reading')
    fireEvent.click(last)
    expect(chips()).toHaveLength(0)
    const handle = document.querySelector<HTMLElement>('.dashboard-grid [data-block="reading"] .block-handle')
    expect(handle).toBeTruthy()
    expect(document.activeElement).toBe(handle)
  })
})
