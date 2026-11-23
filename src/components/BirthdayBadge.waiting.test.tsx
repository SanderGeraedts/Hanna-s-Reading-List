import { act, cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

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
const { BadgeToasts } = await import('./NewBlocks')
const { writeBirthday } = await import('#/lib/birthday')

/**
 * T-0043, D-0039: "Waiting for you" and the badge toast work out the badges with this device's
 * birthday too, so a book finished on it in the last week shows the Birthday book there.
 */

const BIRTHDAY = 'hannas-reading-list:birthday'
const finishedOnBirthday: Book[] = [
  { id: 'b', title: 'Circe', authors: ['M'], color: '#c99a45', status: 'read', addedAt: Date.parse('2026-11-01'), finished: ['2026-11-20'], readCount: 1 },
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('the birthday reaches "Waiting for you" and the toast (T-0043)', () => {
  it('lists Birthday book under "Waiting for you" with a birthday stored, and not without', () => {
    render(<Dashboard books={finishedOnBirthday} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
    expect(screen.queryByText('New badge: Birthday book!')).toBeNull()
    expect(screen.getByText('New badge: First book!')).toBeTruthy()
    // setting it updates the line straight away, without a reload
    act(() => {
      writeBirthday('11-20')
    })
    expect(screen.getByText('New badge: Birthday book!')).toBeTruthy()
    cleanup()
    render(<Dashboard books={finishedOnBirthday} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
    expect(screen.getByText('New badge: Birthday book!')).toBeTruthy()
  })

  it('queues the Birthday book toast once, even after a clear and a new save', () => {
    // this device has shown First book before, so only the new one toasts
    localStorage.setItem('hannas-reading-list:badges-shown:local', JSON.stringify(['books-1']))
    render(<BadgeToasts books={finishedOnBirthday} accountId={null} ready />)
    expect(screen.queryByRole('status')).toBeNull()
    act(() => {
      writeBirthday('11-20')
    })
    const toast = screen.getByRole('status')
    expect(toast.textContent).toContain('Secret badge unlocked!')
    expect(toast.textContent).toContain('Birthday book')
    expect(JSON.parse(localStorage.getItem('hannas-reading-list:badges-shown:local')!)).toContain('birthday')
    expect(localStorage.getItem(BIRTHDAY)).toBe('11-20')
    // dismiss it, clear and save again: no second toast
    act(() => toast.click())
    act(() => {
      writeBirthday(undefined)
    })
    act(() => {
      writeBirthday('11-20')
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
