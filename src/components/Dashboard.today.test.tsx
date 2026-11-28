import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Book } from "#/lib/library"

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
 * The today dashboard (T-0124, D-0093): one Reading today card with the week, the streak and
 * quick steps; cards with nothing to say today hide, and "Hidden today" opens them anyway.
 */

const reading = {
  id: 'babel',
  title: 'Babel',
  authors: ['R. F. Kuang'],
  color: '#333',
  status: 'reading',
  pages: 500,
  progress: 0.2,
  addedAt: new Date(2026, 0, 1).getTime(),
  places: ['England'],
  readingLog: { '2026-11-26': 0.02, '2026-11-25': 0.02 },
} as Book

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-27T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('the today dashboard', () => {
  it('has one Reading today card with this week, the streak, where the book is set and quick steps', () => {
    const onUpdate = vi.fn()
    render(<Dashboard books={[reading]} onShowBook={() => {}} accountId={null} onUpdate={onUpdate} />)
    const card = screen.getByRole('region', { name: 'Reading today' })
    expect(within(card).getByText('🔥 2 days in a row, read today to make it 3')).toBeTruthy()
    expect(within(card).getByText('📍 Set in England')).toBeTruthy()
    expect(within(card).getByRole('button', { name: /This week: read on 2 of 5 days/ })).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Babel: 10 pages on' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, patch] = onUpdate.mock.calls[0]
    expect(id).toBe('babel')
    expect(patch(reading).progress).toBeCloseTo(0.22, 5)
    // the old blocks are gone
    // (What next? can appear inside Pick of the day, as one of its turns)
    for (const name of ['Currently reading', 'Finish by', 'This week', 'Creatures', 'Garden', 'Bookshop'])
      expect(screen.queryByRole('region', { name })).toBeNull()
  })

  it('hides the cards with nothing to say today, and Hidden today opens one anyway', () => {
    render(<Dashboard books={[reading]} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
    const hidden = document.querySelector('.hidden-today')!
    expect(hidden.textContent).toMatch(/Hidden today:/)
    expect(hidden.textContent).toContain('Lent out')
    expect(hidden.textContent).toContain('Added today')
    expect(screen.queryByRole('region', { name: 'Lent out' })).toBeNull()
    fireEvent.click(within(hidden as HTMLElement).getByRole('button', { name: 'Lent out' }))
    expect(screen.getByRole('region', { name: 'Lent out' })).toBeTruthy()
  })

  it('shows Pick of the day while there is room for another book', () => {
    render(<Dashboard books={[reading]} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
    expect(screen.getByRole('region', { name: 'Pick of the day' })).toBeTruthy()
  })
})
